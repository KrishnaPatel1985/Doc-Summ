import json
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


class JobCreateResponse(BaseModel):
    job_id: UUID
    status: str


class KeyInsights(BaseModel):
    main_topic: str = ""
    key_takeaways: List[str] = []
    entities: List[str] = []
    numbers: List[str] = []
    risks: List[str] = []
    opportunities: List[str] = []
    action_items: List[str] = []


class JobSummaryResponse(BaseModel):
    job_id: UUID
    filename: Optional[str] = None
    summary: Optional[str] = None
    method: str
    status: str
    char_count_original: Optional[int] = None
    char_count_summary: Optional[int] = None
    sentences_requested: int
    length: Optional[str] = None
    tone: Optional[str] = None
    style: Optional[str] = None
    key_insights: Optional[KeyInsights] = None
    action_items: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobHistoryItem(BaseModel):
    job_id: UUID
    filename: Optional[str] = None
    summary_snippet: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    job_id: UUID
    question: str


class AskResponse(BaseModel):
    answer: str


class Flashcard(BaseModel):
    front: str
    back: str


class QuizQuestion(BaseModel):
    question: str
    options: List[str] = []
    answer: str


class KeyTerm(BaseModel):
    term: str
    definition: str


class StudyResponse(BaseModel):
    flashcards: List[Flashcard] = []
    quiz: List[QuizQuestion] = []
    key_terms: List[KeyTerm] = []
    eli5: str = ""


def _load_json(raw: Any, default: Any):
    if not raw:
        return default
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


def job_to_summary_response(job) -> JobSummaryResponse:
    """Build the full result payload from an ORM job, parsing stored JSON fields."""
    insights_data = _load_json(getattr(job, "key_insights", None), None)
    action_items = _load_json(getattr(job, "action_items", None), [])
    return JobSummaryResponse(
        job_id=job.id,
        filename=job.filename,
        summary=job.summary,
        method=job.method,
        status=job.status,
        char_count_original=job.char_count_original,
        char_count_summary=job.char_count_summary,
        sentences_requested=job.sentences_requested,
        length=getattr(job, "length", None),
        tone=getattr(job, "tone", None),
        style=getattr(job, "style", None),
        key_insights=KeyInsights(**insights_data) if isinstance(insights_data, dict) else None,
        action_items=action_items if isinstance(action_items, list) else [],
        created_at=job.created_at,
        completed_at=job.completed_at,
    )
