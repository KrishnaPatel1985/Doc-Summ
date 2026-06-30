import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, Uuid
from app.db import Base


class SummarizationJob(Base):
    __tablename__ = "summarization_jobs"

    id                  = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename            = Column(String(255), nullable=True)
    file_type           = Column(String(10), nullable=True)
    input_text          = Column(Text, nullable=True)
    summary             = Column(Text, nullable=True)
    method              = Column(String(50), default="sumy")
    status              = Column(String(20), default="queued")
    progress            = Column(Integer, default=0)
    error_message       = Column(Text, nullable=True)
    char_count_original = Column(Integer, nullable=True)
    char_count_summary  = Column(Integer, nullable=True)
    sentences_requested = Column(Integer, default=7)
    # Intelligence / customization (added v2.1)
    length              = Column(String(20), default="medium")
    tone                = Column(String(20), default="professional")
    style               = Column(String(20), default="paragraph")
    key_insights        = Column(Text, nullable=True)   # JSON string
    action_items        = Column(Text, nullable=True)   # JSON string
    created_at          = Column(DateTime, default=datetime.utcnow)
    completed_at        = Column(DateTime, nullable=True)
