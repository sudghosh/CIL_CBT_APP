from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, desc
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field, validator
from datetime import datetime, date
import random
import logging
import sys
import traceback
from sqlalchemy.exc import IntegrityError

"""
Tests Router - Practice Test Fix Documentation

This file contains important fixes to the Practice Test feature to address issues with 
template creation and test starting. The primary problems were:

1. Mismatch between section_id from the frontend and section_id_ref in the database
2. Inconsistent API formats (legacy direct fields vs modern sections array)
3. Insufficient validation for section_id_ref values

Key fixes implemented:

1. Template Creation:
   - Support both legacy and modern formats
   - Add validation for section_id_ref to verify questions exist
   - Improved error messages and logging

2. Test Starting:
   - Auto-correction of invalid section_id_ref
   - Enhanced question selection logic
   - Detailed error reporting
   
Important note: When creating a test template, section_id from the API is mapped to section_id_ref 
in the database. When starting a test, the section_id_ref is used to find questions.

A separate script (fix_template_section_refs.py) is available to fix existing templates.
"""

from ..database.database import get_db
from ..database.models import ( 
    TestTemplate, TestTemplateSection, TestAttempt, TestAnswer,
    Question, QuestionOption, User, Paper, Section, Subsection,
    UserPerformanceProfile, UserOverallSummary, UserTopicSummary
)
from ..auth.auth import verify_token, verify_admin
from ..utils.error_handler import APIErrorHandler
from ..validation.test_validators import ExamAttemptValidation as TestAttemptValidation, AnswerValidation
from ..tasks.performance_aggregator import performance_aggregation_task

# Configure logging - enable DEBUG level for detailed messages
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["tests"])

TestStatusEnum = Literal["InProgress", "Completed", "Abandoned"]
TestTypeEnum = Literal["Mock", "Practice", "Regular", "Adaptive"]
AdaptiveStrategyEnum = Literal["easy_to_hard", "hard_to_easy", "adaptive", "random"]

class TestAnswerDetail(BaseModel):
    question_id: int
    question_text: str
    options: List[str]
    selected_option_index: Optional[int]
    correct_option_index: Optional[int]
    marks: Optional[float]
    time_taken_seconds: int

    class Config:
        from_attributes = True

class TestAnswerResponse(BaseModel):
    attempt_id: int
    test_type: TestTypeEnum
    status: TestStatusEnum
    start_time: datetime
    end_time: Optional[datetime]
    score: Optional[float]
    weighted_score: Optional[float]
    answers: List[TestAnswerDetail]

    class Config:
        from_attributes = True

class TestTemplateSectionBase(BaseModel):
    paper_id: int = Field(..., gt=0)
    section_id: Optional[int] = Field(None, gt=0)
    subsection_id: Optional[int] = Field(None, gt=0)
    question_count: int = Field(..., gt=0, le=100)

class TestTemplateBase(BaseModel):
    template_name: str = Field(..., min_length=3, max_length=100)
    test_type: TestTypeEnum
    sections: List[TestTemplateSectionBase] = Field(default=[])

class TestTemplateResponse(TestTemplateBase):
    template_id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TestAnswerSubmit(BaseModel):
    question_id: int = Field(..., gt=0)
    selected_option_index: Optional[int] = Field(None, ge=0, lt=4)
    time_taken_seconds: int = Field(..., ge=0, le=3600)  # Max 1 hour per question
    is_marked_for_review: bool = False
    
    @validator('time_taken_seconds')
    def validate_time_taken(cls, v):
        if v < 0:
            raise ValueError('Time taken cannot be negative')
        if v > 3600: # Max 1 hour per question
            raise ValueError('Time taken cannot exceed 1 hour per question')
        return v

class TestAttemptBase(BaseModel):
    test_template_id: int = Field(..., gt=0)
    duration_minutes: int = Field(..., gt=0, le=360)  # Max 6 hours
    is_adaptive: bool = Field(False)  # New field to indicate adaptive test
    adaptive_strategy: Optional[AdaptiveStrategyEnum] = Field(None)  # New field for adaptive strategy
    max_questions: Optional[int] = Field(None, gt=0, le=100)  # Maximum number of questions for adaptive tests

