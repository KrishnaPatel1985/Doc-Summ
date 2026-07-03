import asyncio
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from typing import Optional

from app.db import get_db
from app.models.job import SummarizationJob
from app.models.workspace import ChatMessage
from app.schemas.job import AskRequest, AskResponse, StudyRequest, StudyResponse
from app.services.summarizer import answer_question, generate_study

router = APIRouter()


def _get_source_text(job_id, db: Session) -> str:
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not job.input_text or not job.input_text.strip():
        raise HTTPException(
            status_code=409,
            detail="The original document text isn't available for this item.",
        )
    return job.input_text


@router.post("/ask", response_model=AskResponse)
async def ask_document(payload: AskRequest, db: Session = Depends(get_db)):
    """Answer a question grounded in a document's extracted text."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    source = _get_source_text(payload.job_id, db)
    answer = await asyncio.to_thread(answer_question, source, payload.question)

    # Persist the exchange so the conversation survives reloads (Phase 5).
    db.add(ChatMessage(id=uuid4(), document_id=payload.job_id, role="user", message=payload.question.strip()))
    db.add(ChatMessage(id=uuid4(), document_id=payload.job_id, role="assistant", message=answer))
    db.commit()

    return AskResponse(answer=answer)


@router.post("/study/{job_id}", response_model=StudyResponse)
async def study_document(
    job_id: UUID,
    options: Optional[StudyRequest] = None,
    db: Session = Depends(get_db),
):
    """Generate flashcards, quiz, key terms, and an ELI5 explanation.

    Accepts an optional body to control counts, difficulty, and quiz type.
    """
    opts = options or StudyRequest()
    source = _get_source_text(job_id, db)
    study = await asyncio.to_thread(
        generate_study,
        source,
        opts.flashcard_count,
        opts.quiz_count,
        opts.difficulty,
        opts.quiz_type,
    )
    return StudyResponse(**study)
