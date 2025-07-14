#!/usr/bin/env python
"""
Question Validity Fix Script

This script extends the validity of questions in the database and fixes test templates
to ensure they use section_id_ref values that match valid questions.
"""

import os
import sys
import argparse
from datetime import date, datetime, timedelta
import sqlalchemy
from sqlalchemy import create_engine, text, update
from sqlalchemy.orm import sessionmaker
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("QuestionValidityFix")

# Parse arguments
parser = argparse.ArgumentParser(description='Fix question validity and test templates.')
parser.add_argument('--db-host', default='localhost', help='Database host')
parser.add_argument('--db-port', default='5432', help='Database port')
parser.add_argument('--db-name', default='cil_cbt_db', help='Database name')
parser.add_argument('--db-user', default='postgres', help='Database user')
parser.add_argument('--db-password', help='Database password')
parser.add_argument('--template-id', type=int, help='Specific template ID to fix')
parser.add_argument('--paper-id', type=int, help='Specific paper ID to update')
parser.add_argument('--section-id', type=int, help='Specific section ID to update')
parser.add_argument('--all', action='store_true', help='Fix all questions and templates')
parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
args = parser.parse_args()

# Try to get DB password from environment or file if not provided as argument
db_password = args.db_password
if not db_password:
    # Check environment variable
    db_password = os.environ.get('DB_PASSWORD')
    
    # Check password file
    if not db_password:
        password_file = os.path.join(os.path.dirname(__file__), 'secrets', 'db_password.txt')
        try:
            if os.path.exists(password_file):
                with open(password_file, 'r') as f:
                    db_password = f.read().strip()
        except Exception as e:
            logger.error(f"Error reading password file: {e}")

if not db_password:
    logger.error("Database password not provided. Use --db-password, DB_PASSWORD environment variable, or place it in secrets/db_password.txt")
    sys.exit(1)

# Create database connection
db_url = f"postgresql://{args.db_user}:{db_password}@{args.db_host}:{args.db_port}/{args.db_name}"
try:
    logger.info(f"Connecting to database at {args.db_host}:{args.db_port}/{args.db_name}...")
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    logger.info("Connected to database successfully.")
except Exception as e:
    logger.error(f"Error connecting to database: {e}")
    sys.exit(1)

