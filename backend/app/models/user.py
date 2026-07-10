import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Uuid

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(120), nullable=False)
    first_name    = Column(String(80), nullable=True)
    last_name     = Column(String(80), nullable=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(Uuid(as_uuid=True), index=True, nullable=False)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at    = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
