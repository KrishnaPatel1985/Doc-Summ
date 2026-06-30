from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobSummaryResponse, job_to_summary_response

router = APIRouter()


@router.get("/summary/{job_id}", response_model=JobSummaryResponse)
def get_summary(job_id: UUID, db: Session = Depends(get_db)):
    """Return the completed summary for a job."""
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("queued", "processing"):
        raise HTTPException(status_code=202, detail="Job is still processing")
    if job.status == "error":
        raise HTTPException(
            status_code=500,
            detail=job.error_message or "Processing failed"
        )

    return job_to_summary_response(job)
