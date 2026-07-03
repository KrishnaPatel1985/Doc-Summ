"""Task-specialized document agents.

Phase 6 refactor: the previously monolithic ``summarizer.py`` is split into one
module per task (summary, analysis, Q&A, study, compare) sharing a common
``base``. Prompts and behavior are unchanged — this is an organizational
refactor. A ``registry`` maps task keys to agent callables.

``app.services.summarizer`` re-exports these functions, so existing imports and
call sites keep working without modification.
"""
