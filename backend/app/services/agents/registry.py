"""Agent registry — maps a task key to its specialized agent callable."""
from . import analysis_agent, compare_agent, qa_agent, study_agent, summary_agent

AGENTS = {
    "summary": summary_agent.summarize_text,
    "insights": analysis_agent.analyze_document,
    "risk": analysis_agent.extract_risk_report,
    "evidence": analysis_agent.extract_evidence_map,
    "action": analysis_agent.extract_action_plan,
    "qa": qa_agent.answer_question,
    "study": study_agent.generate_study,
    "compare": compare_agent.compare_documents,
}


def get_agent(task: str):
    if task not in AGENTS:
        raise ValueError(f"Unknown agent task: {task!r}. Available: {', '.join(sorted(AGENTS))}")
    return AGENTS[task]


def run_agent(task: str, *args, **kwargs):
    """Dispatch to the agent registered for ``task``."""
    return get_agent(task)(*args, **kwargs)