class TestAttemptResponse(BaseModel):
    attempt_id: int
    test_type: TestTypeEnum
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    total_allotted_duration_minutes: int = Field(..., gt=0, le=360)  # Max 6 hours
    status: TestStatusEnum
    score: Optional[float] = Field(None, ge=0, le=100)
    weighted_score: Optional[float] = Field(None, ge=0, le=100)

    class Config:
        from_attributes = True
        
    @validator('score', 'weighted_score')
    def validate_score(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Score must be between 0 and 100')
        return v
@router.post("/templates", response_model=TestTemplateResponse)
async def create_test_template(
    template: TestTemplateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Support both legacy format (direct paper_id, section_id) and new format (sections array)
        # Check if we're receiving direct paper_id as a legacy format
        if hasattr(template, 'paper_id') and getattr(template, 'paper_id', None):
            # Convert legacy format to sections format
            logger.info("Converting legacy format with direct paper_id to sections array format")
            section_id = getattr(template, 'section_id', None)
            subsection_id = getattr(template, 'subsection_id', None) 
            question_count = getattr(template, 'question_count', 10)
            
            # Create a section object
            section = TestTemplateSectionBase(
                paper_id=template.paper_id,
                section_id=section_id,
                subsection_id=subsection_id,
                question_count=question_count
            )
            
            # Add it to the sections array
            template.sections = [section]
        
        # Input validation - check that all sections have valid references
        if not template.sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="At least one section must be provided"
            )
          # Validate that all papers and sections exist
        for i, section in enumerate(template.sections):
            # Debug output
            print(f"Processing section {i}: paper_id={section.paper_id}, section_id={getattr(section, 'section_id', None)}, question_count={section.question_count}")
            
            # Check paper exists
            paper = db.query(Paper).filter(Paper.paper_id == section.paper_id).first()
            if not paper:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Paper with ID {section.paper_id} not found"
                )
            
            # If section_id is provided, check it exists and belongs to the paper
            if section.section_id:
                db_section = db.query(Section).filter(
                    Section.section_id == section.section_id,
                    Section.paper_id == section.paper_id
                ).first()
                
                if not db_section:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Section with ID {section.section_id} not found in paper {section.paper_id}"
                    )
            
            # If subsection_id is provided, check it exists and belongs to the section
            if section.subsection_id:
                if not section.section_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Section ID must be provided when specifying subsection ID"
                    )
                
                db_subsection = db.query(Subsection).filter(
                    Subsection.subsection_id == section.subsection_id,
                    Subsection.section_id == section.section_id
                ).first()
                
                if not db_subsection:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Subsection with ID {section.subsection_id} not found in section {section.section_id}"
                    )
            
            # Check for duplicate sections
            for j, other_section in enumerate(template.sections):
                if i != j and section.paper_id == other_section.paper_id and section.section_id == other_section.section_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Duplicate section found: paper_id={section.paper_id}, section_id={section.section_id}"
                    )
                    
        # Create template
        db_template = TestTemplate(
            template_name=template.template_name,
            test_type=template.test_type,
            created_by_user_id=current_user.user_id
        )
        db.add(db_template)
        db.flush() # Use flush to get the template_id before committing
        
        # Add sections
        for section in template.sections:
            section_id_value = getattr(section, 'section_id', None)
            
            # CRITICAL FIX: Double check that we're using the right section_id that matches questions in the database
            # First verify if the provided section_id exists in the paper
            db_section = None
            if section_id_value:
                db_section = db.query(Section).filter(
                    Section.paper_id == section.paper_id,
                    Section.section_id == section_id_value
                ).first()
                
                if not db_section:
                    logger.warning(f"Section with ID {section_id_value} not found in paper {section.paper_id}")
                    section_id_value = None
            
            # Now check if questions exist for this paper-section combination
            if section_id_value:
                question_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section_id_value,
                    Question.valid_until >= date.today()  # Add this to check for valid questions only
                ).count()
                
                logger.info(f"Found {question_count} VALID questions for paper_id={section.paper_id}, section_id={section_id_value}")
                
                # If no valid questions found with this section_id, try to find a valid one
                if question_count == 0:
                    logger.warning(f"No VALID questions found for paper_id={section.paper_id}, section_id={section_id_value}")
                    
                    # Find sections with valid questions for this paper
                    valid_sections = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                        .filter(
                            Question.paper_id == section.paper_id,
                            Question.valid_until >= date.today()  # Add this to check for valid questions only
                        )\
                        .group_by(Question.section_id)\
                        .order_by(desc('count'))\
                        .all()
                    
                    if valid_sections:
                        old_section_id = section_id_value
                        section_id_value = valid_sections[0][0]
                        logger.info(f"Automatically corrected section_id from {old_section_id} to {section_id_value} which has {valid_sections[0][1]} valid questions")
                    else:
                        # Try again without the valid_until filter to see if there are any questions at all
                        all_sections = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                            .filter(Question.paper_id == section.paper_id)\
                            .group_by(Question.section_id)\
                            .order_by(desc('count'))\
                            .all()
                            
                        if all_sections:
                            old_section_id = section_id_value
                            section_id_value = all_sections[0][0]
                            logger.warning(f"Found section {section_id_value} with {all_sections[0][1]} questions, but they are all expired (valid_until < today)")
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Paper ID {section.paper_id}, section ID {old_section_id} has questions, but they have all expired. Please contact an administrator to extend their validity."
                            )
                        else:
                            logger.error(f"No sections with any questions found for paper_id={section.paper_id}")
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"No questions found for paper ID {section.paper_id}. Please check the paper and section IDs."
                            )
            else:
                logger.warning(f"No section_id provided for paper_id={section.paper_id}")
                # Try to find a valid section_id with questions
                valid_sections = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                    .filter(
                        Question.paper_id == section.paper_id,
                        Question.valid_until >= date.today()  # Add this to check for valid questions only
                    )\
                    .group_by(Question.section_id)\
                    .order_by(desc('count'))\
                    .all()
                
                if valid_sections:
                    section_id_value = valid_sections[0][0]
                    logger.info(f"Using section_id={section_id_value} which has {valid_sections[0][1]} valid questions")
                else:
                    # Check if there are any questions at all without the valid_until filter
                    all_sections = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                        .filter(Question.paper_id == section.paper_id)\
                        .group_by(Question.section_id)\
                        .order_by(desc('count'))\
                        .all()
                        
                    if all_sections:
                        logger.warning(f"Paper ID {section.paper_id} has questions in section {all_sections[0][0]}, but they are all expired")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Paper ID {section.paper_id} has questions, but they have all expired. Please contact an administrator to extend their validity."
                        )
                    else:
                        logger.error(f"No valid sections with questions found for paper_id={section.paper_id}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"No questions found for paper ID {section.paper_id}. Please add questions first."
                        )
                        
            # Create the db_section regardless of which path was taken above
            try:
                print(f"DEBUG: Creating TestTemplateSection with paper_id={section.paper_id}, section_id_value={section_id_value}")
                logger.debug(f"Creating TestTemplateSection with paper_id={section.paper_id}, section_id_value={section_id_value}")
                
                # Double verify the section_id_ref is a valid ID that exists in the sections table
                if section_id_value:
                    section_exists = db.query(Section).filter(Section.section_id == section_id_value).first()
                    if not section_exists:
                        logger.error(f"Cannot use section_id_ref={section_id_value} because it doesn't exist in sections table")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST, 
                            detail=f"Invalid section ID {section_id_value}"
                        )
                
                db_section = TestTemplateSection(
                    template_id=db_template.template_id,
                    paper_id=section.paper_id,
                    section_id_ref=section_id_value,  # Map section_id from API to section_id_ref in DB
                    subsection_id=getattr(section, 'subsection_id', None),
                    question_count=section.question_count
                )
                
                # Verify one final time that there are questions available for this configuration
                if section_id_value:
                    available_questions = db.query(Question).filter(
                        Question.paper_id == section.paper_id,
                        Question.section_id == section_id_value,
                        Question.valid_until >= date.today()
                    ).count()
                    
                    logger.info(f"Verified section_id_ref={section_id_value} has {available_questions} valid questions")
                    
                    if available_questions < section.question_count:
                        logger.warning(f"Section {section_id_value} has only {available_questions} questions, but {section.question_count} were requested")
                        # We'll still create it, but log a warning
                
                print(f"DEBUG: TestTemplateSection object created: {db_section}")
                logger.debug(f"TestTemplateSection object created: {db_section}")
                
                db.add(db_section)
                print(f"DEBUG: Added TestTemplateSection to session")
                logger.debug(f"Added TestTemplateSection to session")
                
            except HTTPException:
                raise  # Re-raise HTTP exceptions
            except Exception as e:
                print(f"ERROR creating TestTemplateSection: {e}")
                logger.error(f"Error creating TestTemplateSection: {e}")
                raise
        
        db.commit()
        db.refresh(db_template)
        return db_template
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error creating test template: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid data provided. Please check section and paper IDs."
        )
    except HTTPException as e:
        # Pass through HTTPExceptions we've raised
        db.rollback()
        logger.error(f"Validation error creating test template: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating test template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create test template"
        )

