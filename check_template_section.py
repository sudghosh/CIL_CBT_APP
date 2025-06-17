"""
Script to directly check the test_template_sections table
"""
import sys
import os
from sqlalchemy import create_engine, text
import json

# Database settings
DB_USER = "postgres" 
DB_PASSWORD = "postgres"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "cil_cbt"

# Read password from file if available
try:
    with open(os.path.join("secrets", "db_password.txt"), "r") as f:
        DB_PASSWORD = f.read().strip()
except:
    pass

# Connect to DB
connection_string = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(connection_string)

def check_template(template_id):
    """Check template sections directly in DB"""
    with engine.connect() as connection:
        # Get template info
        template_result = connection.execute(
            text("""
                SELECT template_id, template_name, test_type
                FROM test_templates
                WHERE template_id = :template_id
            """),
            {"template_id": template_id}
        ).fetchone()
        
        if not template_result:
            print(f"No template found with ID {template_id}")
            return
            
        print(f"Template: ID={template_result.template_id}, Name={template_result.template_name}, Type={template_result.test_type}")
        
        # Get sections
        sections_result = connection.execute(
            text("""
                SELECT section_id, paper_id, section_id_ref, subsection_id, question_count
                FROM test_template_sections
                WHERE template_id = :template_id
            """),
            {"template_id": template_id}
        ).fetchall()
        
        print(f"Found {len(sections_result)} sections:")
        for section in sections_result:
            print(f"  Section ID={section.section_id}, paper_id={section.paper_id}, section_id_ref={section.section_id_ref}, subsection_id={section.subsection_id}, question_count={section.question_count}")
            
            # Check if questions exist for this section
            questions_result = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM questions
                    WHERE paper_id = :paper_id AND section_id = :section_id
                """),
                {"paper_id": section.paper_id, "section_id": section.section_id_ref}
            ).scalar()
            
            print(f"  Questions found for this section: {questions_result}")
            
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_template_section.py <template_id>")
        sys.exit(1)
        
    template_id = int(sys.argv[1])
    check_template(template_id)
