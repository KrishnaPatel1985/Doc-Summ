import os
import uuid
from fastapi import UploadFile, HTTPException
from app.config import settings

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


def validate_and_save_file(file: UploadFile) -> tuple[str, str, str]:
    """Validates file type/size, saves to disk. Returns (path, ext, original_name)."""
    filename = file.filename or "unnamed"
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    
    # Allow if either the extension or the mime type is supported
    is_valid = ext in {"pdf", "txt", "docx"} or file.content_type in ALLOWED_TYPES
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {filename}. Allowed: PDF, TXT, DOCX"
        )

    content = file.file.read()
    size_mb = len(content) / (1024 * 1024)

    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f} MB. Max allowed: {settings.max_file_size_mb} MB"
        )

    resolved_ext = ext if ext in {"pdf", "txt", "docx"} else ALLOWED_TYPES[file.content_type]
    unique_name = f"{uuid.uuid4()}.{resolved_ext}"
    save_path = os.path.join(settings.upload_dir, unique_name)

    os.makedirs(settings.upload_dir, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(content)

    return save_path, resolved_ext, filename
