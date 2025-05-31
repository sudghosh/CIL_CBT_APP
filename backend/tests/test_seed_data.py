import pytest
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.database.seed_data import (
    create_sample_paper,
    create_sample_questions,
    create_test_users,
    create_test_templates
)
from src.database.models import (
    Paper, Section, Subsection, Question, QuestionOption,
    User, TestTemplate, TestTemplateSection
)

@pytest.mark.seed_data
@pytest.mark.integration
class TestPaperCreation:
    """Test cases for paper creation and structure"""

    def test_create_sample_paper(self, db: Session):
        """Test creation of sample paper with sections and subsections"""
        # Create sample paper
        paper = create_sample_paper(db)
        
        # Verify paper attributes
        assert paper.paper_name == "CIL HR Mock Test Paper 1"
        assert paper.total_marks == 100
        assert paper.description is not None
        assert paper.is_active is True

        # Verify sections
        sections = db.query(Section).filter(Section.paper_id == paper.id).all()
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
                Subsection.section_id == section.id
            ).all()
            assert len(subsections) == 3  # Each section should have 3 subsections

    def test_duplicate_paper_creation(self, db: Session):
        """Test handling of duplicate paper creation"""
        # Create first paper
        paper1 = create_sample_paper(db)
        
        # Create second paper
        paper2 = create_sample_paper(db)
        
        # Verify they are distinct papers
        assert paper1.id != paper2.id
        assert paper1.paper_name == paper2.paper_name

@pytest.mark.seed_data
@pytest.mark.integration
class TestQuestionCreation:
    """Test cases for question creation"""

    def test_create_sample_questions(self, db: Session):
        """Test creation of sample questions with options"""
        paper = create_sample_paper(db)
        questions = create_sample_questions(db)

        # Verify questions were created
        db_questions = db.query(Question).all()
        assert len(db_questions) > 0

        # Verify question structure
        for question in db_questions:
            # Each question should have options
            options = db.query(QuestionOption).filter(
                QuestionOption.question_id == question.id
            ).all()
            assert len(options) >= 2  # At least 2 options per question
            
            # One option should be correct
            correct_options = [opt for opt in options if opt.is_correct]
            assert len(correct_options) == 1

            # Question should belong to a subsection
            assert question.subsection_id is not None

@pytest.mark.seed_data
@pytest.mark.integration
class TestUserCreation:
    """Test cases for test user creation"""

    def test_create_test_users(self, db: Session):
        """Test creation of test users"""
        users = create_test_users(db)
        
        # Verify admin user was created
        admin = db.query(User).filter(User.username == "admin").first()
        assert admin is not None
        assert admin.is_admin is True
        
        # Verify test users were created
        test_users = db.query(User).filter(User.username.like("test%")).all()
        assert len(test_users) > 0
        
        # Verify user attributes
        for user in test_users:
            assert user.username is not None
            assert user.hashed_password is not None
            assert user.is_active is True

@pytest.mark.seed_data
@pytest.mark.integration
class TestTemplateCreation:
    """Test cases for test template creation"""

    def test_create_test_templates(self, db: Session):
        """Test creation of test templates"""
        paper = create_sample_paper(db)
        templates = create_test_templates(db)
        
        # Verify templates were created
        db_templates = db.query(TestTemplate).all()
        assert len(db_templates) > 0
        
        # Verify template structure
        for template in db_templates:
            # Each template should have sections
            sections = db.query(TestTemplateSection).filter(
                TestTemplateSection.template_id == template.id
            ).all()
            assert len(sections) > 0
            
            # Template should reference valid paper
            assert template.paper_id is not None
            paper = db.query(Paper).get(template.paper_id)
            assert paper is not None