@router.post("/start", response_model=TestAttemptResponse)
async def start_test(
    attempt: TestAttemptBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get template with sections in a single query
        template = db.query(TestTemplate).options(
            joinedload(TestTemplate.sections)
        ).filter(
            TestTemplate.template_id == attempt.test_template_id
        ).first()
            
        # Debug - Print template and section details
        print(f"STARTING TEST: Template ID={attempt.test_template_id}")
        import random
        
        if template:
            print(f"Found template: {template.template_name} with {len(template.sections)} sections")
            
            # Print directly to stdout since logger might be redirected
            import sys
            sys.stdout.flush()
            
            # Fix section_id_ref issues if needed
            for idx, sec in enumerate(template.sections):
                # Check if section_id_ref is valid by looking for questions
                question_count = db.query(Question).filter(
                    Question.paper_id == sec.paper_id,
                    Question.section_id == sec.section_id_ref
                ).count()
                
                print(f"Section {idx+1}: paper_id={sec.paper_id}, section_id_ref={sec.section_id_ref}, questions_found={question_count}")
                sys.stdout.flush()
                
                # Important: If section_id_ref doesn't match any questions, try to fix it
                if question_count == 0:
                    # Try to find questions with this paper_id and any section_id
                    available_questions = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                        .filter(Question.paper_id == sec.paper_id)\
                        .group_by(Question.section_id)\
                        .order_by(desc('count'))\
                        .first()
                    
                    if available_questions:
                        correct_section_id = available_questions[0]
                        print(f"WARNING: Fixed incorrect section_id_ref! Old={sec.section_id_ref}, New={correct_section_id}")
                        sec.section_id_ref = correct_section_id
                        db.add(sec)
                        db.commit()
                        db.refresh(sec)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test template not found"
            )
            
        # Get required number of questions efficiently using subquery
        questions = []
        from datetime import date
        
        # Log template sections before processing
        logger.info(f"Template has {len(template.sections)} sections")
        print(f"Template has {len(template.sections)} sections")
        
        # Debug output - print the raw template object
        print(f"Template ID: {template.template_id}, Name: {template.template_name}")
        
        for idx, sec in enumerate(template.sections):
            print(f"Template section {idx+1}: paper_id={sec.paper_id}, section_id_ref={sec.section_id_ref}, subsection_id={sec.subsection_id}, question_count={sec.question_count}")
            
            # Check section_id_ref vs section.section_id if there's confusion
            if hasattr(sec, 'section_id') and sec.section_id != sec.section_id_ref:
                print(f"WARNING: Mismatch - section_id={sec.section_id}, section_id_ref={sec.section_id_ref}")
                
            # CRITICAL: Get the section's section_id_ref from the database to ensure we have the right value
            try:
                # Refresh section data from DB to ensure we have the right section_id_ref
                db.refresh(sec)
            except Exception as e:
                print(f"Failed to refresh section {sec.section_id} from database: {e}")
            
        questions = []
        for section in template.sections:
            # Query for valid questions for this section (valid_until >= today)
            # Note: section.section_id_ref contains the section_id value
            logger.info(f"Processing section with paper_id={section.paper_id}, section_id_ref={section.section_id_ref}")
            print(f"Processing section with paper_id={section.paper_id}, section_id_ref={section.section_id_ref}")
            
            # Build query with explicit filters for debugging
            query = db.query(Question).filter(Question.paper_id == section.paper_id)
              # Try to find questions using section_id_ref first
            if section.section_id_ref:
                print(f"Trying to filter on Question.section_id = {section.section_id_ref}")
                
                # First check if this section_id_ref exists in the sections table
                # Use section.section_id_ref instead of bare section_id_ref to avoid NameError
                section_exists = db.query(Section).filter(
                    Section.section_id == section.section_id_ref,
                    Section.paper_id == section.paper_id
                ).first()
                
                if not section_exists:
                    print(f"WARNING: section_id_ref={section.section_id_ref} doesn't exist in sections table for paper_id={section.paper_id}")
                    # We'll try to fix it below
                
                # Check if we can find any VALID questions with this section_id_ref
                section_questions_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section.section_id_ref,
                    Question.valid_until >= date.today()  # Only count valid questions
                ).count()
                print(f"Found {section_questions_count} VALID questions matching paper_id={section.paper_id}, section_id={section.section_id_ref}")
                
                # Also check total questions without the validity filter for diagnostics
                all_questions_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section.section_id_ref
                ).count()
                
                if all_questions_count > section_questions_count:
                    print(f"NOTE: There are {all_questions_count - section_questions_count} EXPIRED questions in this section")
                
                if section_questions_count > 0:
                    # Use the section_id_ref field for filtering
                    query = query.filter(Question.section_id == section.section_id_ref)
                else:
                    # CRITICAL FIX: If no questions found with section_id_ref, try finding questions with this paper_id
                    print("No VALID questions found with section_id_ref, searching for other valid section_id...")
                    
                    # Find a section_id where VALID questions exist for this paper
                    valid_section_query = db.query(Question.section_id, func.count(Question.question_id).label('count')).filter(
                        Question.paper_id == section.paper_id,
                        Question.valid_until >= date.today()
                    ).group_by(Question.section_id).order_by(desc('count'))
                    
                    valid_sections = valid_section_query.all()
                    
                    if valid_sections:
                        valid_section_ids = [row[0] for row in valid_sections]
                        valid_section_counts = [row[1] for row in valid_sections]
                        
                        print(f"Found valid section_ids with counts: {list(zip(valid_section_ids, valid_section_counts))}")
                        
                        # Use the section with the most valid questions
                        correct_section_id = valid_sections[0][0]
                        correct_section_count = valid_sections[0][1]
                        
                        print(f"FIXING: Using section_id={correct_section_id} with {correct_section_count} valid questions instead of {section.section_id_ref}")
                        
                        # Update the section.section_id_ref in the database for future test attempts
                        old_section_id = section.section_id_ref
                        section.section_id_ref = correct_section_id
                        db.add(section)
                        db.commit()
                        db.refresh(section)
                        
                        logger.info(f"Updated TestTemplateSection - changed section_id_ref from {old_section_id} to {correct_section_id}")
                        
                        # Use the corrected section_id for filtering
                        query = query.filter(Question.section_id == correct_section_id)
                    else:
                        # Check for ANY questions (even expired ones)
                        all_section_query = db.query(Question.section_id, func.count(Question.question_id).label('count')).filter(
                            Question.paper_id == section.paper_id
                        ).group_by(Question.section_id).order_by(desc('count'))
                        
                        all_sections = all_section_query.all()
                        
                        if all_sections:
                            print(f"WARNING: Found sections with questions, but they are all expired: {all_sections}")
                            logger.warning(f"Found sections with questions, but they are all expired: {all_sections}")
                        else:
                            print(f"WARNING: No valid sections found for paper_id={section.paper_id}")
                            logger.warning(f"No valid sections found for paper_id={section.paper_id}")
            else:
                print("WARNING: section_id_ref is None - not filtering by section!")
                
            if section.subsection_id:
                print(f"Filtering on Question.subsection_id = {section.subsection_id}")
                query = query.filter(Question.subsection_id == section.subsection_id)
                
            # Check for questions without validity filter first (for debugging)
            unfiltered_count = query.count()
            print(f"Found {unfiltered_count} questions before applying valid_until filter")
            
            # Apply the valid_until filter
            query = query.filter(Question.valid_until >= date.today())
            
            # Get question count before limit for debugging
            total_available = query.count()
            logger.info(f"Total available questions before limit: {total_available}")
            
            # Apply random order and limit
            section_questions = query.order_by(func.random()).limit(section.question_count).all()
            
            # Log results for diagnostic purposes
            logger.info(f"Found {len(section_questions)} questions for paper_id={section.paper_id}, "
                       f"section_id={section.section_id_ref}, subsection_id={section.subsection_id}")

            questions.extend(section_questions)
            
        # Log the summary of questions found
        logger.info(f"Total questions found across all sections: {len(questions)}")
        
        # Get total questions required from all sections
        total_questions_required = sum(section.question_count for section in template.sections)
        logger.info(f"Total questions required: {total_questions_required}")
        
        # Check if we have enough questions and provide detailed error if not
        if not questions:
            logger.error("No valid questions found for any of the requested sections")
            
            # Check if we have questions that aren't active
            inactive_questions_exist = False
            for section in template.sections:
                # Query count of questions WITHOUT the valid_until filter
                unfiltered_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section.section_id_ref
                ).count()
                
                if unfiltered_count > 0:
                    inactive_questions_exist = True
                    logger.error(f"Found {unfiltered_count} questions for section {section.section_id_ref} but they are not active (valid_until < today)")
            
            # Provide more specific error message
            if inactive_questions_exist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Questions exist but are not currently active. Please contact an administrator to activate questions."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active questions available for the selected sections"
                )
        elif len(questions) < total_questions_required:
            logger.error(f"Not enough questions: found {len(questions)}, need {total_questions_required}")
            
            # Create a more detailed error message
            section_details = []
            for section in template.sections:
                # Log section details for debugging
                logger.info(f"Checking questions for section_id_ref={section.section_id_ref}")
                
                # Count questions for this section
                section_count = sum(1 for q in questions if q.section_id == section.section_id_ref and 
                                q.paper_id == section.paper_id)
                
                # Log match results
                logger.info(f"Found {section_count} questions matching section_id_ref={section.section_id_ref}")
                print(f"Found {section_count} questions matching section_id={section.section_id_ref} (out of {len(questions)} total)")
                
                # Add to error details
                section_details.append(f"Section {section.section_id_ref}: Found {section_count}/{section.question_count}")
            
            detail_message = "Not enough active questions available for the test. " + ", ".join(section_details)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail_message
            )
              # Create test attempt with transaction
        db_attempt = TestAttempt(
            test_template_id=template.template_id,
            user_id=current_user.user_id,
            duration_minutes=attempt.duration_minutes,
            status="InProgress",
            start_time=datetime.utcnow(),
            test_type=template.test_type,  # Add test_type from template
            total_allotted_duration_minutes=attempt.duration_minutes,  # Set total_allotted_duration_minutes
            current_question_index=0  # Initialize the question index
        )
          # Add max_questions field for the test attempt
        # First check if it's directly provided in the request
        if hasattr(attempt, 'max_questions') and attempt.max_questions is not None:
            try:
                db_attempt.max_questions = attempt.max_questions
                logger.info(f"Setting max_questions={attempt.max_questions} for test from request parameter")
            except Exception as e:
                logger.warning(f"Failed to set max_questions from request: {e}. Will fall back to template.")
        # If not provided but is an adaptive test, use the total questions from sections as max_questions
        elif attempt.is_adaptive:
            try:
                total_questions = sum(section.question_count for section in template.sections)
                db_attempt.max_questions = total_questions
                logger.info(f"Setting max_questions={total_questions} for adaptive test from template sections")
            except Exception as e:
                logger.warning(f"Failed to set max_questions for adaptive test: {e}")
                
        # Log the max_questions value that was set
        logger.info(f"Final max_questions value for this test: {db_attempt.max_questions}")
        
        # Handle adaptive test if requested
        if attempt.is_adaptive:
            # Choose adaptive strategy if not specified
            if attempt.adaptive_strategy:
                db_attempt.adaptive_strategy_chosen = attempt.adaptive_strategy
            else:
                # Randomly choose between hard_to_easy or easy_to_hard
                db_attempt.adaptive_strategy_chosen = random.choice(['hard_to_easy', 'easy_to_hard'])
                
            logger.info(f"Starting adaptive test with strategy: {db_attempt.adaptive_strategy_chosen}")
                
            # For adaptive tests, if we have enough questions with different difficulty levels,
            # we might want to pre-filter questions to ensure we have enough for each difficulty
            difficulty_counts = {
                "Easy": sum(1 for q in questions if q.difficulty_level == "Easy"),
                "Medium": sum(1 for q in questions if q.difficulty_level == "Medium"),
                "Hard": sum(1 for q in questions if q.difficulty_level == "Hard")
            }
            
            logger.info(f"Questions by difficulty: Easy={difficulty_counts['Easy']}, "
                      f"Medium={difficulty_counts['Medium']}, Hard={difficulty_counts['Hard']}")
            
            # If any difficulty level has zero questions, assign at least some default difficulty
            if any(count == 0 for count in difficulty_counts.values()):
                # Assign some questions with default difficulty if needed
                questions_with_missing_difficulty = [q for q in questions if q.difficulty_level is None]
                difficulties = ["Easy", "Medium", "Hard"]
                for i, question in enumerate(questions_with_missing_difficulty):
                    question.difficulty_level = difficulties[i % 3]
                
                # Update difficulty counts
                difficulty_counts = {
                    "Easy": sum(1 for q in questions if q.difficulty_level == "Easy"),
                    "Medium": sum(1 for q in questions if q.difficulty_level == "Medium"),
                    "Hard": sum(1 for q in questions if q.difficulty_level == "Hard")
                }
                
                logger.info(f"Updated questions by difficulty: Easy={difficulty_counts['Easy']}, "
                          f"Medium={difficulty_counts['Medium']}, Hard={difficulty_counts['Hard']}")
                
        db.add(db_attempt)
        db.flush()

        # Add all answers in bulk
        answers = [
            TestAnswer(
                attempt_id=db_attempt.attempt_id,
                question_id=q.question_id,
                time_taken_seconds=0
            ) for q in questions
        ]
        db.bulk_save_objects(answers)
        db.commit()
        
        # Make sure all required fields are in the response model
        db.refresh(db_attempt)
        
        # Log the key fields for debugging
        logger.info(f"Test attempt created: id={db_attempt.attempt_id}, test_type={db_attempt.test_type}, total_allotted_duration_minutes={db_attempt.total_allotted_duration_minutes}")
        print(f"DEBUG: Test attempt created with fields: test_type={db_attempt.test_type}, total_allotted_duration_minutes={db_attempt.total_allotted_duration_minutes}")

        return db_attempt
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error when starting test: {str(e)}")
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error trace: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred when starting the test."
        )

