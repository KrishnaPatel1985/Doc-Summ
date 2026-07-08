"""Phase 5 additive data layer.

New tables introduced alongside the existing ``summarization_jobs`` table
(which is left completely untouched for backward compatibility). These store
data that was previously kept only in the frontend / not persisted at all:

- ``quiz_results``  — a saved quiz attempt (score + answers) per document.
- ``chat_messages`` — persisted Ask-Document Q&A per document.

Both reference a document by its job UUID (``summarization_jobs.id``), but no
hard foreign key is enforced so prepared-only docs and older rows keep working.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, Uuid

from app.db import Base


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id           = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(Uuid(as_uuid=True), index=True, nullable=True)
    job_id       = Column(Uuid(as_uuid=True), index=True, nullable=False)
    score        = Column(Integer, nullable=False, default=0)
    total        = Column(Integer, nullable=False, default=0)
    answers_json = Column(Text, nullable=True)   # JSON string of per-question answers
    created_at   = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(Uuid(as_uuid=True), index=True, nullable=True)
    document_id = Column(Uuid(as_uuid=True), index=True, nullable=False)
    role        = Column(String(20), nullable=False)   # 'user' | 'assistant'
    message     = Column(Text, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
