# Product Requirements Document (PRD)
## Document Summarizer — Full-Stack Application

**Version:** 1.0  
**Date:** 2026-06-29  
**Platform:** Local (Windows)  
**Status:** Draft

---

## 1. Overview

### 1.1 Product Summary

A local full-stack web application that lets users upload `.pdf`, `.txt`, or `.docx` files, or paste raw text, and receive an AI-style summary. The backend processes content asynchronously and streams live progress to the frontend. Completed summaries are stored in a local PostgreSQL database and can be reviewed in history.

### 1.2 Goals

- Provide a simple, intuitive UI to upload documents or paste text.
- Show real-time processing progress through a percentage-based progress bar using SSE.
- Generate summaries using the Python `sumy` library with LexRank or LSA.
- Store all jobs, inputs, and summaries in PostgreSQL for history and retrieval.
- Run locally on Windows with no external cloud dependencies.

### 1.3 Non-Goals (v1.0)

- No user authentication or multi-user support.
- No cloud deployment.
- No OCR or scanned/image-based PDF support in v1.0.
- No real-time multi-user collaboration.

---

## 2. User Journey

### Step 1 — Land on the Application
The user opens a browser and navigates to the frontend dev server (e.g. `http://localhost:3000` or `http://localhost:5173`). They see a clear upload interface with file and text input options.

### Step 2 — Upload a File or Paste Text
The user chooses between:
- **Upload:** Drag-and-drop or browse for one or more `.pdf`, `.txt`, or `.docx` files.
- **Paste text:** Enter or paste raw text into the textarea.

### Step 3 — Submit for Summarization
The user clicks **"Summarize"**. The frontend sends a multipart form request to the backend, including the selected files or raw text, sentence count, and method.

### Step 4 — Watch Progress in Real Time
A progress panel appears. The backend updates progress via Server-Sent Events with stages such as:
- `Upload received...`
- `Validating input...`
- `Extracting text...`
- `Pre-processing text...`
- `Summarizing...`
- `Finalizing summary...`
- `Saving to database...`

### Step 5 — View the Summary
After completion, the summary is fetched and displayed in a card. The user can:
- **Copy** the summary to clipboard.
- **Download** the summary as a `.txt` file.
- View metadata such as method, character counts, and timestamp.

### Step 6 — History & Re-access
The history sidebar lists past jobs with filename, status, timestamp, and snippet. Clicking an item loads the full summary.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | TypeScript + React (Vite) | Component-based UI |
| **Styling** | Vanilla CSS | Lightweight UI styling |
| **Backend** | Python (FastAPI) | Async REST API |
| **Summarization** | `sumy` | LexRank / LSA summarization |
| **PDF Extraction** | `PyMuPDF` (`fitz`) | Extract text from PDFs |
| **DOCX Extraction** | `python-docx` | Extract text from Word docs |
| **Database** | PostgreSQL | Job persistence |
| **ORM** | SQLAlchemy | DB sessions and models |
| **Realtime** | `sse-starlette` | SSE progress streaming |
| **Config** | `python-dotenv`, `pydantic-settings` | Local env config |

---

## 4. Software & Dependencies to Install (Windows Local)

### 4.1 System-Level Software

| Software | Version | Purpose |
|---|---|---|
| **Node.js** | >= 18.x | Run frontend dev server |
| **Python** | >= 3.10 | Run backend |
| **PostgreSQL** | >= 15.x | Local database |
| **Git** | Latest | Version control |

### 4.2 Python Backend Libraries (`requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
python-multipart==0.0.9
PyMuPDF==1.24.3
python-docx==1.1.2
sumy==0.11.0
nltk==3.8.1
python-dotenv==1.0.1
sse-starlette==2.1.0
pydantic==2.7.1
pydantic-settings==2.2.1
```

### 4.3 Frontend Libraries (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "axios": "^1.7.2"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "vite": "^5.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0"
  }
}
```

---

## 5. Feature Requirements

### 5.1 Frontend Features

| ID | Feature | Priority |
|---|---|---|
| F-01 | File upload for `.pdf`, `.txt`, `.docx` | P0 |
| F-02 | Text paste / manual input | P0 |
| F-03 | Real-time progress bar via SSE | P0 |
| F-04 | Display summary card after completion | P0 |
| F-05 | Copy summary to clipboard | P1 |
| F-06 | Download summary as `.txt` | P1 |
| F-07 | Summary history panel | P1 |
| F-08 | Search/filter history | P1 |
| F-09 | Error handling for invalid input and server errors | P0 |
| F-10 | Load and display history items | P1 |

### 5.2 Backend Features

| ID | Feature | Priority |
|---|---|---|
| B-01 | `POST /api/summarize` | P0 |
| B-02 | `GET /api/progress/{job_id}` | P0 |
| B-03 | `GET /api/summary/{job_id}` | P0 |
| B-04 | `GET /api/history` | P1 |
| B-05 | `GET /api/history/{job_id}` | P1 |
| B-06 | Extract text from PDF with `PyMuPDF` | P0 |
| B-07 | Extract text from `.docx` with `python-docx` | P0 |
| B-08 | Accept plain-text `.txt` files and raw text input | P0 |
| B-09 | Summarize with `sumy` LexRank/LSA | P0 |
| B-10 | Persist jobs and summaries in PostgreSQL | P0 |
| B-11 | Validate file size and supported types | P0 |
| B-12 | CORS config for local frontend origins | P0 |

---

## 6. API Contract

### `POST /api/summarize`

