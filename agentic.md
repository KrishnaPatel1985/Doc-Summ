# Agentic Implementation Plan
## PDF & Text Summarizer -- Full-Stack Application
### Phased Build Guide for Local Windows Deployment

---

> **How to use this file**
> Each phase is a self-contained unit of work. Complete every task inside a phase
> before moving to the next. Tasks are ordered by dependency. Each task includes:
> goal, exact commands or code to write, files to create/modify, and a done-check.

---

## PHASE OVERVIEW

| Phase | Name                          | Output                                      | Effort  |
|-------|-------------------------------|---------------------------------------------|---------|
| 0     | Environment & Project Setup   | All software installed, monorepo scaffolded | ~30 min |
| 1     | Database Layer                | PostgreSQL running, schema migrated         | ~20 min |
| 2     | Backend Core                  | FastAPI app boots, DB connected             | ~30 min |
| 3     | Backend Services              | Text extraction + summarization working     | ~45 min |
| 4     | Backend API Routes            | All endpoints live and testable             | ~40 min |
| 5     | Frontend Foundation           | Vite/React/TS project, design system ready  | ~30 min |
| 6     | Frontend Components           | All UI components built                     | ~60 min |
| 7     | Frontend-Backend Integration  | SSE progress, full flow working end-to-end  | ~40 min |
| 8     | Error Handling & Validation   | All edge cases handled gracefully           | ~30 min |
| 9     | History Feature               | History panel and detail view working       | ~30 min |
| 10    | Polish & Final QA             | App meets all acceptance criteria           | ~30 min |

---
---

# PHASE 0 -- Environment & Project Setup

**Goal:** Install all required system software, create the monorepo folder structure,
and initialize both the frontend and backend projects so both can boot.

---

## Task 0.1 -- Install Node.js (if not already installed)

**What:** Install Node.js 18 LTS, which is needed to run the React/Vite frontend.

**Commands:**
```powershell
# Check if already installed
node --version

# If not installed, run:
winget install OpenJS.NodeJS.LTS

# Verify after install
node --version   # should print v18.x.x or higher
npm --version
```

**Done check:** `node --version` prints `v18.x.x` or higher.

---

## Task 0.2 -- Install Python (if not already installed)

**What:** Install Python 3.11+, which is needed to run the FastAPI backend.

**Commands:**
```powershell
# Check if already installed
python --version

# If not installed:
winget install Python.Python.3.11

# Restart PowerShell, then verify
python --version   # should print Python 3.11.x or higher
pip --version
```

**Done check:** `python --version` prints `Python 3.11.x` or higher.

---

## Task 0.3 -- Install PostgreSQL 16

**What:** Install PostgreSQL locally. This is the database for all jobs and summaries.

**Steps:**
1. Download installer from: https://www.postgresql.org/download/windows/
2. Run with these settings:
   - Port: `5432` (default)
   - Superuser password: choose and remember it (e.g. `postgres123`)
   - Install pgAdmin: **Yes**
3. Verify PostgreSQL is running:

```powershell
psql --version
# If not on PATH, add: C:\Program Files\PostgreSQL\16\bin
```

**Done check:** `psql --version` prints `psql (PostgreSQL) 16.x`.

---

## Task 0.4 -- Create the Monorepo Folder Structure

**What:** Create the top-level project directory and all subdirectories.

**Commands:**
```powershell
cd C:\Users\Admin\Downloads\summary

mkdir backend
mkdir backend\app
mkdir backend\app\api
mkdir backend\app\services
mkdir backend\app\models
mkdir backend\app\schemas
mkdir frontend

tree /F
```

**Done check:** `tree` shows `backend/` and `frontend/` directories.

---

## Task 0.5 -- Initialize the Python Backend Project

**What:** Create a Python virtual environment and install all dependencies.

**File to create:** `backend/requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
python-multipart==0.0.9
PyMuPDF==1.24.3
pdfminer.six==20221105
python-docx==1.1.2
sumy==0.11.0
nltk==3.8.1
python-dotenv==1.0.1
sse-starlette==2.1.0
pydantic==2.7.1
pydantic-settings==2.2.1
```

**Commands:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"
cd ..
```

**Done check:** `pip list` shows fastapi, sqlalchemy, PyMuPDF, sumy all installed.

---

## Task 0.6 -- Initialize the Frontend Project (Vite + React + TypeScript)

**What:** Scaffold the React TypeScript frontend using Vite.

**Commands:**
```powershell
cd frontend
npx -y create-vite@latest . --template react-ts
npm install
npm install axios
npm run dev
# Press Ctrl+C to stop
cd ..
```

**Done check:** `npm run dev` starts a dev server (default port will be changed to 3000 in Phase 5).

---

## Task 0.7 -- Create the .env File for Backend

**File to create:** `backend/.env`
```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/summarizer_db
MAX_FILE_SIZE_MB=20
SUMMARIZATION_METHOD=sumy
FRONTEND_ORIGIN=http://localhost:3000
```

**File to create:** `backend/.env.example`
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/summarizer_db
MAX_FILE_SIZE_MB=20
SUMMARIZATION_METHOD=sumy
FRONTEND_ORIGIN=http://localhost:3000
```

