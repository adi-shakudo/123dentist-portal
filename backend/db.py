from sqlalchemy import (
    create_engine,
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Integer,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import uuid
from datetime import datetime
from config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PortalUser(Base):
    __tablename__ = "portal_users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, nullable=False)
    clinic_id = Column(String, ForeignKey("clinics.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Clinic(Base):
    __tablename__ = "clinics"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email_contact = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tasks = relationship(
        "ClinicTask", back_populates="clinic", cascade="all, delete-orphan"
    )
    files = relationship(
        "ClinicFile", back_populates="clinic", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ref_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phase = Column(Integer, nullable=False)  # 1, 2, 3
    exhibit = Column(String, nullable=False)  # "Financial DD", "Legal DD", etc.
    priority = Column(String, default="Medium")  # High, Medium, Low
    is_tbd = Column(Boolean, default=False)
    # Instruction fields — raw (admin input) and structured (LLM output)
    raw_instructions = Column(Text, nullable=True)
    what_to_provide = Column(Text, nullable=True)
    how_to_prepare = Column(Text, nullable=True)
    data_room_path = Column(Text, nullable=True)
    due_week = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    clinic_tasks = relationship("ClinicTask", back_populates="task")


class ClinicTask(Base):
    __tablename__ = "clinic_tasks"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinics.id"), nullable=False)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    enabled = Column(Boolean, default=True)
    status = Column(String, default="Not Started")
    # Statuses: Not Started, Submitted, Sent Back for Revision, Complete
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    clinic = relationship("Clinic", back_populates="tasks")
    task = relationship("Task", back_populates="clinic_tasks")


class ClinicFile(Base):
    __tablename__ = "clinic_files"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinics.id"), nullable=False)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    clinic = relationship("Clinic", back_populates="files")


def init_db():
    Base.metadata.create_all(bind=engine)
