import json
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class JobCreateResponse(BaseModel):
    job_id: UUID
    status: str


class EvidenceMapItem(BaseModel):
    claim: str = ""
    evidence_snippet: str = ""
    source: str = "Document content"
    confidence: str = "Medium"


class RedFlag(BaseModel):
    issue: str = ""
    why_it_matters: str = ""
    suggested_follow_up: str = ""


class RiskReport(BaseModel):
    risks: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    red_flags: List[RedFlag] = Field(default_factory=list)


class KeyInsights(BaseModel):
    main_topic: str = ""
    key_takeaways: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    numbers: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    evidence_map: List[EvidenceMapItem] = Field(default_factory=list)
    risk_report: RiskReport = Field(default_factory=RiskReport)


class JobSummaryResponse(BaseModel):
    job_id: UUID
    filename: Optional[str] = None
    file_type: Optional[str] = None
    summary: Optional[str] = None
    method: str
    status: str
    char_count_original: Optional[int] = None
    char_count_summary: Optional[int] = None
    document_preview: Optional[str] = None
    source_snippets: List[str] = Field(default_factory=list)
    sentences_requested: int
    length: Optional[str] = None
    tone: Optional[str] = None
    style: Optional[str] = None
    key_insights: Optional[KeyInsights] = None
    action_items: List[str] = Field(default_factory=list)
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
    flashcards: List[Flashcard] = Field(default_factory=list)
    quiz: List[QuizQuestion] = Field(default_factory=list)
    key_terms: List[KeyTerm] = Field(default_factory=list)
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


def _compact_text(raw: Optional[str], limit: int = 700) -> Optional[str]:
    if not raw:
        return None
    text = " ".join(raw.split())
    if not text:
        return None
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."


def _source_snippets(input_text: Optional[str], insights_data: Any) -> List[str]:
    snippets: List[str] = []
    if isinstance(insights_data, dict):
        evidence = insights_data.get("evidence_map")
        if isinstance(evidence, list):
            for item in evidence:
                if not isinstance(item, dict):
                    continue
                snippet = _compact_text(item.get("evidence_snippet"), 220)
                if snippet and snippet not in snippets:
                    snippets.append(snippet)
                if len(snippets) >= 3:
                    return snippets

    fallback = _compact_text(input_text, 360)
    return snippets or ([fallback] if fallback else [])


def job_to_summary_response(job) -> JobSummaryResponse:
    """Build the full result payload from an ORM job, parsing stored JSON fields."""
    insights_data = _load_json(getattr(job, "key_insights", None), None)
    action_items = _load_json(getattr(job, "action_items", None), [])
    return JobSummaryResponse(
        job_id=job.id,
        filename=job.filename,
        file_type=getattr(job, "file_type", None),
        summary=job.summary,
        method=job.method,
        status=job.status,
        char_count_original=job.char_count_original,
        char_count_summary=job.char_count_summary,
        document_preview=_compact_text(getattr(job, "input_text", None)),
        source_snippets=_source_snippets(getattr(job, "input_text", None), insights_data),
        sentences_requested=job.sentences_requested,
        length=getattr(job, "length", None),
        tone=getattr(job, "tone", None),
        style=getattr(job, "style", None),
        key_insights=KeyInsights(**insights_data) if isinstance(insights_data, dict) else None,
        action_items=action_items if isinstance(action_items, list) else [],
        created_at=job.created_at,
        completed_at=job.completed_at,
    )
