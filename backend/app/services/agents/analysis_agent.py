"""Analysis agent — Key Insights, Evidence Map, Risk Report, Action Items.

These facets are produced together in one JSON call for efficiency. The
``extract_*`` helpers expose specialized per-task entry points (risk, evidence,
action plan) over the same analysis without changing the prompt.
"""
import json

from .base import MODEL, get_client, truncate as _truncate

EMPTY_ANALYSIS = {
    "main_topic": "",
    "key_takeaways": [],
    "entities": [],
    "numbers": [],
    "risks": [],
    "opportunities": [],
    "action_items": [],
    "evidence_map": [],
    "risk_report": {
        "risks": [],
        "opportunities": [],
        "assumptions": [],
        "missing_information": [],
        "follow_up_questions": [],
        "red_flags": [],
    },
}


def analyze_document(text: str) -> dict:
    """Return structured intelligence about the document as a dict."""
    text = _truncate(text)
    system_prompt = (
        "You are an expert document analyst. Analyze the provided document and return a JSON object "
        "with EXACTLY these keys:\n"
        '- "main_topic": a one-sentence statement of the document\'s core subject.\n'
        '- "key_takeaways": array of 3-5 short strings, the most important points.\n'
        '- "entities": array of important names, organizations, people, or places mentioned (strings). Empty array if none.\n'
        '- "numbers": array of important numbers, statistics, dates, or figures WITH brief context (strings). Empty array if none.\n'
        '- "risks": array of risks, concerns, or warnings (strings). Empty array if none.\n'
        '- "opportunities": array of opportunities or recommendations (strings). Empty array if none.\n'
        '- "action_items": array of concrete next steps, tasks, decisions, or deadlines (strings). Empty array if none.\n'
        '- "evidence_map": array of 3-6 objects, each {"claim": str, "evidence_snippet": exact or near-exact supporting snippet from the document, "source": str, "confidence": "High"|"Medium"|"Low"}. Use "Document content" as source unless the document itself contains a real section name. Do not invent page numbers.\n'
        '- "risk_report": object with keys "risks", "opportunities", "assumptions", "missing_information", "follow_up_questions", and "red_flags". Each key except "red_flags" is an array of concise strings. "red_flags" is an array of objects, each {"issue": str, "why_it_matters": str, "suggested_follow_up": str}.\n'
        "Base everything strictly on the document content. Respond with valid JSON only."
    )
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this document:\n\n{text}"},
            ],
            max_tokens=1500,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
    except Exception:
        return dict(EMPTY_ANALYSIS)

    # Normalize: ensure all keys present and of the right shape.
    result = dict(EMPTY_ANALYSIS)
    for key in ("main_topic", "key_takeaways", "entities", "numbers", "risks", "opportunities", "action_items"):
        val = data.get(key)
        if key == "main_topic":
            result[key] = val if isinstance(val, str) else ""
        else:
            result[key] = [str(x) for x in val] if isinstance(val, list) else []

    evidence = data.get("evidence_map")
    if isinstance(evidence, list):
        result["evidence_map"] = [
            {
                "claim": str(item.get("claim", "")).strip(),
                "evidence_snippet": str(item.get("evidence_snippet", "")).strip(),
                "source": str(item.get("source", "") or "Document content").strip(),
                "confidence": str(item.get("confidence", "") or "Medium").strip(),
            }
            for item in evidence
            if isinstance(item, dict)
        ]

    report = data.get("risk_report")
    cleaned_report = {
        "risks": result["risks"],
        "opportunities": result["opportunities"],
        "assumptions": [],
        "missing_information": [],
        "follow_up_questions": [],
        "red_flags": [],
    }
    if isinstance(report, dict):
        for key in ("risks", "opportunities", "assumptions", "missing_information", "follow_up_questions"):
            val = report.get(key)
            cleaned_report[key] = [str(x) for x in val] if isinstance(val, list) else cleaned_report[key]

        flags = report.get("red_flags")
        if isinstance(flags, list):
            cleaned_report["red_flags"] = [
                {
                    "issue": str(flag.get("issue", "")).strip(),
                    "why_it_matters": str(flag.get("why_it_matters", "")).strip(),
                    "suggested_follow_up": str(flag.get("suggested_follow_up", "")).strip(),
                }
                for flag in flags
                if isinstance(flag, dict)
            ]
    result["risk_report"] = cleaned_report
    return result


# --- Specialized facet agents (share the analysis prompt) -------------------
def extract_risk_report(text: str) -> dict:
    """Risk Review agent — risks, assumptions, missing info, red flags."""
    return analyze_document(text)["risk_report"]


def extract_evidence_map(text: str) -> list:
    """Evidence Map agent — claims mapped to supporting evidence."""
    return analyze_document(text)["evidence_map"]


def extract_action_plan(text: str) -> list:
    """Action Plan agent — concrete tasks, decisions, and next steps."""
    return analyze_document(text)["action_items"]
