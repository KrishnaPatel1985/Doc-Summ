# DocSumm — AI Document Intelligence Dashboard

DocSumm is a local, single-user **AI document intelligence platform**. It goes well beyond a basic summarizer: upload a PDF, DOCX, or TXT file (or paste text) and get a customizable summary **plus** AI-extracted key insights, action items, an interactive "Ask this document" Q&A, and a Study Mode with flashcards and quizzes — all in a clean, professional SaaS-style dashboard, with persistent history and a polished PDF report export.

Powered by OpenAI `gpt-4o-mini`, FastAPI, React + TypeScript, and SQLite.

---

## ✨ Features

### Core
- **Multi-format input** — PDF, DOCX, TXT upload (drag & drop or browse) or paste raw text.
- **Customizable summaries** — choose **style** (Paragraph / Bullet Points / Action Items), **length** (Short / Medium / Detailed), and **tone** (Simple / Professional / Academic). Every setting is fed into the LLM prompt.
- **Custom instructions** — optional free-text guidance (e.g. "focus on financial figures").

### Document intelligence
- **Key Insights panel** — AI-extracted main topic, 3–5 key takeaways, named entities, important numbers/statistics, risks/concerns, and opportunities/recommendations.
- **Action Items** — concrete tasks, decisions, deadlines, and next steps pulled from the document.
- **Ask this Document (Q&A)** — a chat interface that answers questions grounded **only** in the uploaded content, with suggested starter questions.
- **Study Mode** — auto-generated 5 flashcards (click to flip), a 5-question interactive quiz, key terms with definitions, and an "Explain like I'm a beginner" overview.

### Output & workflow
- **Tabbed result dashboard** — Summary · Key Insights · Action Items · Ask Document · Study Mode · Export.
- **Dashboard metrics** — original length, summary length, reduction %, reading time saved, action-item count, insight count.
- **Professional PDF report** — branded export including summary, key insights, action items, and study notes.
- **Copy / Download .txt / Copy Markdown** export options.
- **Persistent history** — every run is stored (summary, insights, action items, style/length/tone, timestamp). Clicking a history item reopens the **full** result dashboard, not just a preview.
- **Responsive light dashboard UI** — clean cards, tabs, indigo/purple accents, mobile-friendly.

---

## 🖼️ Screenshots

> _Add screenshots here_

| Input dashboard | Result — Key Insights | Ask Document | Study Mode |
|---|---|---|---|
| `docs/screenshot-input.png` | `docs/screenshot-insights.png` | `docs/screenshot-ask.png` | `docs/screenshot-study.png` |

---

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite 6 |
| Data fetching | TanStack Query v5 (`useMutation`, `useInfiniteQuery`) |
| HTTP | Native browser `fetch` |
| Backend | Python FastAPI 0.115, uvicorn |
| AI | OpenAI `gpt-4o-mini` (summaries, analysis, Q&A, study) with JSON-mode structured output |
| PDF extraction | PyMuPDF (`fitz`) |
| DOCX extraction | `python-docx` |
| Database | SQLite via SQLAlchemy 2.0 |
| Config | `pydantic-settings` |

---

## ⚙️ How it works

1. **Extract** — uploaded files are validated and their text extracted (PyMuPDF / python-docx); pasted text is used directly. The extracted source text is stored so Q&A and Study Mode work later, even from history.
2. **Summarize + Analyze (concurrently)** — on submit, the backend runs two LLM calls in parallel (`asyncio.gather` + `to_thread`): one produces the styled/length/tone-aware summary, the other returns structured JSON intelligence (insights + action items).
3. **Persist** — the job, summary, insights, action items, and settings are saved to SQLite.
4. **Explore** — the result dashboard renders tabs. **Ask Document** (`POST /api/ask`) and **Study Mode** (`POST /api/study/{job_id}`) are generated on demand from the stored source text.
5. **Export** — generate a branded PDF report or copy/download the content.

### Key API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/summarize` | Summary + key insights + action items (accepts `style`, `length`, `tone`, `sentences`, `custom_instructions`) |
| `POST` | `/api/ask` | `{job_id, question}` → grounded answer |
| `POST` | `/api/study/{job_id}` | Flashcards, quiz, key terms, ELI5 |
| `GET` | `/api/history` | Paginated history (`?skip=&limit=`) |
| `GET` | `/api/history/{job_id}` | Full result for a past job |
| `GET` | `/health` · `/docs` | Health check · Swagger UI |

