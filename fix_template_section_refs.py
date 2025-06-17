"""
Script to fix test template section references in the database.

This script:
1. Checks all TestTemplateSection records to ensure section_id_ref matches a real section with questions
2. Fixes any mismatches by updating to a valid section_id where questions exist
3. Generates a detailed report of all changes made

Usage:
    python fix_template_section_refs.py

Notes:
    - Run from the CIL_CBT_App directory
    - Requires the same database configuration as the backend
"""

import os
import sys
import logging
from datetime import datetime
import csv

# Add the path to import backend modules
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.insert(0, backend_dir)

try:
    from backend.src.database.database import SessionLocal, engine
    from backend.src.database.models import (
        TestTemplate, TestTemplateSection, Question, Section, Paper
    )
    from sqlalchemy import func, desc
except ImportError:
    # If that fails, try the direct import
    from src.database.database import SessionLocal, engine
    from src.database.models import (
        TestTemplate, TestTemplateSection, Question, Section, Paper
    )
    from sqlalchemy import func, desc

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('template_fix.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def check_and_fix_templates():
    """Check all test templates and fix section_id_ref issues."""
    
    db = SessionLocal()
    try:
        # Record changes for reporting
        changes = []
        
        # Get all test templates with their sections
        templates = db.query(TestTemplate).all()
        logger.info(f"Found {len(templates)} test templates to check")
        
        for template in templates:
            logger.info(f"Checking template ID={template.template_id}, Name='{template.template_name}'")
            
            # Get all sections for this template
            sections = db.query(TestTemplateSection).filter(
                TestTemplateSection.template_id == template.template_id
            ).all()
            
            for section in sections:
                logger.info(f"  Checking section ID={section.section_id}, paper_id={section.paper_id}, section_id_ref={section.section_id_ref}")
                
                # Check if section_id_ref is valid by looking for questions
                question_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section.section_id_ref
                ).count()
                
                logger.info(f"    Found {question_count} questions with paper_id={section.paper_id}, section_id={section.section_id_ref}")
                
                # If no questions found with this section_id_ref, try to fix it
                if question_count == 0:
                    # Try to find questions with this paper_id and any section_id
                    available_questions = db.query(Question.section_id, func.count(Question.question_id).label('count'))\
                        .filter(Question.paper_id == section.paper_id)\
                        .group_by(Question.section_id)\
                        .order_by(desc('count'))\
                        .first()
                    
                    if available_questions:
                        old_section_id_ref = section.section_id_ref
                        correct_section_id = available_questions[0]
                        section.section_id_ref = correct_section_id
                        
                        # Get section name for better reporting
                        section_name = "Unknown"
                        db_section = db.query(Section).filter(Section.section_id == correct_section_id).first()
                        if db_section:
                            section_name = db_section.section_name
                        
                        logger.warning(f"    FIXED: Updated section_id_ref from {old_section_id_ref} to {correct_section_id} ({section_name})")
                        changes.append({
                            'template_id': template.template_id,
                            'template_name': template.template_name,
                            'section_id': section.section_id,
                            'paper_id': section.paper_id,
                            'old_section_id_ref': old_section_id_ref,
                            'new_section_id_ref': correct_section_id,
                            'section_name': section_name,
                            'question_count': available_questions[1]
                        })
                        
                        # Check section_id vs section_id_ref
                        if hasattr(section, 'section_id') and section.section_id != section.section_id_ref:
                            logger.warning(f"    Note: section_id={section.section_id} differs from section_id_ref={section.section_id_ref}")
                    else:
                        logger.error(f"    ERROR: No questions found for paper_id={section.paper_id}")
        
        # Commit all changes
        if changes:
            logger.info(f"Committing {len(changes)} fixes to the database")
            db.commit()
            
            # Generate a report CSV
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_file = f'template_fixes_{timestamp}.csv'
            
            with open(report_file, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([
                    'Template ID', 'Template Name', 'Section ID', 'Paper ID',
                    'Old Section ID Ref', 'New Section ID Ref', 'Section Name', 'Question Count'
                ])
                
                for change in changes:
                    writer.writerow([
                        change['template_id'], change['template_name'], change['section_id'], change['paper_id'],
                        change['old_section_id_ref'], change['new_section_id_ref'], change['section_name'], change['question_count']
                    ])
            
            logger.info(f"Report generated: {report_file}")
            
            return len(changes), report_file
        else:
            logger.info("No fixes needed - all section references are valid")
            return 0, None
    
    finally:
        db.close()

def validate_templates():
    """Verify all templates have valid sections after fixing."""
    
    db = SessionLocal()
    try:
        templates = db.query(TestTemplate).all()
        report = []
        
        for template in templates:
            sections = db.query(TestTemplateSection).filter(
                TestTemplateSection.template_id == template.template_id
            ).all()
            
            for section in sections:
                question_count = db.query(Question).filter(
                    Question.paper_id == section.paper_id,
                    Question.section_id == section.section_id_ref
                ).count()
                
                report.append({
                    'template_id': template.template_id,
                    'template_name': template.template_name,
                    'section_id': section.section_id,
                    'paper_id': section.paper_id,
                    'section_id_ref': section.section_id_ref,
                    'question_count': question_count,
                    'status': 'VALID' if question_count > 0 else 'INVALID'
                })
        
        # Generate validation report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'template_validation_{timestamp}.csv'
        
        with open(report_file, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow([
                'Template ID', 'Template Name', 'Section ID', 'Paper ID',
                'Section ID Ref', 'Question Count', 'Status'
            ])
            
            for item in report:
                writer.writerow([
                    item['template_id'], item['template_name'], item['section_id'], item['paper_id'],
                    item['section_id_ref'], item['question_count'], item['status']
                ])
        
        # Count invalid templates
        invalid_count = sum(1 for item in report if item['status'] == 'INVALID')
        
        logger.info(f"Validation complete: {len(report)} sections checked, {invalid_count} invalid sections found")
        logger.info(f"Validation report: {report_file}")
        
        return invalid_count, report_file
    
    finally:
        db.close()

if __name__ == "__main__":
    print("======================================================")
    print("  Test Template Section Reference Fixer")
    print("======================================================")
    print("This script will check all test templates and fix any section_id_ref issues.")
    print("Make sure you have a database backup before proceeding.")
    
    confirm = input("Do you want to continue? [y/N]: ")
    if confirm.lower() != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    print("\nChecking and fixing templates...")
    fixes_count, fixes_report = check_and_fix_templates()
    
    print(f"\n{fixes_count} template sections were fixed.")
    
    if fixes_count > 0:
        print(f"Report generated: {fixes_report}")
    
    print("\nValidating templates after fixes...")
    invalid_count, validation_report = validate_templates()
    
    print(f"\nValidation complete: {invalid_count} invalid sections remain.")
    print(f"Validation report: {validation_report}")
    
    if invalid_count > 0:
        print("\nWARNING: Some templates still have invalid section references.")
        print("You may need to manually check these templates or run this script again.")
    else:
        print("\nSuccess! All test templates now have valid section references.")
    
    print("\nDone.")
