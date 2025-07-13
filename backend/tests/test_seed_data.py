import pytest
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.database.seed_data import (
    create_sample_paper,
    create_sample_questions,
    # create_test_users,  # Function not found in seed_data.py
    # create_test_templates  # Function not found in seed_data.py
)
from src.database.models import (
    Paper, Section, Subsection, Question, QuestionOption,
    User, TestTemplate, TestTemplateSection
)

@pytest.mark.seed_data
@pytest.mark.integration
class TestPaperCreation:
    """Test cases for paper creation and structure"""

    def test_create_sample_paper(self, admin_user, db: Session):
        """Test creation of sample paper with sections and subsections"""
        # Create sample paper
        paper = create_sample_paper(db, admin_user["user_id"])
        
        # Verify paper attributes
        assert paper.paper_name.startswith("CIL HR Mock Test Paper")
        assert paper.total_marks == 100
        assert paper.description is not None
        assert paper.is_active is True
        assert paper.created_by_user_id == admin_user["user_id"]

        # Verify sections
        sections = db.query(Section).filter(Section.paper_id == paper.paper_id).all()
        assert len(sections) == 4  # Should have 4 main sections
        
        # Check section names and marks
        section_names = {s.section_name for s in sections}
        expected_names = {
            "General Knowledge",
            "Reasoning & Mental Ability",
            "HR Concepts",
            "Professional Knowledge"
        }
        assert section_names == expected_names

        # Verify subsections
        for section in sections:
            subsections = db.query(Subsection).filter(
                Subsection.section_id == section.section_id
            ).all()
            assert len(subsections) == 3  # Each section should have 3 subsections

    def test_duplicate_paper_creation(self, admin_user, db: Session):
        """Test handling of duplicate paper creation"""
        # Create first paper
        paper1 = create_sample_paper(db, admin_user["user_id"])
        
        # Create second paper
        paper2 = create_sample_paper(db, admin_user["user_id"])
        
        # Verify they are distinct papers
        assert paper1.paper_id != paper2.paper_id
        assert paper1.paper_name.split()[0:4] == paper2.paper_name.split()[0:4]  # Same base name

@pytest.mark.seed_data
@pytest.mark.integration
class TestQuestionCreation:
    """Test cases for question creation"""

    def test_create_sample_questions(self, admin_user, db: Session):
        """Test creation of sample questions with options"""
        paper = create_sample_paper(db, admin_user["user_id"])
        questions = create_sample_questions(db, paper.paper_id, admin_user["user_id"])

        # Verify questions were created
        db_questions = db.query(Question).all()
        assert len(db_questions) > 0

        # Verify question structure
        for question in db_questions:
            # Each question should have options
            options = db.query(QuestionOption).filter(
                QuestionOption.question_id == question.question_id
            ).all()
            assert len(options) >= 2  # At least 2 options per question
            
            # Verify the correct option index is valid
            assert 0 <= question.correct_option_index < len(options)

            # Question should belong to a subsection
            assert question.subsection_id is not None

# @pytest.mark.seed_data
# @pytest.mark.integration
# class TestUserCreation:
#     """Test cases for test user creation"""
# 
#     def test_create_test_users(self, db: Session):
#         """Test creation of test users"""
#         # TODO: Implement create_test_users function in seed_data.py
#         pass
        
# @pytest.mark.seed_data
# @pytest.mark.integration
# class TestTemplateCreation:
#     """Test cases for test template creation"""
# 
#     def test_create_test_templates(self, db: Session):
#         """Test creation of test templates"""
#         # TODO: Implement create_test_templates function in seed_data.py
#         pass