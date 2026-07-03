"""Backward-compatible facade over the task-specialized agents.

Phase 6 split the logic into ``app.services.agents.*``. This module re-exports
the same public functions and constants so existing imports and call sites
(``from app.services.summarizer import summarize_text``, etc.) keep working
unchanged. New code may import from the agents package or use the registry.
"""
from app.services.agents.base import MAX_INPUT_CHARS, MODEL, get_client
from app.services.agents.summary_agent import (
    LENGTH_GUIDE,
    TONE_GUIDE,
    summarize_text,
)
from app.services.agents.analysis_agent import (
    EMPTY_ANALYSIS,
    analyze_document,
    extract_action_plan,
    extract_evidence_map,
    extract_risk_report,
)
from app.services.agents.qa_agent import answer_question
from app.services.agents.study_agent import EMPTY_STUDY, generate_study
from app.services.agents.compare_agent import EMPTY_COMPARE, compare_documents
from app.services.agents.registry import AGENTS, get_agent, run_agent

__all__ = [
    "MAX_INPUT_CHARS",
    "MODEL",
    "get_client",
    "LENGTH_GUIDE",
    "TONE_GUIDE",
    "summarize_text",
    "EMPTY_ANALYSIS",
    "analyze_document",
    "extract_action_plan",
    "extract_evidence_map",
    "extract_risk_report",
    "answer_question",
    "EMPTY_STUDY",
    "generate_study",
    "EMPTY_COMPARE",
    "compare_documents",
    "AGENTS",
    "get_agent",
    "run_agent",
]
