import asyncio
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.job import CompareResponse
from app.services.extractor import extract_text
from app.services.file_handler import validate_and_save_file
from app.services.summarizer import compare_documents

router = APIRouter()


def _resolve_doc(file: Optional[UploadFile], text: Optional[str], default_name: str) -> tuple[str, str]:
    """Return (extracted_text, display_name) for one comparison input."""
    if file and file.filename:
        path, ext, name = validate_and_save_file(file)
        return extract_text(path, ext).strip(), name
    if text and text.strip():
        return text.strip(), default_name
    return "", default_name


@router.post("/compare", response_model=CompareResponse)
async def compare(
    file_a: Optional[UploadFile] = File(None),
    file_b: Optional[UploadFile] = File(None),
    text_a: Optional[str] = Form(None),
    text_b: Optional[str] = Form(None),
):
    """Compare two documents (each provided as a file or pasted text).

    Stateless in this phase — the comparison is returned directly and not
    persisted. Persistent compare jobs arrive with the Phase 5 data model.
    """
    doc_a_text, doc_a_name = _resolve_doc(file_a, text_a, "Document A")
    doc_b_text, doc_b_name = _resolve_doc(file_b, text_b, "Document B")

    if not doc_a_text:
        raise HTTPException(status_code=400, detail="Document A is empty or unreadable.")
    if not doc_b_text:
        raise HTTPException(status_code=400, detail="Document B is empty or unreadable.")

    result = await asyncio.to_thread(compare_documents, doc_a_text, doc_b_text)
    return CompareResponse(doc_a_name=doc_a_name, doc_b_name=doc_b_name, **result)
