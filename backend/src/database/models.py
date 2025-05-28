from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Numeric, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    paper_name = Column(String, unique=True, nullable=False)
    total_marks = Column(Integer, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    sections = relationship("Section", back_populates="paper")

class Section(Base):
    __tablename__ = "sections"

    section_id = Column(Integer, primary_key=True)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"), nullable=False)
    section_name = Column(String, nullable=False)
    marks_allocated = Column(Integer)
    description = Column(Text)

    paper = relationship("Paper", back_populates="sections")
    subsections = relationship("Subsection", back_populates="section")

class Subsection(Base):
    __tablename__ = "subsections"

    subsection_id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    subsection_name = Column(String, nullable=False)
    description = Column(Text)

    section = relationship("Section", back_populates="subsections")

class Question(Base):
    __tablename__ = "questions"

    question_id = Column(Integer, primary_key=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    subsection_id = Column(Integer, ForeignKey("subsections.subsection_id"))
    default_difficulty_level = Column(String, default='Easy')
    community_difficulty_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    paper = relationship("Paper")
    section = relationship("Section")
    subsection = relationship("Subsection")
    options = relationship("QuestionOption", back_populates="question")

class QuestionOption(Base):
    __tablename__ = "question_options"

    option_id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    option_text = Column(Text, nullable=False)
    option_order = Column(Integer, nullable=False)

    question = relationship("Question", back_populates="options")

class TestTemplate(Base):
    __tablename__ = "test_templates"

    template_id = Column(Integer, primary_key=True)
    template_name = Column(String, nullable=False)
    test_type = Column(String, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by = relationship("User")
    sections = relationship("TestTemplateSection", back_populates="template")

class TestTemplateSection(Base):
    __tablename__ = "test_template_sections"

    template_section_id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("test_templates.template_id"), nullable=False)
    paper_id = Column(Integer, ForeignKey("papers.paper_id"))
    section_id = Column(Integer, ForeignKey("sections.section_id"))
    subsection_id = Column(Integer, ForeignKey("subsections.subsection_id"))
    question_count = Column(Integer, nullable=False)

    template = relationship("TestTemplate", back_populates="sections")
    paper = relationship("Paper")
    section = relationship("Section")
    subsection = relationship("Subsection")

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    attempt_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    test_type = Column(String, nullable=False)
    test_template_id = Column(Integer, ForeignKey("test_templates.template_id"))
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    total_allotted_duration_minutes = Column(Integer)
    status = Column(String, nullable=False)  # InProgress, Completed, Abandoned
    score = Column(Float)
    weighted_score = Column(Float)

    user = relationship("User")
    template = relationship("TestTemplate")
    answers = relationship("TestAnswer", back_populates="attempt")

class TestAnswer(Base):
    __tablename__ = "test_answers"

    answer_id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.attempt_id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=False)
    selected_option_index = Column(Integer)
    is_correct = Column(Boolean)
    time_taken_seconds = Column(Integer)
    is_marked_for_review = Column(Boolean, default=False)

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question")
