import fitz          # PyMuPDF
import docx          # python-docx
from fastapi import HTTPException


def extract_text(file_path: str, file_type: str) -> str:
    """Extract plain text from a file. Raises HTTPException if no text found."""
    text = ""
    if file_type == "pdf":
        text = _extract_from_pdf(file_path)
    elif file_type == "docx":
        text = _extract_from_docx(file_path)
    elif file_type == "txt":
        text = _extract_from_txt(file_path)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown file type: {file_type}")

    text = text.strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in this file. It may be a scanned/image-based document."
        )
    return text


def _extract_from_pdf(path: str) -> str:
    doc = fitz.open(path)
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages)


def _extract_from_docx(path: str) -> str:
    document = docx.Document(path)
    return "\n".join(p.text for p in document.paragraphs if p.text.strip())


def _extract_from_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()
