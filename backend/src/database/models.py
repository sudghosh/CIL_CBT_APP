from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Numeric, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    google_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Add relationships for easy access
    created_papers = relationship("Paper", back_populates="created_by")
    created_questions = relationship("Question", back_populates="created_by")
    test_attempts = relationship("TestAttempt", back_populates="user")

class AllowedEmail(Base):
    __tablename__ = "allowed_emails"

    allowed_email_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    added_by_admin_id = Column(Integer, ForeignKey("users.user_id"))
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    added_by = relationship("User")

class Paper(Base):
    __tablename__ = "papers"

    paper_id = Column(Integer, primary_key=True)
    paper_name = Column(String, unique=True, nullable=False, index=True)
    total_marks = Column(Integer, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships with ordering
    sections = relationship("Section", back_populates="paper", order_by="Section.section_id")
    questions = relationship("Question", back_populates="paper")
    created_by = relationship("User", back_populates="created_papers")

class Section(Base):
    __tablename__ = "sections"

    section_id = Column(Integer, primary_key=True)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"), nullable=False)
    section_name = Column(String, nullable=False)
    marks_allocated = Column(Integer)
    description = Column(Text)

    # Relationships with ordering
    paper = relationship("Paper", back_populates="sections")
    subsections = relationship("Subsection", back_populates="section", order_by="Subsection.subsection_id")
    questions = relationship("Question", back_populates="section")

class Subsection(Base):
    __tablename__ = "subsections"

    subsection_id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    subsection_name = Column(String, nullable=False)
    description = Column(Text)

    section = relationship("Section", back_populates="subsections")
    questions = relationship("Question", back_populates="subsection")

class Question(Base):
    __tablename__ = "questions"

    question_id = Column(Integer, primary_key=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False, index=True)
    subsection_id = Column(Integer, ForeignKey("subsections.subsection_id"))
    default_difficulty_level = Column(String, default='Easy')
    community_difficulty_score = Column(Float, default=0.0)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, index=True)

    # Enhanced relationships
    paper = relationship("Paper", back_populates="questions")
    section = relationship("Section", back_populates="questions")
    subsection = relationship("Subsection", back_populates="questions")
    created_by = relationship("User", back_populates="created_questions")
    options = relationship("QuestionOption", back_populates="question", order_by="QuestionOption.option_order")
    test_answers = relationship("TestAnswer", back_populates="question")

    @validates('question_type')
    def validate_question_type(self, key, value):
        if value not in ('MCQ', 'True/False'):
            raise ValueError("Invalid question type")
        return value

    @validates('default_difficulty_level')
    def validate_difficulty_level(self, key, value):
        if value not in ('Easy', 'Medium', 'Hard'):
            raise ValueError("Invalid difficulty level")
        return value

class QuestionOption(Base):
    __tablename__ = "question_options"

    option_id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    option_text = Column(Text, nullable=False)
    option_order = Column(Integer, nullable=False)

    question = relationship("Question", back_populates="options")

    @validates('option_order')
    def validate_option_order(self, key, value):
        if value < 0 or value > 3:
            raise ValueError("Option order must be between 0 and 3")
        return value

class TestTemplate(Base):
    __tablename__ = "test_templates"

    template_id = Column(Integer, primary_key=True)
    template_name = Column(String, nullable=False)
    test_type = Column(String, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, index=True)

    # Enhanced relationships
    sections = relationship("TestTemplateSection", back_populates="template", cascade="all, delete-orphan")
    created_by = relationship("User")
    attempts = relationship("TestAttempt", back_populates="test_template")

    @validates('test_type')
    def validate_test_type(self, key, value):
        if value not in ('Mock', 'Practice', 'Regular'):
            raise ValueError("Invalid test type")
        return value

class TestTemplateSection(Base):
    __tablename__ = "test_template_sections"

    section_id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("test_templates.template_id"), nullable=False)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"), nullable=False)
    section_id_ref = Column(Integer, ForeignKey("sections.section_id"))
    subsection_id = Column(Integer, ForeignKey("subsections.subsection_id"))
    question_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Enhanced relationships
    template = relationship("TestTemplate", back_populates="sections")
    paper = relationship("Paper")
    section = relationship("Section")
    subsection = relationship("Subsection")

    @validates('question_count')
    def validate_question_count(self, key, value):
        if value < 1:
            raise ValueError("Question count must be greater than 0")
        return value

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    attempt_id = Column(Integer, primary_key=True)
    test_template_id = Column(Integer, ForeignKey("test_templates.template_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    score = Column(Float)
    weighted_score = Column(Float)

    # Enhanced relationships with cascading deletes
    test_template = relationship("TestTemplate", back_populates="attempts")
    user = relationship("User", back_populates="test_attempts")
    answers = relationship("TestAnswer", back_populates="attempt", cascade="all, delete-orphan")

    @validates('status')
    def validate_status(self, key, value):
        if value not in ('InProgress', 'Completed', 'Abandoned'):
            raise ValueError("Invalid test status")
        return value

    @validates('score', 'weighted_score')
    def validate_score(self, key, value):
        if value is not None and (value < 0 or value > 100):
            raise ValueError("Score must be between 0 and 100")
        return value

class TestAnswer(Base):
    __tablename__ = "test_answers"

    answer_id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.attempt_id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    selected_option_index = Column(Integer)
    time_taken_seconds = Column(Integer, nullable=False)
    marks = Column(Float)
    is_marked_for_review = Column(Boolean, default=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Enhanced relationships
    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question", back_populates="test_answers")

    @validates('selected_option_index')
    def validate_selected_option(self, key, value):
        if value is not None and (value < 0 or value > 3):
            raise ValueError("Selected option index must be between 0 and 3")
        return value

    @validates('time_taken_seconds')
    def validate_time_taken(self, key, value):
        if value < 0:
            raise ValueError("Time taken cannot be negative")
        if value > 3600:  # Max 1 hour per question
            raise ValueError("Time taken cannot exceed 1 hour per question")
        return value
