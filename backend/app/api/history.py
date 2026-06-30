from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobHistoryItem, JobSummaryResponse, job_to_summary_response

router = APIRouter()


@router.get("/history", response_model=List[JobHistoryItem])
def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return paginated list of all past summarization jobs."""
    jobs = (
        db.query(SummarizationJob)
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
def get_history_item(job_id: UUID, db: Session = Depends(get_db)):
    """Return a specific past job by ID."""
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job_to_summary_response(job)
