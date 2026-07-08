from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.models.user import User
from app.models.workspace import ChatMessage, QuizResult
from app.schemas.job import JobHistoryItem, JobSummaryResponse, job_to_summary_response
from app.services.auth import get_optional_current_user

router = APIRouter()


def _delete_related(db: Session, job_ids) -> None:
    """Remove persisted Q&A and quiz attempts tied to the given job ids."""
    if not job_ids:
        return
    db.query(ChatMessage).filter(ChatMessage.document_id.in_(job_ids)).delete(synchronize_session=False)
    db.query(QuizResult).filter(QuizResult.job_id.in_(job_ids)).delete(synchronize_session=False)


def _scope_jobs(query, current_user: Optional[User]):
    if current_user:
        return query.filter(SummarizationJob.user_id == current_user.id)
    return query.filter(SummarizationJob.user_id.is_(None))


def _assert_job_visible(job: SummarizationJob, current_user: Optional[User]) -> None:
    if current_user:
        if job.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Job not found")
    elif job.user_id is not None:
        raise HTTPException(status_code=404, detail="Job not found")


@router.get("/history", response_model=List[JobHistoryItem])
def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Return paginated list of all past summarization jobs."""
    # Only completed summaries appear in history — prepared-only docs
    # (created by /prepare for standalone Study/Ask) are excluded.
    jobs = (
        _scope_jobs(db.query(SummarizationJob), current_user)
        .filter(SummarizationJob.status == "done")
        .order_by(SummarizationJob.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        JobHistoryItem(
            job_id=job.id,
            filename=job.filename,
            summary_snippet=(
                (job.summary[:150] + "...") if job.summary and len(job.summary) > 150
                else job.summary
            ),
            status=job.status,
            created_at=job.created_at,
        )
        for job in jobs
    ]


@router.get("/history/{job_id}", response_model=JobSummaryResponse)
def get_history_item(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Return a specific past job by ID."""
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _assert_job_visible(job, current_user)

    return job_to_summary_response(job)


@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Delete every completed summary shown in history, plus its related records."""
    job_ids = [
        row.id
        for row in _scope_jobs(db.query(SummarizationJob.id), current_user)
        .filter(SummarizationJob.status == "done")
        .all()
    ]
    if job_ids:
        _delete_related(db, job_ids)
        db.query(SummarizationJob).filter(
            SummarizationJob.id.in_(job_ids)
        ).delete(synchronize_session=False)
        db.commit()
    return {"deleted": len(job_ids)}


@router.delete("/history/{job_id}")
def delete_history_item(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Delete a single past job by ID, plus its related records."""
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _assert_job_visible(job, current_user)
    _delete_related(db, [job_id])
    db.delete(job)
    db.commit()
    return {"deleted": 1}
