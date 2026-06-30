# Document Summarizer — CLAUDE.md

## What this project is

A local single-user document summarizer. Users upload PDF, DOCX, or TXT files (or paste text), and receive an AI-generated summary powered by OpenAI `gpt-4o-mini`. Results are stored in a local SQLite database and browsable via a history panel.

---

## How to run

### Normal use (single process, one command)
```powershell
cd C:\Users\Admin\Downloads\summary
.\run_app.ps1
```
- Builds the frontend into `frontend/dist/` if not already built.
- Starts a single uvicorn process on **http://localhost:8000** that serves both the API and the UI.
- Press `Ctrl+C` to stop.

### Development mode (hot-reload frontend)
Terminal 1 — backend:
```powershell
cd backend
$env:PYTHONUTF8=1; $env:PYTHONPATH="$pwd"
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload
```
Terminal 2 — frontend:
```powershell
cd frontend
npm run dev        # hot-reload dev server on http://localhost:3000
```
Vite proxies `/api` → `http://localhost:8000` in dev mode (configured in `vite.config.ts`).

### Stop everything
```powershell
.\stop_app.ps1
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite 6 |
| Data fetching | TanStack Query v5 (`useMutation`, `useInfiniteQuery`) |
| HTTP | Native browser `fetch` (no axios) |
| Backend | Python FastAPI 0.115, uvicorn |
| Summarization | OpenAI `gpt-4o-mini` via `openai` SDK |
| PDF extraction | PyMuPDF (`fitz`) |
| DOCX extraction | `python-docx` |
| Database | SQLite via SQLAlchemy 2.0 (file: `backend/summarizer.db`) |
| Config | `pydantic-settings` reading from `backend/.env` |

---

## Project structure

```
summary/
├── run_app.ps1          # Start everything (single process)
├── stop_app.ps1         # Stop backend/frontend processes
├── backend/
│   ├── main.py          # FastAPI app, lifespan, mounts frontend/dist
│   ├── .env             # Local config (DATABASE_URL, OPENAI_API_KEY)
│   ├── requirements.txt
│   ├── summarizer.db    # SQLite database (auto-created on first run)
│   ├── uploads/         # Temporary uploaded file storage
│   ├── venv/            # Python virtualenv
│   └── app/
│       ├── config.py        # Settings via pydantic-settings
│       ├── db.py            # SQLAlchemy engine + session
│       ├── models/job.py    # SummarizationJob ORM model
│       ├── schemas/job.py   # Pydantic response schemas
│       ├── api/
│       │   ├── summarize.py # POST /api/summarize (synchronous, returns full result)
│       │   ├── summary.py   # GET /api/summary/{job_id}
│       │   └── history.py   # GET /api/history, GET /api/history/{job_id}
│       └── services/
│           ├── summarizer.py    # OpenAI gpt-4o-mini call
│           ├── extractor.py     # PDF/DOCX/TXT text extraction
│           └── file_handler.py  # Upload validation + disk save
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx             # React root + QueryClientProvider
        ├── App.tsx              # Root component, useMutation for submit
        ├── api/client.ts        # fetch wrappers for all API calls
        ├── types/index.ts       # Shared TypeScript types
        └── components/
            ├── Header.tsx
            ├── UploadArea.tsx
            ├── ProgressBar.tsx  # Loading spinner (shown while OpenAI processes)
            ├── SummaryCard.tsx  # Displays completed summary + copy/download
            └── HistoryPanel.tsx # Slide-in panel, useInfiniteQuery pagination
```

---

## Environment variables (`backend/.env`)

```env
DATABASE_URL=sqlite:///./summarizer.db
OPENAI_API_KEY=sk-...your-key-here...
MAX_FILE_SIZE_MB=20
FRONTEND_ORIGIN=http://localhost:8000
```

`OPENAI_API_KEY` is required — the app will fail on any summarize request without it.

---

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/summarize` | Upload files or text, returns full `SummaryResponse` synchronously |
| `GET` | `/api/summary/{job_id}` | Fetch a completed summary by ID |
| `GET` | `/api/history` | Paginated list of past jobs (`?skip=0&limit=10`) |
| `GET` | `/api/history/{job_id}` | Full detail for a past job |
| `GET` | `/health` | `{"status": "ok"}` health check |
| `GET` | `/docs` | Auto-generated Swagger UI |

`POST /api/summarize` accepts `multipart/form-data`:
- `files` — one or more PDF/TXT/DOCX files
- `text` — raw text (alternative to files)
- `sentences` — integer, default 7
- `method` — string, default `"gpt-4o-mini"`

---

## Database

Single table `summarization_jobs` in SQLite. Schema is created automatically via `Base.metadata.create_all()` on startup — no migration tool needed.

Key columns: `id` (UUID), `filename`, `file_type`, `summary`, `method`, `status`, `char_count_original`, `char_count_summary`, `sentences_requested`, `created_at`, `completed_at`.

---

## Installing dependencies

Backend (first time or after `requirements.txt` changes):
```powershell
cd backend
.\venv\Scripts\pip.exe install -r requirements.txt
```

Frontend (first time or after `package.json` changes):
```powershell
cd frontend
npm install
```

Rebuild frontend after code changes (not needed in dev mode):
```powershell
cd frontend
npm run build
```

---

## Constraints / non-goals

- Single user only — no auth, no multi-user support.
- Local Windows only — no cloud deployment, no Docker.
- Max file size: 20 MB per file, 60 MB combined, max 10 files per submission.
- Scanned/image-based PDFs are not supported (no OCR) — the app returns a clear error.
- No SSE / fake progress bar — the API call waits for OpenAI to respond, a spinner is shown.