@router.post("/submit/{attempt_id}/answer")
async def submit_answer(
    attempt_id: int, 
    answer: TestAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get the attempt
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test attempt not found"
            )
        
        if attempt.status != "InProgress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit answers for completed or abandoned tests"
            )
        
        # Get the question
        question = db.query(Question).filter(Question.question_id == answer.question_id).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Check if this answer already exists
        existing_answer = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id,
            TestAnswer.question_id == answer.question_id
        ).first()
        
        if existing_answer:
            # Update existing answer
            existing_answer.selected_option_index = answer.selected_option_index
            existing_answer.time_taken_seconds = answer.time_taken_seconds
            existing_answer.is_marked_for_review = answer.is_marked_for_review
            db.add(existing_answer)
        else:
            # Record answer
            db_answer = TestAnswer(
                attempt_id=attempt_id,
                question_id=answer.question_id,
                selected_option_index=answer.selected_option_index,
                time_taken_seconds=answer.time_taken_seconds,
                is_marked_for_review=answer.is_marked_for_review
            )
            db.add(db_answer)
        
        db.commit()
        return {"status": "success"}
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit answer"
        )
@router.post("/finish/{attempt_id}")
async def finish_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token),
    background_tasks: BackgroundTasks = None
):
    try:
        # Get the attempt
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test attempt not found"
            )
        
        if attempt.status != "InProgress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Test is already completed or abandoned"
            )
        
        # Mark the attempt as completed
        attempt.status = "Completed"
        attempt.end_time = datetime.utcnow()
        
        # Calculate score
        answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
        questions = db.query(Question).filter(
            Question.question_id.in_([a.question_id for a in answers])
        ).all()
        
        questions_dict = {q.question_id: q for q in questions}
        
        # Count correct answers
        correct_answers = 0
        total_questions = len(answers)
        
        for answer in answers:
            question = questions_dict.get(answer.question_id)
            if question and answer.selected_option_index is not None:
                if answer.selected_option_index == question.correct_option_index:
                    correct_answers += 1
                    answer.is_correct = True
                else:
                    answer.is_correct = False
        
        # Calculate score as percentage
        score = 0
        if total_questions > 0:
            score = (correct_answers / total_questions) * 100
        
        attempt.score = score
        attempt.weighted_score = score  # For now, no weighting
        
        db.commit()
        
        # Schedule performance aggregation in the background
        if background_tasks:
            background_tasks.add_task(
                performance_aggregation_task,
                attempt_id,
                current_user.user_id
            )
        
        return attempt
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error finishing test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finish test"
        )
