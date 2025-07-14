#!/usr/bin/env python
"""
Question Validity Extension Script

This script extends the validity of questions in the database that have expired.
It helps fix the "No valid questions found" error by ensuring questions have proper valid_until dates.
"""

import os
import sys
import argparse
from datetime import date, datetime, timedelta
import sqlalchemy
from sqlalchemy import create_engine, text, update
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("QuestionValidity")

# Parse arguments
parser = argparse.ArgumentParser(description='Extend question validity dates.')
parser.add_argument('--db-host', default='localhost', help='Database host')
parser.add_argument('--db-port', default='5432', help='Database port')
parser.add_argument('--db-name', default='cil_cbt_db', help='Database name')
parser.add_argument('--db-user', default='postgres', help='Database user')
parser.add_argument('--db-password', help='Database password')
parser.add_argument('--paper-id', type=int, help='Specific paper ID to update')
parser.add_argument('--section-id', type=int, help='Specific section ID to update')
parser.add_argument('--all', action='store_true', help='Update all expired questions')
parser.add_argument('--validity', default='1y', help='Validity period (e.g., 1y, 6m, 30d)')
args = parser.parse_args()

# Parse validity period
validity_value = int(args.validity[:-1])
validity_unit = args.validity[-1].lower()

# Default to 1 year if invalid format
if validity_unit not in ['y', 'm', 'd'] or validity_value <= 0:
    logger.warning(f"Invalid validity format: {args.validity}. Using default of 1 year.")
    validity_value = 1
    validity_unit = 'y'

# Calculate the new validity date
today = date.today()
if validity_unit == 'y':
    new_valid_until = date(today.year + validity_value, today.month, today.day)
elif validity_unit == 'm':
    # Handle month overflow
    month = today.month + validity_value
    year_add = (month - 1) // 12
    month = ((month - 1) % 12) + 1
    new_valid_until = date(today.year + year_add, month, min(today.day, 28))
else:  # days
    new_valid_until = today + timedelta(days=validity_value)

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

# Build the query based on arguments
query = text("""
    UPDATE questions
    SET valid_until = :new_valid_until
    WHERE valid_until < :today
""")
params = {"new_valid_until": new_valid_until, "today": today}

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
count_params = {"today": today}

if args.paper_id:
    count_query = text(count_query.text + " AND paper_id = :paper_id")
    count_params["paper_id"] = args.paper_id

if args.section_id:
    count_query = text(count_query.text + " AND section_id = :section_id")
    count_params["section_id"] = args.section_id

try:
    expired_count = session.execute(count_query, count_params).scalar()
    
    if expired_count == 0:
        logger.info("No expired questions found matching the criteria.")
        sys.exit(0)
    
    logger.info(f"Found {expired_count} expired questions.")
    
    # If --all flag is not set, ask for confirmation
    if not args.all:
        confirmation = input(f"Do you want to extend the validity of {expired_count} questions to {new_valid_until}? (y/n): ")
        if confirmation.lower() != 'y':
            logger.info("Operation cancelled by user.")
            sys.exit(0)
    
    # Update the questions
    result = session.execute(query, params)
    session.commit()
    
    logger.info(f"Successfully updated {result.rowcount} questions. New valid_until date: {new_valid_until}")
    
    # If specific paper/section was updated, show which questions were affected
    if args.paper_id or args.section_id:
        details_query = """
            SELECT q.question_id, p.paper_name, s.section_name, q.question_text
            FROM questions q
            JOIN papers p ON q.paper_id = p.paper_id
            JOIN sections s ON q.section_id = s.section_id
            WHERE q.valid_until = :new_valid_until
        """
        
        if args.paper_id:
            details_query += " AND q.paper_id = :paper_id"
        
        if args.section_id:
            details_query += " AND q.section_id = :section_id"
            
        details_query += " ORDER BY q.question_id LIMIT 5"
        
        details_result = session.execute(text(details_query), params)
        logger.info("Sample of updated questions:")
        for row in details_result:
            logger.info(f"ID: {row[0]} | Paper: {row[1]} | Section: {row[2]} | Question: {row[3][:50]}...")
    
except Exception as e:
    logger.error(f"Error updating questions: {e}")
    session.rollback()
    sys.exit(1)
finally:
    session.close()
    logger.info("Database connection closed.")

print("\nINSTRUCTIONS:")
print("=============")
print("1. After extending question validity, restart the backend service:")
print("   docker-compose -f docker-compose.dev.yml restart backend")
print("2. Test creating a template with the papers/sections you just updated")
print("3. Try to start a test using the template")
print("\nIf the problem persists, check that the template has valid section_id_ref values:")
print("SELECT * FROM test_template_sections WHERE template_id = YOUR_TEMPLATE_ID;")
