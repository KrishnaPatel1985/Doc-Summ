import asyncio
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobSummaryResponse, job_to_summary_response
from app.services.extractor import extract_text
from app.services.file_handler import validate_and_save_file
from app.services.summarizer import summarize_text, analyze_document

router = APIRouter()


@router.post("/summarize", response_model=JobSummaryResponse)
async def create_summarize_job(
    file: Optional[UploadFile] = File(None),
    files: list[UploadFile] = File(default=[]),
    text: Optional[str] = Form(None),
    sentences: int = Form(7),
    method: str = Form("gpt-4o-mini"),
    style: str = Form("paragraph"),
    length: str = Form("medium"),
    tone: str = Form("professional"),
    custom_instructions: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # Collect and dedup uploaded files
    seen_names: set[str] = set()
    all_files: list[UploadFile] = []
    for f in ([file] if file and file.filename else []) + list(files):
        if f.filename and f.filename not in seen_names:
            all_files.append(f)
            seen_names.add(f.filename)

    if not all_files and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text input.")

    # Save uploaded files and extract text
    filenames: list[str] = []
    extracted_parts: list[str] = []

    for f in all_files:
        path, ext, name = validate_and_save_file(f)
        filenames.append(name)
        extracted_parts.append(extract_text(path, ext))

    if text:
        extracted_parts.append(text.strip())

    combined_text = "\n\n".join(extracted_parts)
    combined_filename = ", ".join(filenames) if filenames else None
    if combined_filename and len(combined_filename) > 255:
        combined_filename = combined_filename[:250] + "..."

    # Run the styled summary and the document analysis concurrently in threads
    # so the blocking OpenAI calls don't block the event loop.
    summary, analysis = await asyncio.gather(
        asyncio.to_thread(
            summarize_text,
            combined_text,
            sentences_count=sentences,
            style=style,
            custom_instructions=custom_instructions or "",
            length=length,
            tone=tone,
        ),
        asyncio.to_thread(analyze_document, combined_text),
    )

    action_items = analysis.get("action_items", [])

    # Persist job
    job = SummarizationJob(
        id=uuid4(),
        filename=combined_filename,
        file_type=(all_files[0].filename or "").rsplit(".", 1)[-1].lower() if all_files else "text",
        input_text=combined_text,
        summary=summary,
        method=method,
        status="done",
        progress=100,
        char_count_original=len(combined_text),
        char_count_summary=len(summary),
        sentences_requested=sentences,
        length=length,
        tone=tone,
        style=style,
        key_insights=json.dumps(analysis),
        action_items=json.dumps(action_items),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return job_to_summary_response(job)