@router.get("/templates", response_model=List[TestTemplateResponse])
async def get_templates(db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    try:
        templates = db.query(TestTemplate).filter(TestTemplate.created_by_user_id == current_user.user_id).all()
        return templates
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve templates")
        
@router.get("/attempts", response_model=List[TestAttemptResponse])
async def get_attempts(db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    try:
        attempts = db.query(TestAttempt).filter(TestAttempt.user_id == current_user.user_id).all()
        return attempts
    except Exception as e:
        logger.error(f"Error getting attempts: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve attempts")
@router.get("/questions/{attempt_id}")
async def get_questions(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get the attempt
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test attempt not found"
            )
        
        # Get the answers for this attempt
        answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
        
        # Get all questions for the answers
        question_ids = [answer.question_id for answer in answers]
        questions = db.query(Question).filter(Question.question_id.in_(question_ids)).all()
        
        # Create a mapping for easy lookup
        questions_dict = {q.question_id: q for q in questions}        # Combine questions and answers
        result = []
        for answer in answers:
            question = questions_dict.get(answer.question_id)
            if question:
                # Get options from the options relationship
                # This correctly retrieves the actual option text from the QuestionOption model
                options_query = db.query(QuestionOption).filter(
                    QuestionOption.question_id == question.question_id
                ).order_by(QuestionOption.option_order).all()
                
                options = []
                if options_query:
                    # Use actual option text from database
                    options = [option.option_text for option in options_query]
                else:
                    # Fallback for backward compatibility
                    for i in range(1, 5):
                        option_text_attr = f"option_{i}_text"
                        option_attr = f"option_{i}"
                        
                        if hasattr(question, option_text_attr) and getattr(question, option_text_attr):
                            options.append(getattr(question, option_text_attr))
                        elif hasattr(question, option_attr) and getattr(question, option_attr):
                            options.append(getattr(question, option_attr))
                        else:
                            # Default empty option to maintain consistent length
                            options.append("")
                
                result.append({
                    "question_id": question.question_id,
                    "question_text": question.question_text,
                    "options": options,
                    "selected_option_index": answer.selected_option_index,
                    "is_marked_for_review": answer.is_marked_for_review,
                    "time_taken_seconds": answer.time_taken_seconds
                })
        
        return result  # Return the processed results, not the raw questions
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve test questions"
        )

@router.get("/attempts/{attempt_id}/details", response_model=TestAnswerResponse)
async def get_attempt_details(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Get the attempt
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test attempt not found"
            )
        
        # Get answers for this attempt
        answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
        
        # Get questions for these answers
        question_ids = [a.question_id for a in answers]
        questions = db.query(Question).filter(Question.question_id.in_(question_ids)).all()
        
        # Map questions by ID for easy lookup
        questions_by_id = {q.question_id: q for q in questions}
          # Create answer details
        answer_details = []
        for answer in answers:
            question = questions_by_id.get(answer.question_id)
            if question:
                # Get options from the options relationship
                options_query = db.query(QuestionOption).filter(
                    QuestionOption.question_id == question.question_id
                ).order_by(QuestionOption.option_order).all()
                
                options = []
                if options_query:
                    # Use actual option text from database
                    options = [option.option_text for option in options_query]
                else:
                    # Fallback for backward compatibility - this will likely use default "Option X"
                    options = ["Option 1", "Option 2", "Option 3", "Option 4"]
                    
                    # Try to get options from legacy fields if they exist
                    if hasattr(question, 'option_1_text'):
                        options = [
                            question.option_1_text or "Option 1", 
                            question.option_2_text or "Option 2",
                            question.option_3_text or "Option 3",
                            question.option_4_text or "Option 4"
                        ]
                
                detail = TestAnswerDetail(
                    question_id=question.question_id,
                    question_text=question.question_text,
                    options=options,
                    selected_option_index=answer.selected_option_index,
                    correct_option_index=question.correct_option_index if attempt.status == "Completed" else None,
                    marks=1.0 if answer.selected_option_index == question.correct_option_index else 0.0 if answer.selected_option_index is not None else None,
                    time_taken_seconds=answer.time_taken_seconds
                )
                answer_details.append(detail)
        
        # Create response
        response = TestAnswerResponse(
            attempt_id=attempt.attempt_id,
            test_type=attempt.test_type,
            status=attempt.status,
            start_time=attempt.start_time,
            end_time=attempt.end_time,
            score=attempt.score,
            weighted_score=attempt.weighted_score,
            answers=answer_details
        )
        
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting attempt details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve attempt details"
        )