**Request:** `multipart/form-data`
- `files` (optional): one or more uploaded PDF/TXT/DOCX files
- `file` (optional): single uploaded file
- `text` (optional): raw text input
- `sentences` (optional): number of summary sentences
- `method` (optional): `lexrank` or `lsa`

**Response:** `202 Accepted`
```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

### `GET /api/progress/{job_id}`

**Response:** SSE stream with JSON payloads containing progress, stage, error, and done status.

### `GET /api/summary/{job_id}`

**Response:** `200 OK`
```json
{
  "job_id": "uuid-string",
  "filename": "document.pdf",
  "summary": "This document discusses...",
  "method": "lexrank",
  "status": "done",
  "char_count_original": 10345,
  "char_count_summary": 712,
  "sentences_requested": 7,
  "created_at": "2026-06-25T10:00:00",
  "completed_at": "2026-06-25T10:00:10"
}
```

### `GET /api/history`

**Response:** `200 OK`
```json
[
  {
    "job_id": "uuid-string",
    "filename": "notes.pdf",
    "summary_snippet": "This document discusses...",
    "status": "done",
    "created_at": "2026-06-25T10:05:00"
  }
]
```

### `GET /api/history/{job_id}`

**Response:** `200 OK`
```json
{
  "job_id": "uuid-string",
  "filename": "notes.pdf",
  "summary": "This document discusses...",
  "method": "lsa",
  "status": "done",
  "char_count_original": 8300,
  "char_count_summary": 640,
  "sentences_requested": 7,
  "created_at": "2026-06-25T10:05:00",
  "completed_at": "2026-06-25T10:05:06"
}
```

---

## 7. Database Schema (PostgreSQL)

### Table: `summarization_jobs`

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `filename` | `VARCHAR(255)` | File name or null for text-only jobs |
| `file_type` | `VARCHAR(10)` | `pdf`, `docx`, `txt`, or `text` |
| `input_text` | `TEXT` | Extracted or raw input text |
| `summary` | `TEXT` | Generated summary |
| `method` | `VARCHAR(50)` | `lexrank` or `lsa` |
| `status` | `VARCHAR(20)` | `queued`, `processing`, `done`, `error` |
| `progress` | `INTEGER` | 0–100 |
| `error_message` | `TEXT` | Error details if failed |
| `char_count_original` | `INTEGER` | Original text length |
| `char_count_summary` | `INTEGER` | Summary text length |
| `sentences_requested` | `INTEGER` | Requested sentences |
| `created_at` | `TIMESTAMP` | Job creation time |
| `completed_at` | `TIMESTAMP` | Completion time |

---

## 8. Project Directory Structure

```
summary/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── api/
│   │   │   ├── summarize.py
│   │   │   ├── progress.py
│   │   │   ├── summary.py
│   │   │   └── history.py
│   │   ├── models/
│   │   │   └── job.py
│   │   ├── schemas/
│   │   │   └── job.py
│   │   └── services/
│   │       ├── file_handler.py
│   │       ├── extractor.py
│   │       ├── processor.py
│   │       └── summarizer.py
│   └── uploads/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── api/client.ts
│       ├── components/
│       └── types/
└── README.md
```

---

## 9. Local Setup Instructions (Windows)

### Step 1 — Install PostgreSQL
1. Download PostgreSQL 15+ from https://www.postgresql.org/download/windows/
2. Run the installer and set a password for the `postgres` user.
3. Open pgAdmin or psql and create the database:
   ```sql
   CREATE DATABASE summarizer_db;
   ```

### Step 2 — Backend Setup
```powershell
cd pdf-summarizer/backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m nltk.downloader punkt stopwords
# Configure .env file with DATABASE_URL
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Step 3 — Frontend Setup
```powershell
cd pdf-summarizer/frontend
npm install
npm run dev
# Runs at http://localhost:3000
```

### Step 4 — Access the App
Open browser at: `http://localhost:3000`

---

## 10. Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/summarizer_db
MAX_FILE_SIZE_MB=20
SUMMARIZATION_METHOD=sumy
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 11. Acceptance Criteria

| ID | Criteria |
|---|---|
| AC-01 | User can upload a PDF and receive a text summary |
| AC-02 | User can paste text and receive a summary |
| AC-03 | Progress bar updates in real time from 0% to 100% |
| AC-04 | Summary is displayed below the progress bar upon completion |
| AC-05 | Summary and job metadata are saved to PostgreSQL |
| AC-06 | History panel shows all past summarization jobs |
| AC-07 | Application runs locally on Windows with no internet required (after install) |
| AC-08 | Errors (unsupported file, file too large) show clear UI messages |
| AC-09 | `.docx` and `.txt` files are supported in addition to PDF |
| AC-10 | Summary can be copied or downloaded as a `.txt` file |

---

## 12. Success Metrics

| Metric | Target |
|---|---|
| Summarization latency (sumy) | < 10 seconds for documents up to 50 pages |
| Progress bar accuracy | Updates within ±5% of actual processing stage |
| UI responsiveness | No UI freeze during processing |
| Database reliability | 100% of completed jobs persisted correctly |
| Supported file types | PDF, TXT, DOCX |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Large PDF causes timeout | High | Enforce 20MB file size limit; stream progress via SSE |
| HuggingFace model slow on CPU | Medium | Default to `sumy` (fast, no GPU needed); transformers as opt-in |
| PostgreSQL connection issues on Windows | Medium | Provide clear `.env` setup guide; use `psycopg2-binary` |
| CORS issues between frontend and backend | Low | Configure FastAPI CORS middleware explicitly |
| Scanned PDFs (image-based) have no text | Medium | Show clear error: "No extractable text found in this PDF" |

---

*End of PRD v1.0*