try:
    # Step 1: Extend question validity dates
    new_valid_until = date(date.today().year + 1, date.today().month, date.today().day)
    
    # Build the query based on arguments
    query = text("""
        UPDATE questions
        SET valid_until = :new_valid_until
        WHERE valid_until < :today
    """)
    params = {"new_valid_until": new_valid_until, "today": date.today()}
    
    # Add filters if specified
    if args.paper_id:
        query = text(query.text + " AND paper_id = :paper_id")
        params["paper_id"] = args.paper_id
    
    if args.section_id:
        query = text(query.text + " AND section_id = :section_id")
        params["section_id"] = args.section_id
    
    # Check if any questions will be updated
    count_query = text("""
        SELECT COUNT(*) FROM questions
        WHERE valid_until < :today
    """)
    count_params = {"today": date.today()}
    
    if args.paper_id:
        count_query = text(count_query.text + " AND paper_id = :paper_id")
        count_params["paper_id"] = args.paper_id
    
    if args.section_id:
        count_query = text(count_query.text + " AND section_id = :section_id")
        count_params["section_id"] = args.section_id
    
    expired_count = session.execute(count_query, count_params).scalar()
    
    if expired_count == 0:
        logger.info("No expired questions found.")
    else:
        logger.info(f"Found {expired_count} expired questions.")
        
        if not args.dry_run and (args.all or args.paper_id or args.section_id):
            # Update the questions
            result = session.execute(query, params)
            session.commit()
            logger.info(f"Extended validity for {result.rowcount} questions to {new_valid_until}")
        elif args.dry_run:
            logger.info(f"Would extend validity for {expired_count} questions to {new_valid_until}")
    
    # Step 2: Fix test template section references
    templates_query = """
        SELECT t.template_id, t.template_name, COUNT(ts.section_id) AS section_count
        FROM test_templates t
        LEFT JOIN test_template_sections ts ON t.template_id = ts.template_id
    """
    
    if args.template_id:
        templates_query += f" WHERE t.template_id = {args.template_id}"
    
    templates_query += " GROUP BY t.template_id, t.template_name ORDER BY t.template_id"
    
    templates_result = session.execute(text(templates_query))
    templates = [{"id": row[0], "name": row[1], "section_count": row[2]} for row in templates_result]
    
    if not templates:
        logger.info("No templates found.")
    else:
        logger.info(f"Found {len(templates)} templates to check.")
        
        fixed_templates = 0
        fixed_sections = 0
        
        for template in templates:
            logger.info(f"Checking template ID {template['id']}: {template['name']} ({template['section_count']} sections)")
            
            # Get sections for this template
            sections_query = text("""
                SELECT ts.section_id, ts.template_id, ts.paper_id, ts.section_id_ref
                FROM test_template_sections ts
                WHERE ts.template_id = :template_id
                ORDER BY ts.section_id
            """)
            
            sections = session.execute(sections_query, {"template_id": template["id"]}).fetchall()
            template_fixed = False
            
            for section in sections:
                section_id = section[0]
                paper_id = section[2]
                current_section_id_ref = section[3]
                
                # Check if this section_id_ref has valid questions
                valid_questions_query = text("""
                    SELECT COUNT(*) FROM questions
                    WHERE paper_id = :paper_id
                    AND section_id = :section_id
                    AND valid_until >= :today
                """)
                
                valid_count = session.execute(
                    valid_questions_query, 
                    {"paper_id": paper_id, "section_id": current_section_id_ref, "today": date.today()}
                ).scalar()
                
                if valid_count == 0:
                    logger.warning(f"Section {section_id} (paper {paper_id}, section_id_ref {current_section_id_ref}) has no valid questions")
                    
                    # Find a valid section_id with questions
                    valid_section_query = text("""
                        SELECT q.section_id, COUNT(*) as question_count
                        FROM questions q
                        WHERE q.paper_id = :paper_id
                        AND q.valid_until >= :today
                        GROUP BY q.section_id
                        ORDER BY question_count DESC
                        LIMIT 1
                    """)
                    
                    valid_section = session.execute(
                        valid_section_query,
                        {"paper_id": paper_id, "today": date.today()}
                    ).fetchone()
                    
                    if valid_section:
                        new_section_id_ref = valid_section[0]
                        
                        logger.info(f"Found valid section {new_section_id_ref} with {valid_section[1]} questions")
                        
                        if not args.dry_run and (args.all or args.template_id):
                            # Update the section_id_ref
                            update_query = text("""
                                UPDATE test_template_sections
                                SET section_id_ref = :new_section_id_ref
                                WHERE section_id = :section_id
                            """)
                            
                            session.execute(
                                update_query,
                                {"new_section_id_ref": new_section_id_ref, "section_id": section_id}
                            )
                            
                            logger.info(f"Fixed section {section_id}: changed section_id_ref from {current_section_id_ref} to {new_section_id_ref}")
                            template_fixed = True
                            fixed_sections += 1
                        elif args.dry_run:
                            logger.info(f"Would fix section {section_id}: change section_id_ref from {current_section_id_ref} to {new_section_id_ref}")
                    else:
                        logger.error(f"No valid sections found for paper {paper_id}")
            
            if template_fixed:
                fixed_templates += 1
        
        if not args.dry_run and fixed_sections > 0:
            session.commit()
            logger.info(f"Fixed {fixed_sections} sections in {fixed_templates} templates")
        elif args.dry_run and fixed_sections > 0:
            logger.info(f"Would fix {fixed_sections} sections in {fixed_templates} templates")
        else:
            logger.info("No template sections needed fixing")

except Exception as e:
    logger.error(f"Error fixing question validity or templates: {e}")
    import traceback
    traceback.print_exc()
    session.rollback()
    sys.exit(1)
finally:
    session.close()
    logger.info("Database connection closed.")

print("\nINSTRUCTIONS:")
print("=============")
print("1. After fixing question validity and test templates, restart the backend service:")
print("   docker-compose -f docker-compose.dev.yml restart backend")
print("2. Try to create a new test template or use an existing one that was fixed")
print("3. Start a test using the template")
print("\nIf problems persist, check the backend logs for more information.")