@router.post("/{attempt_id}/next_question")
async def get_next_adaptive_question(
    attempt_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    try:
        # Ensure we have proper imports for error handling
        import sys
        import traceback
        
        # Log start of request processing
        logger.info(f"Processing next_question request for attempt_id={attempt_id}")
        # Parse the request body
        body = await request.json()
        question_id = body.get("question_id")
        selected_option_id = body.get("selected_option_id")
        time_taken_seconds = body.get("time_taken_seconds", 0)
        
        # Validate selected_option_id early to prevent downstream issues
        if selected_option_id is not None:
            try:
                selected_option_id = int(selected_option_id)  # Ensure it's an integer
                if selected_option_id < 0 or selected_option_id > 3:
                    logger.warning(f"Invalid option index: {selected_option_id} (must be 0-3). Setting to None.")
                    selected_option_id = None
            except (ValueError, TypeError):
                logger.warning(f"Non-integer option index: {selected_option_id}. Setting to None.")
                selected_option_id = None
        
        logger.info(f"Adaptive next question for attempt={attempt_id}, question_id={question_id}, selected_option={selected_option_id}")
        
        # Get the attempt
        attempt = db.query(TestAttempt).filter(
            TestAttempt.attempt_id == attempt_id,
            TestAttempt.user_id == current_user.user_id
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test attempt not found"
            )
        
        if attempt.status != "InProgress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Test is not in progress"
            )
        
        # If question_id and selected_option_id are provided, save the answer first
        if question_id is not None and selected_option_id is not None:
            existing_answer = db.query(TestAnswer).filter(
                TestAnswer.attempt_id == attempt_id,
                TestAnswer.question_id == question_id
            ).first()
            
            if existing_answer:
                existing_answer.selected_option_index = selected_option_id
                existing_answer.time_taken_seconds = time_taken_seconds
                db.add(existing_answer)
            else:
                # Create new answer
                new_answer = TestAnswer(
                    attempt_id=attempt_id,
                    question_id=question_id,
                    selected_option_index=selected_option_id,
                    time_taken_seconds=time_taken_seconds
                )
                db.add(new_answer)
                
            db.commit()
          # Get total questions answered so far
        questions_answered = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id,
            TestAnswer.selected_option_index.isnot(None)
        ).count()
        
        logger.info(f"Questions answered so far: {questions_answered}")
        logger.info(f"Current test attempt ID: {attempt_id}, status: {attempt.status}")
        
        # Check if we've reached the max questions limit
        # First check if max_questions was provided in the request when starting the test
        template = db.query(TestTemplate).filter(TestTemplate.template_id == attempt.test_template_id).first()
        sections = db.query(TestTemplateSection).filter(TestTemplateSection.template_id == template.template_id).all()
          # Get default max_questions from template sections
        default_max_questions = sum(section.question_count for section in sections)
        
        # Check if max_questions is directly available in the attempt model
        max_questions = None
        
        # First check if there's a direct attribute
        if hasattr(attempt, "max_questions") and attempt.max_questions is not None:
            max_questions = attempt.max_questions
            logger.info(f"Using max_questions directly from attempt model: {max_questions}")
        else:
            # Then check if it's in __dict__
            max_questions_dict = attempt.__dict__.get('max_questions')
            if max_questions_dict is not None:
                max_questions = max_questions_dict
                logger.info(f"Found max_questions in __dict__: {max_questions}")
            else:
                # Fall back to the default from template sections
                max_questions = default_max_questions
                logger.info(f"Using default max_questions from sections: {max_questions}")
                
        # Ensure max_questions is at least 1
        if not max_questions or max_questions < 1:
            max_questions = 1
            logger.warning(f"Invalid max_questions value detected. Setting to minimum value: {max_questions}")
        
        logger.info(f"ADAPTIVE TEST CHECK: Max questions: {max_questions}, Answered so far: {questions_answered}")
          # If we've reached the limit, automatically complete the test
        # Double-check questions_answered count to ensure accuracy
        actual_question_count = db.query(TestAnswer).filter(
            TestAnswer.attempt_id == attempt_id,
            TestAnswer.selected_option_index.isnot(None)
        ).count()
        
        logger.info(f"Verified question count: {actual_question_count} vs tracked count: {questions_answered}")
        
        # Use the higher of the two counts to be safe
        questions_answered = max(questions_answered, actual_question_count)
        
        # Make strict comparison to ensure we stop at exactly max_questions
        if questions_answered >= max_questions:
            logger.info(f"ADAPTIVE TEST COMPLETE: Reached max questions limit ({questions_answered}/{max_questions}). Automatically completing the test.")
            
            # Complete the test
            attempt.status = "Completed"
            attempt.end_time = datetime.utcnow()
            
            # Calculate score
            answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
            correct_answers = 0
            total_answers = 0
            
            for answer in answers:
                if answer.selected_option_index is not None:
                    total_answers += 1
                    question = db.query(Question).filter(Question.question_id == answer.question_id).first()
                    if question and answer.selected_option_index == question.correct_option_index:
                        correct_answers += 1
            
            # Only calculate score if there are answers
            if total_answers > 0:
                attempt.score = (correct_answers / total_answers) * 100
            else:
                attempt.score = 0
            
            db.add(attempt)
            db.commit()
            
            # Return a clear message that the test is complete
            return {
                "status": "complete",
                "message": "Maximum number of questions reached. Test automatically completed.",
                "next_question": None,
                "questions_answered": questions_answered,
                "max_questions": max_questions,
                "progress_percentage": 100
            }
              # Select next question based on answer correctness and adaptive strategy
        # Initialize was_correct with a default value to prevent scope issues
        was_correct = None
        
        if question_id is not None and selected_option_id is not None:
            # Get the current question to check correctness
            current_question = db.query(Question).filter(Question.question_id == question_id).first()
            
            # Check if selected option is valid and determine if answer was correct
            was_correct = False  # Default to False for answered questions
            
            if current_question and selected_option_id is not None:
                if not isinstance(selected_option_id, int) or selected_option_id < 0 or selected_option_id > 3:
                    logger.warning(f"Selected option index ({selected_option_id}) is out of range (0-3) or not an integer. Treating as incorrect.")
                    was_correct = False
                elif current_question.correct_option_index == selected_option_id:
                    was_correct = True
            
            logger.info(f"Last answer was correct: {was_correct}")
        else:
            # First question, no previous correctness to check
            logger.info("No previous answer to check")
        
        # Get answers already given to avoid repeating questions
        answered_question_ids = [
            a.question_id for a in db.query(TestAnswer).filter(
                TestAnswer.attempt_id == attempt_id,
                TestAnswer.selected_option_index.isnot(None)
            ).all()
        ]
          # Build query for potential next questions (excluding already answered)
        potential_questions = db.query(Question).filter(
            Question.question_id.notin_(answered_question_ids)
        )
        
        # Apply adaptive strategy if defined
        adaptive_strategy = attempt.adaptive_strategy_chosen
        difficulty_level = None
        
        if adaptive_strategy and question_id is not None:
            if adaptive_strategy == "adaptive":
                # True adaptive: harder if correct, easier if wrong
                if was_correct:
                    # Move to harder difficulty
                    if current_question.difficulty_level == "Easy":
                        difficulty_level = "Medium"
                    elif current_question.difficulty_level == "Medium":
                        difficulty_level = "Hard"
                    else:
                        difficulty_level = "Hard"
                else:
                    # Move to easier difficulty
                    if current_question.difficulty_level == "Hard":
                        difficulty_level = "Medium"
                    elif current_question.difficulty_level == "Medium":
                        difficulty_level = "Easy"
                    else:
                        difficulty_level = "Easy"
            elif adaptive_strategy == "easy_to_hard":
                # Progressive difficulty
                if questions_answered < max_questions * 0.33:
                    difficulty_level = "Easy"
                elif questions_answered < max_questions * 0.66:
                    difficulty_level = "Medium"
                else:
                    difficulty_level = "Hard"
            elif adaptive_strategy == "hard_to_easy":
                # Regressive difficulty
                if questions_answered < max_questions * 0.33:
                    difficulty_level = "Hard"
                elif questions_answered < max_questions * 0.66:
                    difficulty_level = "Medium"
                else:
                    difficulty_level = "Easy"
        
        # Filter by difficulty if specified
        if difficulty_level:
            logger.info(f"Applying difficulty filter: {difficulty_level}")
            potential_questions = potential_questions.filter(Question.difficulty_level == difficulty_level)
        
        # Get all matching questions
        matching_questions = potential_questions.all()
          # If no questions with the ideal difficulty, fall back to any unanswered question
        if not matching_questions:
            logger.info("No questions match the ideal difficulty, falling back to any unanswered question")
            matching_questions = db.query(Question).filter(
                Question.question_id.notin_(answered_question_ids)
            ).all()
        
        if not matching_questions:
            # No more questions available
            logger.info("No more questions available, test is complete")
            return {
                "status": "complete",
                "message": "No more questions available",
                "next_question": None
            }
          # Select a random question from the matching ones
        next_question_id = random.choice(matching_questions).question_id
        
        # Get the question with options eagerly loaded
        next_question = db.query(Question).options(
            joinedload(Question.options)
        ).filter(
            Question.question_id == next_question_id
        ).first()
        
        logger.info(f"Selected next question: id={next_question.question_id}, difficulty={next_question.difficulty_level}, option count={len(next_question.options) if hasattr(next_question, 'options') else 0}")
          # Extract options from the question using its relationship to QuestionOption
        options = []
        
        # Check if the question has related options through the relationship
        if hasattr(next_question, "options") and next_question.options:
            # Sort options by option_order to ensure they're in the correct order
            sorted_options = sorted(next_question.options, key=lambda opt: opt.option_order)
            for option in sorted_options:
                options.append(option.option_text)
        
        # If no options found or not enough options, ensure we have exactly 4 options
        while len(options) < 4:
            options.append(f"Option {len(options)+1}")
            
        # Log the options that will be sent to client
        option_summary = ", ".join(options[:2]) + "..." if options else "No options found"
        logger.info(f"Sending question {next_question.question_id} with options: {option_summary}")
        
        # Format question response
        question_response = {
            "question_id": next_question.question_id,
            "question_text": next_question.question_text,
            "difficulty_level": next_question.difficulty_level,
            "options": options
        }
          # Return the next question with detailed state information
        response_data = {
            "status": "success",
            "next_question": question_response,
            "questions_answered": questions_answered,
            "max_questions": max_questions,
            "progress_percentage": min(100, int((questions_answered / max_questions) * 100)) if max_questions > 0 else 0
        }
        logger.info(f"Returning next question response with progress: {response_data['progress_percentage']}% " +
 f"({questions_answered}/{max_questions} questions)")

        return response_data
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error getting next question: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Provide more specific error messages based on common error types
        error_msg = str(e)
        if "selected_option_index" in error_msg.lower():
            detail = "Invalid option selection. Please select an option between 0 and 3."
        elif "was_correct" in error_msg.lower():
            detail = "Error processing answer correctness. Please try again."
        elif "is_active" in error_msg.lower():
            detail = "Question status validation error. Please try again."
        else:
            detail = f"Failed to get next question: {str(e)}"
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )
