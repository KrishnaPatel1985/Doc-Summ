import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import AskRequest, AskResponse, StudyResponse
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
    return AskResponse(answer=answer)


@router.post("/study/{job_id}", response_model=StudyResponse)
async def study_document(job_id: UUID, db: Session = Depends(get_db)):
    """Generate flashcards, quiz, key terms, and an ELI5 explanation."""
    source = _get_source_text(job_id, db)
    study = await asyncio.to_thread(generate_study, source)
    return StudyResponse(**study)
