import json
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.models.user import User
from app.models.workspace import QuizResult, ChatMessage
from app.schemas.job import QuizResultCreate, QuizResultItem, ChatMessageItem
from app.services.auth import get_optional_current_user

router = APIRouter()


def _assert_document_visible(job_id: UUID, db: Session, current_user: Optional[User]) -> None:
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user:
        if job.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Document not found.")
    elif job.user_id is not None:
        raise HTTPException(status_code=404, detail="Document not found.")


@router.post("/quiz-results", response_model=QuizResultItem)
def save_quiz_result(
    payload: QuizResultCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Persist a quiz attempt (score + answers) for a document."""
    _assert_document_visible(payload.job_id, db, current_user)
    row = QuizResult(
        id=uuid4(),
        user_id=current_user.id if current_user else None,
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
def list_quiz_results(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Return quiz attempts for a document, newest first."""
    _assert_document_visible(job_id, db, current_user)
    query = db.query(QuizResult).filter(QuizResult.job_id == job_id)
    query = query.filter(
        QuizResult.user_id == current_user.id if current_user else QuizResult.user_id.is_(None)
    )
    rows = (
        query
        .order_by(QuizResult.created_at.desc())
        .limit(50)
        .all()
    )
    return [QuizResultItem.model_validate(r) for r in rows]


@router.get("/chat/{job_id}", response_model=List[ChatMessageItem])
def get_chat(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Return the persisted Q&A history for a document, oldest first."""
    _assert_document_visible(job_id, db, current_user)
    query = db.query(ChatMessage).filter(ChatMessage.document_id == job_id)
    query = query.filter(
        ChatMessage.user_id == current_user.id if current_user else ChatMessage.user_id.is_(None)
    )
    rows = (
        query
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [ChatMessageItem.model_validate(r) for r in rows]
