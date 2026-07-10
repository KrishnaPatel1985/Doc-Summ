import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import Base, engine, ensure_columns
from app.api.summarize import router as summarize_router
from app.api.summary import router as summary_router
from app.api.history import router as history_router
from app.api.intelligence import router as intelligence_router
from app.api.documents import router as documents_router
from app.api.compare import router as compare_router
from app.api.records import router as records_router
from app.api.auth import router as auth_router
import app.models.workspace  # noqa: F401  (register Phase 5 tables for create_all)
import app.models.user  # noqa: F401  (register auth tables for create_all)

logger = logging.getLogger("uvicorn.error")

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_production_secrets()
    os.makedirs(settings.upload_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    yield


app = FastAPI(
    title="Document Summarizer API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation error", "details": exc.errors()})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}


app.include_router(summarize_router, prefix="/api", tags=["Summarize"])
app.include_router(summary_router, prefix="/api", tags=["Summary"])
app.include_router(history_router, prefix="/api", tags=["History"])
app.include_router(intelligence_router, prefix="/api", tags=["Intelligence"])
app.include_router(documents_router, prefix="/api", tags=["Documents"])
app.include_router(compare_router, prefix="/api", tags=["Compare"])
app.include_router(records_router, prefix="/api", tags=["Records"])
app.include_router(auth_router, prefix="/api", tags=["Auth"])

# Serve built frontend if it exists (production / single-process mode)
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.port)
