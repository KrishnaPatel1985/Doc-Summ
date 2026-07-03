"""Shared plumbing for all document agents."""
from openai import OpenAI

from app.config import settings

_client: OpenAI | None = None

MAX_INPUT_CHARS = 400_000  # ~100k tokens — fits gpt-4o-mini's context window
MODEL = "gpt-4o-mini"


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def truncate(text: str) -> str:
    text = (text or "").strip()
    if not text:
        raise ValueError("No text to process.")
    return text[:MAX_INPUT_CHARS] if len(text) > MAX_INPUT_CHARS else text