> Replace `postgres123` with whatever password you set during PostgreSQL install.

**Done check:** Both `.env` and `.env.example` files exist in `backend/`.

---

## Task 0.8 -- Create .gitignore

**File to create:** `.gitignore` (root)
```
backend/venv/
backend/__pycache__/
backend/.env
backend/uploads/
frontend/node_modules/
frontend/dist/
*.pyc
.DS_Store
```

**Done check:** `.gitignore` exists at the project root.


---
---

# PHASE 1 -- Database Layer

**Goal:** Create the PostgreSQL database, define the SQLAlchemy model,
initialize Alembic, and run the first migration so the `summarization_jobs`
table exists and is ready to use.

---

## Task 1.1 -- Create the PostgreSQL Database

**What:** Connect to PostgreSQL and create the app database.

**SQL to run (in pgAdmin or psql):**
```sql
CREATE DATABASE summarizer_db;
CREATE USER summarizer_user WITH PASSWORD 'summarizer_pass';
GRANT ALL PRIVILEGES ON DATABASE summarizer_db TO summarizer_user;
```

**PowerShell alternative:**
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE summarizer_db;"
```

**Done check:** `summarizer_db` appears in pgAdmin or `\l` in psql.

---

## Task 1.2 -- Create the Database Connection Module

**What:** Write the SQLAlchemy engine and session factory.

**File to create:** `backend/app/db.py`
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/summarizer_db")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    """FastAPI dependency: yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Done check:** `python -c "from app.db import Base"` runs without error.

---

## Task 1.3 -- Define the SQLAlchemy ORM Model

**What:** Create the `SummarizationJob` model mapping to the DB table.

**File to create:** `backend/app/models/job.py`
```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base

class SummarizationJob(Base):
    __tablename__ = "summarization_jobs"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename            = Column(String(255), nullable=True)
    file_type           = Column(String(10), nullable=True)
    input_text          = Column(Text, nullable=True)
    summary             = Column(Text, nullable=True)
    method              = Column(String(50), default="sumy")
    status              = Column(String(20), default="queued")
    progress            = Column(Integer, default=0)
    error_message       = Column(Text, nullable=True)
    char_count_original = Column(Integer, nullable=True)
    char_count_summary  = Column(Integer, nullable=True)
    sentences_requested = Column(Integer, default=7)
    created_at          = Column(DateTime, default=datetime.utcnow)
    completed_at        = Column(DateTime, nullable=True)
```

**File to create:** `backend/app/models/__init__.py`
```python
from .job import SummarizationJob
```

**Done check:** `python -c "from app.models.job import SummarizationJob; print('OK')"` prints `OK`.

---

## Task 1.4 -- Initialize Alembic and Create First Migration

**What:** Set up Alembic for DB migrations and create the initial table.

**Commands:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
alembic init alembic
```

**Edit `backend/alembic/env.py`** -- replace the metadata section with:
```python
import os
from dotenv import load_dotenv
from app.db import Base
from app.models import job  # noqa: F401 -- registers model

load_dotenv()
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))
target_metadata = Base.metadata
```

**Commands (continued):**
```powershell
alembic revision --autogenerate -m "create summarization_jobs table"
alembic upgrade head
cd ..
```

**Done check:** `alembic current` shows `head`. Table visible in pgAdmin.

---

## Task 1.5 -- Create Pydantic Schemas

**What:** Define request/response Pydantic schemas for FastAPI routes.

**File to create:** `backend/app/schemas/job.py`
```python
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class JobCreateResponse(BaseModel):
    job_id: UUID
    status: str

class JobSummaryResponse(BaseModel):
    job_id: UUID
    filename: Optional[str]
    summary: Optional[str]
    method: str
    status: str
    char_count_original: Optional[int]
    char_count_summary: Optional[int]
    sentences_requested: int
    created_at: datetime
    completed_at: Optional[datetime]
    model_config = {"from_attributes": True}

class JobHistoryItem(BaseModel):
    job_id: UUID
    filename: Optional[str]
    summary_snippet: Optional[str]
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}
```

**File to create:** `backend/app/schemas/__init__.py`
```python
from .job import JobCreateResponse, JobSummaryResponse, JobHistoryItem
```

**Done check:** `python -c "from app.schemas import JobCreateResponse; print('OK')"` prints `OK`.


---
---

# PHASE 2 -- Backend Core

**Goal:** Create the main FastAPI application file, configure CORS, configure
settings, create the uploads directory, and verify the server boots cleanly.

---

## Task 2.1 -- Create the Settings / Config Module

**What:** Use pydantic-settings to load and validate all env vars in one place.

**File to create:** `backend/app/config.py`
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/summarizer_db"
    max_file_size_mb: int = 20
    summarization_method: str = "sumy"
    frontend_origin: str = "http://localhost:3000"
    upload_dir: str = "uploads"
    model_config = {"env_file": ".env"}

settings = Settings()
```

**Done check:** `python -c "from app.config import settings; print(settings.database_url)"` prints your DB URL.

---

## Task 2.2 -- Create the FastAPI Application Entry Point

**What:** Create `main.py` -- the app entry point with CORS, routers, and startup logic.

**File to create:** `backend/main.py`
```python
import os
import nltk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import engine, Base

