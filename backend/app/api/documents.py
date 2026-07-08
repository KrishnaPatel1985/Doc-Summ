from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.models.user import User
from app.schemas.job import PrepareResponse, _full_text
from app.services.extractor import extract_text
from app.services.file_handler import validate_and_save_file
from app.services.auth import get_optional_current_user

router = APIRouter()


@router.post("/prepare", response_model=PrepareResponse)
async def prepare_document(
    file: Optional[UploadFile] = File(None),
    files: list[UploadFile] = File(default=[]),
    text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Extract and store a document's text without generating a summary.

    Returns a job_id that Study Mode and Ask Document use directly, so those
    workflows no longer require summarizing first. No LLM call is made here.
    """
    seen_names: set[str] = set()
    all_files: list[UploadFile] = []
    for f in ([file] if file and file.filename else []) + list(files):
        if f.filename and f.filename not in seen_names:
            all_files.append(f)
            seen_names.add(f.filename)

    if not all_files and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text input.")

    filenames: list[str] = []
    extracted_parts: list[str] = []
    for f in all_files:
        path, ext, name = validate_and_save_file(f)
        filenames.append(name)
        extracted_parts.append(extract_text(path, ext))

    if text:
        extracted_parts.append(text.strip())

    combined_text = "\n\n".join(extracted_parts).strip()
    if not combined_text:
        raise HTTPException(status_code=400, detail="No readable text found in the input.")

    combined_filename = ", ".join(filenames) if filenames else None
    if combined_filename and len(combined_filename) > 255:
        combined_filename = combined_filename[:250] + "..."

    job = SummarizationJob(
        id=uuid4(),
        user_id=current_user.id if current_user else None,
        filename=combined_filename,
        file_type=(all_files[0].filename or "").rsplit(".", 1)[-1].lower() if all_files else "text",
        input_text=combined_text,
        summary=None,
        method="prepared",
        status="ready",
        progress=100,
        char_count_original=len(combined_text),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return PrepareResponse(
        job_id=job.id,
        filename=job.filename,
        file_type=job.file_type,
        char_count_original=job.char_count_original,
        document_preview=_full_text(job.input_text),
        status=job.status,
    )
