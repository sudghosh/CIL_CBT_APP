"""
Direct DB script to fix templates and test starts
"""
import sys
import os
from sqlalchemy import create_engine, text
import json

# Database settings - adjust as needed
DB_USER = "postgres" 
DB_PASSWORD = "postgres"  # Replace with your actual password
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "cil_cbt"

# Try to read password from secrets file
try:
    with open(os.path.join("secrets", "db_password.txt"), "r") as f:
        DB_PASSWORD = f.read().strip()
        print(f"Using password from secrets file")
except:
    print(f"Using default password")

# Create connection string
connection_string = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
print(f"Connection string: {connection_string.replace(DB_PASSWORD, '*****')}")

# Connect to database
try:
    print("Connecting to database...")
    engine = create_engine(connection_string)
    connection = engine.connect()
    print("Connection successful!")
except Exception as e:
    print(f"Error connecting to database: {str(e)}")
    sys.exit(1)

# Get template ID
template_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
if not template_id:
    print("Please provide a template ID")
    sys.exit(1)

# Fix the template section_id_ref
print(f"Fixing template {template_id}...")
try:
    # Get template sections
    sections = connection.execute(
        text("""
        SELECT 
            ts.section_id as template_section_id,
            ts.paper_id,
            ts.section_id_ref,
            ts.question_count
        FROM 
            test_template_sections ts
        WHERE 
            ts.template_id = :template_id
        """),
        {"template_id": template_id}
    ).fetchall()
    
    print(f"Found {len(sections)} sections")
    
    # For each section, check if there are questions with section_id_ref
    for section in sections:
        print(f"Checking section {section.template_section_id}: paper_id={section.paper_id}, section_id_ref={section.section_id_ref}")
        
        # Check if section has valid questions
        questions = connection.execute(
            text("""
            SELECT 
                COUNT(*) as count
            FROM 
                questions q
            WHERE 
                q.paper_id = :paper_id AND
                q.section_id = :section_id AND
                q.valid_until >= CURRENT_DATE
            """),
            {"paper_id": section.paper_id, "section_id": section.section_id_ref}
        ).scalar()
        
        print(f"Found {questions} questions with paper_id={section.paper_id}, section_id={section.section_id_ref}")
        
        if questions == 0:
            # No questions found with this section_id_ref, need to fix
            print("Need to fix section_id_ref")
            
            # Find a valid section_id that has questions
            valid_section = connection.execute(
                text("""
                SELECT 
                    q.section_id,
                    COUNT(*) as count
                FROM 
                    questions q
                WHERE 
                    q.paper_id = :paper_id AND
                    q.valid_until >= CURRENT_DATE
                GROUP BY
                    q.section_id
                ORDER BY
                    count DESC
                LIMIT 1
                """),
                {"paper_id": section.paper_id}
            ).fetchone()
            
            if valid_section:
                print(f"Found valid section_id {valid_section.section_id} with {valid_section.count} questions")
                
                # Update the section
                connection.execute(
                    text("""
                    UPDATE test_template_sections
                    SET section_id_ref = :new_section_id
                    WHERE section_id = :template_section_id
                    """),
                    {"new_section_id": valid_section.section_id, "template_section_id": section.template_section_id}
                )
                
                print(f"Updated section_id_ref from {section.section_id_ref} to {valid_section.section_id}")
                connection.commit()
            else:
                print("No valid section_id found!")
        else:
            print("Section has valid questions, no fix needed")
            
    print("Fix completed!")
    
except Exception as e:
    print(f"Error fixing template: {str(e)}")
    connection.rollback()
    
finally:
    connection.close()
    print("Connection closed")