def download_nltk_data():
    for resource in ["punkt", "stopwords", "punkt_tab"]:
        try:
            nltk.data.find(f"tokenizers/{resource}")
        except LookupError:
            nltk.download(resource, quiet=True)

os.makedirs(settings.upload_dir, exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Document Summarizer API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    download_nltk_data()

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Routers added in Phase 4
```

**Commands:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Done check:** `http://localhost:8000/health` returns `{"status":"ok"}`. Swagger at `/docs`.

---

## Task 2.3 -- Create the File Handler Utility

**What:** Utility to validate file type/size and save uploads to disk.

**File to create:** `backend/app/services/file_handler.py`
```python
import os, uuid
from fastapi import UploadFile, HTTPException
from app.config import settings

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

def validate_and_save_file(file: UploadFile) -> tuple[str, str, str]:
    """Validates file type/size, saves to disk. Returns (path, ext, original_name)."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, TXT, DOCX")
    content = file.file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(status_code=413,
            detail=f"File too large: {size_mb:.1f} MB. Max: {settings.max_file_size_mb} MB")
    ext = ALLOWED_TYPES[file.content_type]
    unique_name = f"{uuid.uuid4()}.{ext}"
    save_path = os.path.join(settings.upload_dir, unique_name)
    with open(save_path, "wb") as f:
        f.write(content)
    return save_path, ext, file.filename or "unnamed"
```

**Done check:** File exists with no syntax errors.


---
---

# PHASE 3 -- Backend Services

**Goal:** Build the two core processing services -- text extraction and summarization.

---

## Task 3.1 -- Build the Text Extraction Service

**What:** Extract plain text from PDF, DOCX, or TXT files.

**File to create:** `backend/app/services/extractor.py`
```python
import fitz          # PyMuPDF
import docx          # python-docx
from fastapi import HTTPException

def extract_text(file_path: str, file_type: str) -> str:
    """Extract plain text. Raises HTTPException if no text found."""
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
        raise HTTPException(status_code=422,
            detail="No extractable text found. File may be scanned/image-based.")
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
```

**Done check:** `python -c "from app.services.extractor import extract_text; print('OK')"` prints `OK`.

---

## Task 3.2 -- Build the Summarization Service

**What:** Summarize a plain text string using `sumy` LexRank algorithm.

**File to create:** `backend/app/services/summarizer.py`
```python
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

LANGUAGE = "english"

def summarize_text(text: str, sentences_count: int = 7, method: str = "lexrank") -> str:
    """Summarize text using sumy. Returns summary string."""
    if len(text.split()) < 30:
        return text.strip()
    parser = PlaintextParser.from_string(text, Tokenizer(LANGUAGE))
    stemmer = Stemmer(LANGUAGE)
    stop_words = get_stop_words(LANGUAGE)
    if method == "lsa":
        summarizer = LsaSummarizer(stemmer)
    else:
        summarizer = LexRankSummarizer(stemmer)
    summarizer.stop_words = stop_words
    doc_sentences = len(list(parser.document.sentences))
    actual_count = min(sentences_count, max(1, doc_sentences - 1))
    summary_sentences = summarizer(parser.document, actual_count)
    return " ".join(str(s) for s in summary_sentences)
```

**Done check:**
```powershell
python -c "
from app.services.summarizer import summarize_text
sample = 'Natural language processing is a subfield of AI. ' * 20
result = summarize_text(sample, sentences_count=3)
print('OK:', result[:80])
"
```

---

## Task 3.3 -- Build the Job Processing Pipeline

**What:** Async pipeline that orchestrates extraction, summarization, and DB updates.
Maintains an in-memory `job_progress` dict for the SSE endpoint to read.

**File to create:** `backend/app/services/processor.py`
```python
import asyncio
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.job import SummarizationJob
from app.services.extractor import extract_text
from app.services.summarizer import summarize_text

# In-memory progress store: job_id (str) -> progress dict
job_progress: dict[str, dict] = {}

async def process_job(job_id: UUID, db: Session, file_path, file_type, raw_text, sentences, method):
    """Full async pipeline: extract -> summarize -> save. Updates job_progress for SSE."""
    jid = str(job_id)
    job_progress[jid] = {"progress": 0, "stage": "Starting...", "error": None, "done": False}
    db_job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not db_job:
        job_progress[jid] = {"progress": 0, "stage": "Not found", "error": "not_found", "done": True}
        return
    try:
        _update(db, db_job, jid, 10, "processing", "Upload received...")
        await asyncio.sleep(0.3)
        _update(db, db_job, jid, 20, "processing", "Validating input...")
        await asyncio.sleep(0.2)
        _update(db, db_job, jid, 35, "processing", "Extracting text...")
        text = extract_text(file_path, file_type) if file_path else raw_text.strip()
        await asyncio.sleep(0.2)
        _update(db, db_job, jid, 50, "processing", "Pre-processing text...")
        db_job.input_text = text
        db_job.char_count_original = len(text)
        db.commit()
        await asyncio.sleep(0.3)
        _update(db, db_job, jid, 65, "processing", "Summarizing...")
        summary = summarize_text(text, sentences_count=sentences, method=method)
        await asyncio.sleep(0.2)
        _update(db, db_job, jid, 85, "processing", "Finalizing...")
        db_job.summary = summary
        db_job.char_count_summary = len(summary)
        db.commit()
        await asyncio.sleep(0.2)
        _update(db, db_job, jid, 95, "processing", "Saving to database...")
        db_job.status = "done"
        db_job.progress = 100
        db_job.completed_at = datetime.utcnow()
        db.commit()
        job_progress[jid] = {"progress": 100, "stage": "Done", "summary": summary, "error": None, "done": True}
    except Exception as e:
        db_job.status = "error"
        db_job.error_message = str(e)
        db.commit()
        job_progress[jid] = {"progress": db_job.progress, "stage": "Failed", "error": str(e), "done": True}

def _update(db, db_job, jid, progress, status, stage):
    db_job.progress = progress
    db_job.status = status
    db.commit()
    job_progress[jid] = {"progress": progress, "stage": stage, "error": None, "done": False}
```

**Done check:** `python -c "from app.services.processor import process_job; print('OK')"` prints `OK`.


---
---

# PHASE 4 -- Backend API Routes

**Goal:** Implement all API endpoints and verify each works via Swagger UI.

---

## Task 4.1 -- POST /api/summarize Route

**What:** Accept file or raw text, create a DB job, launch background processing, return job_id.

**File to create:** `backend/app/api/summarize.py`
```python
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobCreateResponse
from app.services.file_handler import validate_and_save_file
from app.services.processor import process_job

router = APIRouter()

@router.post("/summarize", response_model=JobCreateResponse, status_code=202)
async def create_summarize_job(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    sentences: int = Form(7),
    method: str = Form("lexrank"),
    db: Session = Depends(get_db),
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text input.")
    job_id = uuid4()
    file_path = file_type = filename = None
    if file and file.filename:
        file_path, file_type, filename = validate_and_save_file(file)
    job = SummarizationJob(id=job_id, filename=filename, file_type=file_type or "text",
                           sentences_requested=sentences, method=method,
                           status="queued", progress=0)
    db.add(job)
    db.commit()
    background_tasks.add_task(process_job, job_id=job_id, db=db, file_path=file_path,
                              file_type=file_type, raw_text=text, sentences=sentences, method=method)
    return JobCreateResponse(job_id=job_id, status="queued")
```

**Done check:** `POST /api/summarize` with a text field returns `{"job_id":"...","status":"queued"}`.

---

## Task 4.2 -- GET /api/progress/{job_id} SSE Route

**What:** Stream Server-Sent Events (progress updates every 500ms) until job completes.

**File to create:** `backend/app/api/progress.py`
```python
import asyncio, json
from uuid import UUID
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from app.services.processor import job_progress

router = APIRouter()

@router.get("/progress/{job_id}")
async def stream_progress(job_id: UUID):
    jid = str(job_id)

    async def event_generator():
        for _ in range(20):   # wait up to 5s for job to appear
            if jid in job_progress: break
            await asyncio.sleep(0.25)
        while True:
            state = job_progress.get(jid, {"progress": 0, "stage": "Waiting...", "error": None, "done": False})
            yield {"event": "progress", "data": json.dumps({
                "progress": state.get("progress", 0),
                "stage": state.get("stage", ""),
                "error": state.get("error"),
                "done": state.get("done", False),
                "summary": state.get("summary"),
            })}
            if state.get("done"):
                job_progress.pop(jid, None)
                break
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
```

**Done check:** SSE stream returns events when you open `/api/progress/{job_id}` in browser.

---

## Task 4.3 -- GET /api/summary/{job_id} Route

**What:** Return the completed summary for a job from the database.

**File to create:** `backend/app/api/summary.py`
```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobSummaryResponse

router = APIRouter()

@router.get("/summary/{job_id}", response_model=JobSummaryResponse)
def get_summary(job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("queued", "processing"): raise HTTPException(status_code=202, detail="Still processing")
    if job.status == "error": raise HTTPException(status_code=500, detail=job.error_message or "Failed")
    return JobSummaryResponse(job_id=job.id, filename=job.filename, summary=job.summary,
        method=job.method, status=job.status, char_count_original=job.char_count_original,
        char_count_summary=job.char_count_summary, sentences_requested=job.sentences_requested,
        created_at=job.created_at, completed_at=job.completed_at)
```

**Done check:** `GET /api/summary/{done_job_id}` returns the full summary JSON.

---

## Task 4.4 -- GET /api/history Route

**What:** Return paginated list of all past jobs; also support fetching a single job by ID.

**File to create:** `backend/app/api/history.py`
```python
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.job import SummarizationJob
from app.schemas.job import JobHistoryItem, JobSummaryResponse

router = APIRouter()

@router.get("/history", response_model=List[JobHistoryItem])
def get_history(skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    jobs = db.query(SummarizationJob).order_by(SummarizationJob.created_at.desc()).offset(skip).limit(limit).all()
    return [JobHistoryItem(job_id=j.id, filename=j.filename,
        summary_snippet=(j.summary[:150] + "...") if j.summary and len(j.summary) > 150 else j.summary,
        status=j.status, created_at=j.created_at) for j in jobs]

@router.get("/history/{job_id}", response_model=JobSummaryResponse)
def get_history_item(job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(SummarizationJob).filter(SummarizationJob.id == job_id).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    return JobSummaryResponse(job_id=job.id, filename=job.filename, summary=job.summary,
        method=job.method, status=job.status, char_count_original=job.char_count_original,
        char_count_summary=job.char_count_summary, sentences_requested=job.sentences_requested,
        created_at=job.created_at, completed_at=job.completed_at)
```

**Done check:** `GET /api/history` returns a JSON array.

---

## Task 4.5 -- Register All Routers in main.py

**What:** Wire all route modules into the FastAPI app with the `/api` prefix.

**Add to `backend/main.py`:**
```python
from app.api.summarize import router as summarize_router
from app.api.progress  import router as progress_router
from app.api.summary   import router as summary_router
from app.api.history   import router as history_router

app.include_router(summarize_router, prefix="/api", tags=["Summarize"])
app.include_router(progress_router,  prefix="/api", tags=["Progress"])
app.include_router(summary_router,   prefix="/api", tags=["Summary"])
app.include_router(history_router,   prefix="/api", tags=["History"])
```

**Done check:** `http://localhost:8000/docs` shows all 6+ routes listed.

---

## Task 4.6 -- End-to-End Backend Smoke Test

**What:** Run a script that tests the full pipeline without the frontend.

**File to create:** `backend/test_smoke.py`
```python
import requests, time
BASE = "http://localhost:8000"

r = requests.get(f"{BASE}/health")
assert r.status_code == 200; print("Health OK")

r = requests.post(f"{BASE}/api/summarize", data={
    "text": "Artificial intelligence is transforming industries. " * 30,
    "sentences": "5", "method": "lexrank"})
assert r.status_code == 202
job_id = r.json()["job_id"]; print(f"Job created: {job_id}")

time.sleep(6)

r = requests.get(f"{BASE}/api/summary/{job_id}")
assert r.status_code == 200
data = r.json()
assert data["summary"]; print(f"Summary OK ({data['char_count_summary']} chars)")

r = requests.get(f"{BASE}/api/history")
assert r.status_code == 200 and len(r.json()) >= 1; print(f"History OK ({len(r.json())} items)")

print("\nAll backend smoke tests passed!")
```

```powershell
# With backend running in another terminal:
python test_smoke.py
```

**Done check:** Script prints `All backend smoke tests passed!`


---
---

# PHASE 5 -- Frontend Foundation

**Goal:** Configure Vite (port + proxy), establish the CSS design system,
set up TypeScript types, and create the API client module.

---

## Task 5.1 -- Configure Vite (Port 3000 + API Proxy)

**File to modify:** `frontend/vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
```

**Done check:** `npm run dev` starts on `http://localhost:3000`.

---

## Task 5.2 -- Define Global CSS Design System

**What:** Set up CSS custom properties for colors, typography, spacing, shadows, animations.

**File to overwrite:** `frontend/src/index.css`

Key design tokens to define:
```css
/* Color palette */
--color-bg:           #0d0f14;   /* deep dark background */
--color-surface:      #161a24;   /* card surfaces */
--color-surface-2:    #1e2433;   /* hover states */
--color-border:       #2a3044;   /* subtle borders */
--color-primary:      #5b6af0;   /* indigo accent */
--color-success:      #22c55e;   /* green (done state) */
--color-error:        #ef4444;   /* red (error state) */
--color-text:         #e2e8f0;   /* primary text */
--color-text-muted:   #8892a4;   /* secondary text */

/* Typography */
font-family: 'Inter', system-ui, sans-serif;  /* from Google Fonts */

/* Animations */
@keyframes fadeInUp  { from opacity:0 translateY(16px); to opacity:1 translateY(0) }
@keyframes spin      { to transform: rotate(360deg) }
@keyframes pulse-border { border pulses with primary color glow }
```

Also define utility classes: `.card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.spinner`, `.animate-fade-in`

**Done check:** App renders with dark background (#0d0f14) and Inter font.

---

## Task 5.3 -- Set Up TypeScript Types

**File to create:** `frontend/src/types/index.ts`
```typescript
export type JobStatus = 'idle' | 'queued' | 'processing' | 'done' | 'error';

export interface ProgressEvent {
  progress: number;
  stage: string;
  error: string | null;
  done: boolean;
  summary?: string;
}

export interface SummaryResponse {
  job_id: string;
  filename: string | null;
  summary: string | null;
  method: string;
  status: string;
  char_count_original: number | null;
  char_count_summary: number | null;
  sentences_requested: number;
  created_at: string;
  completed_at: string | null;
}

export interface HistoryItem {
  job_id: string;
  filename: string | null;
  summary_snippet: string | null;
  status: string;
  created_at: string;
}
```

**Done check:** TypeScript compiles without errors when importing types.

---

## Task 5.4 -- Create the API Client Module

**File to create:** `frontend/src/api/client.ts`

Functions to implement:
- `submitSummarizeJob(file, text, sentences, method)` -- POST multipart/form-data
- `connectProgressSSE(jobId, onProgress, onError)` -- returns EventSource
- `fetchSummary(jobId)` -- GET /api/summary/{id}
- `fetchHistory(skip, limit)` -- GET /api/history
- `fetchHistoryItem(jobId)` -- GET /api/history/{id}

Also add an Axios response interceptor to normalize all error messages to a human-readable string.

**Done check:** TypeScript compiles without errors on this file.


---
---

# PHASE 6 -- Frontend Components

**Goal:** Build all four main UI components as standalone, fully styled React components.

---

## Task 6.1 -- Build UploadArea Component

**File to create:** `frontend/src/components/UploadArea.tsx`

**Props:**
```typescript
interface UploadAreaProps {
  onSubmit: (file: File | null, text: string | null, sentences: number) => void;
}
```

**Behaviors to implement:**
- Drag-and-drop: `onDragOver` adds highlight class; `onDrop` reads the file
- Hidden `<input type='file'>` triggered by Browse button
- Client-side validation: check file type + size before any upload
- Error banner (red) if validation fails
- File preview card when file selected: name, size, type, Remove button
- Textarea for raw text input with live character + word counter
- Upload zone and textarea are mutually exclusive (one dims when other is active)
- Sentence count control: number display with `+` / `-` buttons, clamped 1-20
- Submit button: disabled unless file or non-empty text is present

**Done check:** File can be selected (or dragged), textarea works, button enables only when input exists.

---

## Task 6.2 -- Build ProgressBar Component

**File to create:** `frontend/src/components/ProgressBar.tsx`

**Props:**
```typescript
interface ProgressBarProps {
  progress: number;                            // 0-100
  stage: string;                               // current stage label
  status: 'processing' | 'done' | 'error';
  filename?: string;
  onCancel?: () => void;
}
```

**Behaviors:**
- Bar fill width: `{progress}%` with CSS `transition: width 0.4s ease`
- Fill color by status:
  - `processing` = `var(--color-primary)` (indigo)
  - `done`       = `var(--color-success)` (green)
  - `error`      = `var(--color-error)` (red)
- Show spinner icon while processing
- Show checkmark icon when done
- Show X icon when error
- Percentage label updates in real time
- Cancel button triggers `onCancel()`

**Done check:** Bar renders and fills smoothly from 0 to a given percentage value.

---

## Task 6.3 -- Build SummaryCard Component

**File to create:** `frontend/src/components/SummaryCard.tsx`

**Props:**
```typescript
interface SummaryCardProps {
  summary: SummaryResponse;
  onReset: () => void;
}
```

**Behaviors:**
- Card fades in with `animate-fade-in` CSS class
- Metadata row: filename, date, method, original chars vs summary chars
- Summary text in a readable block (line-height 1.8)
- **Copy button:** `navigator.clipboard.writeText(summary.summary)` -- shows 'Copied!' for 2s
- **Download button:** creates a Blob URL, triggers anchor `download` click
- **Summarize Another button:** calls `onReset()` to return to idle

**Done check:** Summary card renders, copy works, download creates a .txt file.

---

## Task 6.4 -- Build HistoryPanel Component

**File to create:** `frontend/src/components/HistoryPanel.tsx`

**Props:**
```typescript
interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (jobId: string) => void;
  refreshTrigger: number;
}
```

**Behaviors:**
- Slides in from left with CSS transform transition
- Fetches history on open (`useEffect` on `isOpen` + `refreshTrigger`)
- Client-side search filters items by filename
- Each item: filename (or 'Text input'), date, status badge, snippet
- Clicking an item calls `onSelectJob(job_id)`
- Load More button: increments `skip` by 10, fetches next page, appends to list
- Backdrop overlay closes panel on click

**Done check:** Panel opens/closes with animation; history items render and are clickable.

---

## Task 6.5 -- Build Header Component

**File to create:** `frontend/src/components/Header.tsx`

**Props:**
```typescript
interface HeaderProps {
  onHistoryToggle: () => void;
  historyOpen: boolean;
}
```

Renders: logo icon, 'Document Summarizer' title, History toggle button.
History button shows caret direction based on `historyOpen` state.

**Done check:** Header renders correctly at top of page.


---
---

# PHASE 7 -- Frontend-Backend Integration

**Goal:** Wire all components in `App.tsx`, connect the SSE stream, and verify
the complete user journey works end-to-end.

---

## Task 7.1 -- Build App.tsx State Machine

**File to overwrite:** `frontend/src/App.tsx`

**State variables:**
```typescript
const [status, setStatus]           = useState<JobStatus>('idle');
const [jobId, setJobId]             = useState<string | null>(null);
const [progress, setProgress]       = useState(0);
const [stage, setStage]             = useState('');
const [summary, setSummary]         = useState<SummaryResponse | null>(null);
const [error, setError]             = useState<string | null>(null);
const [historyOpen, setHistoryOpen] = useState(false);
const [refreshTrigger, setRefreshTrigger] = useState(0);
const sseRef = useRef<EventSource | null>(null);
```

**State machine transitions:**
```
idle ----[submit]----> processing ----[SSE done]----> done
                            |
                       [SSE error]
                            |
                           error
done / error --[reset]--> idle
```

**Key handlers:**
- `handleSubmit(file, text, sentences)`: POST to /api/summarize, open SSE
- `onProgress(event)`: update progress + stage; on done fetch summary; on error show error
- `handleReset()`: close SSE, clear all state
- `handleHistorySelect(jobId)`: fetch history item, show as summary view

**Render logic:**
```tsx
{status === 'idle' && <UploadArea onSubmit={handleSubmit} />}
{(status === 'processing' || status === 'error') &&
  <ProgressBar progress={progress} stage={stage} status={status} onCancel={handleReset} />}
{status === 'done' && summary &&
  <SummaryCard summary={summary} onReset={handleReset} />}
```

**Done check:** Text input -> Summarize -> progress bar fills -> summary card appears.

---

## Task 7.2 -- Update index.html Meta Tags

**File to modify:** `frontend/index.html`
```html
<title>Document Summarizer -- Summarize PDFs & Text Instantly</title>
<meta name='description' content='Upload any PDF or text and get an AI-generated summary. Real-time progress tracking included.' />
<meta name='theme-color' content='#0d0f14' />
```

**Done check:** Browser tab shows correct title.

---

## Task 7.3 -- Full Flow Manual Integration Test

**Checklist:**
```
[ ] 1.  Backend running on port 8000
[ ] 2.  Frontend running on port 3000
[ ] 3.  Open http://localhost:3000
[ ] 4.  Paste text -> Summarize button enables
[ ] 5.  Click Summarize -> progress bar appears
[ ] 6.  Progress fills 10% -> 35% -> 50% -> 65% -> 85% -> 95% -> 100%
[ ] 7.  Summary card appears below
[ ] 8.  Copy to Clipboard works
[ ] 9.  Download .txt works
[ ] 10. Summarize Another resets to idle
[ ] 11. Upload a real PDF -> full flow works
[ ] 12. pgAdmin shows new row in summarization_jobs table
```

**Done check:** All 12 checklist items verified.


---
---

# PHASE 8 -- Error Handling & Validation

**Goal:** Make every failure mode graceful with clear, actionable error messages.

---

## Task 8.1 -- Frontend: Client-Side File Validation

**Add to `UploadArea.tsx`:**
```typescript
const ALLOWED_TYPES = ['application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return `Unsupported file type. Use PDF, TXT, or DOCX.`;
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > 20)
    return `File too large: ${sizeMB.toFixed(1)} MB. Maximum is 20 MB.`;
  return null;
}
```

On file selection: call `validateFile()`. If non-null, show error banner. Block submit.

**Done check:** Dropping a `.jpg` shows error banner without making any API call.

---

## Task 8.2 -- Backend: Global Exception Handlers

**Add to `backend/main.py`:**
```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation error", "details": exc.errors()})

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})
```

**Done check:** All backend errors return `{"error": "..."}` JSON, not HTML.

---

## Task 8.3 -- Frontend: Axios Error Interceptor

**Add to `frontend/src/api/client.ts`:**
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail
      || error.response?.data?.error
      || error.message
      || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
```

**Done check:** API errors surface a human-readable message in the UI error banner.

---

## Task 8.4 -- Handle SSE Connection Drops

**In `client.ts` `connectProgressSSE`:**
```typescript
sse.onerror = () => {
  sse.close();
  onError(new Event('SSE connection lost. The server may have restarted.'));
};
```

**In `App.tsx` `onSseError` handler:**
```typescript
const onSseError = () => {
  setStatus('error');
  setError('Lost connection to server. Please try again.');
};
```

**Done check:** Stopping backend mid-run shows error state in the UI.


---
---

# PHASE 9 -- History Feature

**Goal:** Fully integrate the History panel so users can browse and re-view all past jobs.

---

## Task 9.1 -- Wire HistoryPanel into App.tsx

**Add to `App.tsx`:**
```typescript
const handleHistorySelect = async (jobId: string) => {
  try {
    const data = await fetchHistoryItem(jobId);
    setSummary(data);
    setStatus('done');
    setHistoryOpen(false);
  } catch (e) {
    setError('Failed to load history item.');
  }
};
```

**Render alongside main content:**
```tsx
<HistoryPanel
  isOpen={historyOpen}
  onClose={() => setHistoryOpen(false)}
  onSelectJob={handleHistorySelect}
  refreshTrigger={refreshTrigger}
/>
```

**Done check:** History sidebar opens; clicking a job shows its summary.

---

## Task 9.2 -- Back Navigation from History View

**What:** When viewing a history item, show a Back to Upload button.

**In `SummaryCard.tsx`:**
```tsx
// Pass isFromHistory prop
{isFromHistory && (
  <button className='btn btn-ghost' onClick={onReset}>
    Back to Upload
  </button>
)}
```

**Done check:** Back button resets to idle state from a history view.

---

## Task 9.3 -- Auto-Refresh History After Completion

**What:** Increment `refreshTrigger` after each successful job so history auto-refreshes.

**In `App.tsx` `onProgress` handler -- when `done && !error`:**
```typescript
setRefreshTrigger(prev => prev + 1);
```

**Done check:** After a job completes, opening History immediately shows the new entry.


---
---

# PHASE 10 -- Polish & Final QA

**Goal:** Verify all acceptance criteria, test edge cases, and confirm the app is production-ready.

---

## Task 10.1 -- Acceptance Criteria Verification

**Run through all 10 AC from the PRD:**
```
AC-01 [ ] Upload a PDF -> receive a text summary
AC-02 [ ] Paste text -> receive a summary
AC-03 [ ] Progress bar updates 0% to 100% in real time
AC-04 [ ] Summary displayed below progress bar on completion
AC-05 [ ] Summary + job saved to PostgreSQL (verify in pgAdmin)
AC-06 [ ] History panel shows all past summarization jobs
AC-07 [ ] App runs offline after install (disable internet, reload)
AC-08 [ ] Unsupported file type -> clear error message
         File too large -> clear error message with size info
AC-09 [ ] .txt file -> summarized correctly
         .docx file -> summarized correctly
AC-10 [ ] Copy to Clipboard works
         Download .txt -> file downloads with correct content
```

**Done check:** All 10 ACs have been manually verified.

---

## Task 10.2 -- Cross-Browser Test

```
[ ] Chrome / Edge -- primary target
[ ] Firefox
[ ] SSE works in all browsers
[ ] Drag-and-drop works in all browsers
```

---

## Task 10.3 -- Responsive Layout Test

**Open DevTools device emulator:**
```
[ ] 1440px -- full desktop, history sidebar visible
[ ] 1280px -- minimum desktop, no scroll required
[ ] 768px  -- tablet, layout stacks vertically
[ ] 375px  -- mobile, upload area full width, text readable
```

---

## Task 10.4 -- Performance Verification

```
[ ] sumy summarizes a 10-page PDF in under 10 seconds
[ ] Progress bar never freezes during processing
[ ] No unhandled errors in browser console during normal use
[ ] Backend logs show no unhandled exceptions
```

---

## Task 10.5 -- Write README.md

**File to create:** `README.md` at project root

**Sections:**
1. Project Overview
2. Tech Stack
3. Prerequisites (Node 18+, Python 3.11+, PostgreSQL 16)
4. Installation Steps
5. How to Run
6. How to Use
7. Environment Variables Reference
8. Troubleshooting

**Done check:** README alone is sufficient to get the app running from scratch.

---

## Task 10.6 -- Final End-to-End Smoke Test

```powershell
# Terminal 1
cd backend && .\venv\Scripts\Activate.ps1 && uvicorn main:app --port 8000

# Terminal 2
cd frontend && npm run dev
```

**Test sequence:**
```
1.  Open http://localhost:3000
2.  Upload a PDF file
3.  Set sentences = 5
4.  Click Summarize
5.  Watch progress bar fill to 100%
6.  Read the summary
7.  Click Copy -> paste into Notepad -> verify content
8.  Click Download -> open .txt -> verify content
9.  Click Summarize Another
10. Paste raw text -> Summarize -> verify flow
11. Open History -> see both jobs -> click one -> summary loads
12. Close and reopen app -> History still persisted in DB
```

**Done check:** All 12 steps pass. App is fully working.


---
---

## PHASE COMPLETION TRACKER

```
Phase 0  -- Environment & Project Setup    [ ] Complete
Phase 1  -- Database Layer                 [ ] Complete
Phase 2  -- Backend Core                   [ ] Complete
Phase 3  -- Backend Services               [ ] Complete
Phase 4  -- Backend API Routes             [ ] Complete
Phase 5  -- Frontend Foundation            [ ] Complete
Phase 6  -- Frontend Components            [ ] Complete
Phase 7  -- Frontend-Backend Integration   [ ] Complete
Phase 8  -- Error Handling & Validation    [ ] Complete
Phase 9  -- History Feature                [ ] Complete
Phase 10 -- Polish & Final QA              [ ] Complete
```

---

## FILE CREATION CHECKLIST

```
Root
  [x] prd.md
  [x] mock.md
  [x] agentic.md
  [ ] README.md
  [ ] .gitignore

backend/
  [ ] requirements.txt
  [ ] main.py
  [ ] .env
  [ ] .env.example
  [ ] app/__init__.py
  [ ] app/config.py
  [ ] app/db.py
  [ ] app/models/__init__.py
  [ ] app/models/job.py
  [ ] app/schemas/__init__.py
  [ ] app/schemas/job.py
  [ ] app/api/__init__.py
  [ ] app/api/summarize.py
  [ ] app/api/progress.py
  [ ] app/api/summary.py
  [ ] app/api/history.py
  [ ] app/services/__init__.py
  [ ] app/services/file_handler.py
  [ ] app/services/extractor.py
  [ ] app/services/summarizer.py
  [ ] app/services/processor.py
  [ ] alembic.ini
  [ ] alembic/env.py
  [ ] alembic/versions/*.py  (auto-generated)

frontend/
  [ ] index.html
  [ ] package.json
  [ ] vite.config.ts
  [ ] tsconfig.json
  [ ] src/main.tsx
  [ ] src/App.tsx
  [ ] src/index.css
  [ ] src/types/index.ts
  [ ] src/api/client.ts
  [ ] src/components/Header.tsx
  [ ] src/components/UploadArea.tsx
  [ ] src/components/ProgressBar.tsx
  [ ] src/components/SummaryCard.tsx
  [ ] src/components/HistoryPanel.tsx
```

---

*End of Agentic Implementation Plan -- Document Summarizer v1.0*