---

## 🚀 Setup & run (Windows)

### Prerequisites
- Python 3.11+, Node 18+
- An OpenAI API key

### 1. Backend env (`backend/.env`)
```env
DATABASE_URL=sqlite:///./summarizer.db
OPENAI_API_KEY=sk-...your-key-here...
MAX_FILE_SIZE_MB=20
FRONTEND_ORIGIN=http://localhost:8000
```

### 2. Install dependencies
```powershell
cd backend
.\venv\Scripts\pip.exe install -r requirements.txt
cd ..\frontend
npm install
```

### 3. Run (single process — serves API + UI)
```powershell
cd C:\Users\Admin\Downloads\summary
.\run_app.ps1
```
Open **http://localhost:8000**. Stop with `.\stop_app.ps1`.

### Development mode (hot reload)
```powershell
# Terminal 1
cd backend
$env:PYTHONUTF8=1; $env:PYTHONPATH="$pwd"
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload
# Terminal 2
cd frontend
npm run dev   # http://localhost:3000 (proxies /api -> :8000)
```

The SQLite schema is auto-created on startup, and an additive migration safely adds new columns to an existing `summarizer.db` without dropping history.

---

## 🔐 Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI key — required for all AI features |
| `DATABASE_URL` | ✅ | SQLAlchemy URL (default `sqlite:///./summarizer.db`) |
| `MAX_FILE_SIZE_MB` | — | Per-file upload cap (default 20) |
| `FRONTEND_ORIGIN` | — | Allowed CORS origin |

---

## 🛣️ Future improvements

- **Multi-document support** — upload several files for individual summaries, a combined summary, and a side-by-side comparison (similarities, differences, unique points, overall conclusion). The schema and result structure are designed to extend toward this.
- Semantic chunking + embeddings for very large documents (RAG-style retrieval for Q&A).
- Multi-user auth and cloud deployment.
- Persisted Q&A chat history per document.
- OCR for scanned/image PDFs.

---

## 💼 Resume highlights

- Built an **AI-powered document intelligence dashboard** supporting PDF, DOCX, TXT, and pasted text with customizable summaries (style, length, tone), AI-extracted key insights, and action-item extraction.
- Implemented **document Q&A**, **Study Mode** (flashcards/quizzes), **persistent history**, and **professional PDF report export** to improve document review and learning workflows.
- Designed a **responsive SaaS-style dashboard** with robust file validation, error handling, localStorage/db persistence, concurrent LLM calls, and JSON-mode structured LLM output for reliable parsing.

---

## 📂 Project structure

```
summary/
├── run_app.ps1 / stop_app.ps1
├── README.md
├── backend/
│   ├── main.py                     # FastAPI app, lifespan, routers, static mount
│   └── app/
│       ├── db.py                   # engine/session + additive column migration
│       ├── models/job.py           # SummarizationJob ORM (+ insights/action_items/length/tone)
│       ├── schemas/job.py          # Pydantic models + shared serializer
│       ├── api/
│       │   ├── summarize.py        # summary + concurrent analysis
│       │   ├── intelligence.py     # /ask, /study
│       │   ├── history.py + summary.py
│       └── services/
│           ├── summarizer.py       # summarize / analyze / answer_question / generate_study
│           ├── extractor.py + file_handler.py
└── frontend/
    └── src/
        ├── App.tsx                 # idle -> loading -> result state machine
        ├── api/client.ts           # fetch wrappers (+ askDocument, fetchStudy)
        ├── types/index.ts
        └── components/
            ├── Header.tsx          # DocSumm nav (logo · History · Get Started)
            ├── UploadArea.tsx      # input + style/length/tone controls
            ├── ProgressBar.tsx     # in-card loading
            ├── SummaryCard.tsx     # tabbed result dashboard
            └── HistoryPanel.tsx    # slide-in history drawer
```

---

## 📋 Constraints / non-goals

- Single user, local Windows — no auth, no cloud/Docker.
- Max file size 20 MB/file, 60 MB combined, 10 files per submission.
- Scanned/image-only PDFs are not supported (no OCR).
- No fake progress bar — a spinner is shown while the AI works.
