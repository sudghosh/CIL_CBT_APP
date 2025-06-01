"""Database package for the application."""
from .database import Base, create_db_and_tables, get_db, engine, SessionLocal, db_session
from .models import (
    User,
    AllowedEmail,
    Paper,
    Section,
    Subsection,
    Question,
    QuestionOption,
    TestTemplate,
    TestTemplateSection,
    TestAttempt,
    TestAnswer
)

__all__ = [
    'Base',
    'create_db_and_tables',
    'get_db',
    'engine',
    'SessionLocal',
    'db_session',
    'User',
    'AllowedEmail',
    'Paper',
    'Section',
    'Subsection',
    'Question',
    'QuestionOption',
    'TestTemplate',
    'TestTemplateSection',
    'TestAttempt',
    'TestAnswer'
]
