from sqlalchemy.orm import Session
from .database import get_db
from .models import Paper, Section, Subsection, Question, QuestionOption
from typing import List
from datetime import date
import random  # Add import for random module

def create_sample_paper(db: Session) -> Paper:
    # Create main paper
    paper = Paper(
        paper_name="CIL HR Mock Test Paper 1",
        total_marks=100,
        description="Sample mock test paper for CIL HR recruitment",
        is_active=True
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    # Create sections
    sections = [
        {
            "name": "General Knowledge",
            "marks": 20,
            "description": "Basic general knowledge questions",
            "subsections": ["Current Affairs", "History", "Geography"]
        },
        {
            "name": "Reasoning & Mental Ability",
            "marks": 25,
            "description": "Logical reasoning and mental ability questions",
            "subsections": ["Verbal Reasoning", "Non-verbal Reasoning", "Data Interpretation"]
        },
        {
            "name": "HR Concepts",
            "marks": 30,
            "description": "Core HR concepts and principles",
            "subsections": ["HRM", "Industrial Relations", "Labor Laws"]
        },
        {
            "name": "Professional Knowledge",
            "marks": 25,
            "description": "Domain-specific professional knowledge",
            "subsections": ["Management Principles", "Organizational Behavior", "Strategic Management"]
        }
    ]

    for section_data in sections:
        section = Section(
            paper_id=paper.paper_id,
            section_name=section_data["name"],
            marks_allocated=section_data["marks"],
            description=section_data["description"]
        )
        db.add(section)
        db.commit()
        db.refresh(section)

        # Create subsections
        for subsection_name in section_data["subsections"]:
            subsection = Subsection(
                section_id=section.section_id,
                subsection_name=subsection_name,
                description=f"Questions related to {subsection_name}"
            )
            db.add(subsection)
        db.commit()

    return paper

def create_sample_questions(db: Session, paper_id: int) -> List[Question]:
    # Get all sections
    sections = db.query(Section).filter(Section.paper_id == paper_id).all()
    questions = []
    
    # Define difficulty levels for random choice
    difficulty_levels = ['Easy', 'Medium', 'Hard']

    for section in sections:
        # Get subsections for this section
        subsections = db.query(Subsection).filter(Subsection.section_id == section.section_id).all()
        
        # Create 5 questions per subsection
        for subsection in subsections:
            for i in range(5):
                # Randomly choose difficulty level
                chosen_difficulty = random.choice(difficulty_levels)
                
                question = Question(
                    question_text=f"Sample question {i+1} for {subsection.subsection_name}",
                    question_type="MCQ",
                    correct_option_index=0,  # First option is correct
                    explanation=f"Explanation for sample question {i+1}",
                    paper_id=paper_id,
                    section_id=section.section_id,
                    subsection_id=subsection.subsection_id,
                    default_difficulty_level="Easy",
                    difficulty_level=chosen_difficulty,  # Use randomly chosen difficulty
                    valid_until=date(9999, 12, 31)
                )
                db.add(question)
                db.commit()
                db.refresh(question)

                # Create 4 options for each question
                for j in range(4):
                    is_correct = j == 0  # First option is correct
                    option = QuestionOption(
                        question_id=question.question_id,
                        option_text=f"{'Correct' if is_correct else 'Incorrect'} option {j+1} for question {i+1}",
                        option_order=j
                    )
                    db.add(option)
                
                questions.append(question)
                db.commit()

    return questions

def seed_database():
    db = next(get_db())
    try:
        # Check if data already exists
        existing_papers = db.query(Paper).count()
        if existing_papers > 0:
            print("Database already contains data. Skipping seeding.")
            return

        # Create sample paper and questions
        paper = create_sample_paper(db)
        questions = create_sample_questions(db, paper.paper_id)
        
        print(f"Successfully seeded database with:")
        print(f"- 1 paper")
        print(f"- {len(questions)} questions")
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
