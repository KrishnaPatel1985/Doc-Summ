"""Compare agent — structured comparison of two documents."""
import json

from .base import MODEL, MAX_INPUT_CHARS, get_client

EMPTY_COMPARE = {
    "overview": "",
    "similarities": [],
    "differences": [],
    "contradictions": [],
    "unique_a": [],
    "unique_b": [],
    "conclusion": "",
    "recommendation": "",
}


def compare_documents(text_a: str, text_b: str, focus: str = "") -> dict:
    """Compare two documents and return a structured comparison as a dict.

    ``focus`` optionally steers the comparison toward a particular angle
    (e.g. "pricing terms"); empty by default so behavior is unchanged.
    """
    a = (text_a or "").strip()[: MAX_INPUT_CHARS // 2]
    b = (text_b or "").strip()[: MAX_INPUT_CHARS // 2]
    if not a or not b:
        raise ValueError("Two documents are required to compare.")

    system_prompt = (
        "You are an expert analyst comparing two documents (Document A and Document B). "
        "Return a JSON object with EXACTLY these keys:\n"
        '- "overview": a 1-2 sentence high-level comparison of the two documents.\n'
        '- "similarities": array of concise strings describing points both documents share.\n'
        '- "differences": array of concise strings describing where they differ (each should reference A vs B where useful).\n'
        '- "contradictions": array of concise strings where the documents directly disagree or conflict. Empty array if none.\n'
        '- "unique_a": array of concise strings for points that appear only in Document A.\n'
        '- "unique_b": array of concise strings for points that appear only in Document B.\n'
        '- "conclusion": a short paragraph giving the overall takeaway of the comparison.\n'
        '- "recommendation": a short, actionable recommendation based on the comparison. Empty string if not applicable.\n'
        "Base everything strictly on the two documents. Do not invent page numbers or sections. "
        "Respond with valid JSON only."
    )
    if focus and focus.strip():
        system_prompt += f" Focus the comparison specifically on: {focus.strip()}."
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"DOCUMENT A:\n{a}\n\n---\n\nDOCUMENT B:\n{b}"},
            ],
            max_tokens=2200,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
    except Exception:
        return dict(EMPTY_COMPARE)

    result = dict(EMPTY_COMPARE)
    for key in ("overview", "conclusion", "recommendation"):
        val = data.get(key)
        result[key] = val if isinstance(val, str) else ""
    for key in ("similarities", "differences", "contradictions", "unique_a", "unique_b"):
        val = data.get(key)
        result[key] = [str(x) for x in val] if isinstance(val, list) else []
    return result
