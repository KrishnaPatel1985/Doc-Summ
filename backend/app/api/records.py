import json
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.workspace import QuizResult, ChatMessage
from app.schemas.job import QuizResultCreate, QuizResultItem, ChatMessageItem

router = APIRouter()


@router.post("/quiz-results", response_model=QuizResultItem)
def save_quiz_result(payload: QuizResultCreate, db: Session = Depends(get_db)):
    """Persist a quiz attempt (score + answers) for a document."""
    row = QuizResult(
        id=uuid4(),
        job_id=payload.job_id,
        score=max(0, payload.score),
        total=max(0, payload.total),
        answers_json=json.dumps(payload.answers) if payload.answers is not None else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return QuizResultItem.model_validate(row)


@router.get("/quiz-results/{job_id}", response_model=List[QuizResultItem])
def list_quiz_results(job_id: UUID, db: Session = Depends(get_db)):
    """Return quiz attempts for a document, newest first."""
    rows = (
        db.query(QuizResult)
        .filter(QuizResult.job_id == job_id)
        .order_by(QuizResult.created_at.desc())
        .limit(50)
        .all()
    )
    return [QuizResultItem.model_validate(r) for r in rows]


@router.get("/chat/{job_id}", response_model=List[ChatMessageItem])
def get_chat(job_id: UUID, db: Session = Depends(get_db)):
    """Return the persisted Q&A history for a document, oldest first."""
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == job_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [ChatMessageItem.model_validate(r) for r in rows]
