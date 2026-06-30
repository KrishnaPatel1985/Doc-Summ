import json
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


def _truncate(text: str) -> str:
    text = (text or "").strip()
    if not text:
        raise ValueError("No text to process.")
    return text[:MAX_INPUT_CHARS] if len(text) > MAX_INPUT_CHARS else text


# ---------------------------------------------------------------------------
# Customization guidance
# ---------------------------------------------------------------------------
LENGTH_GUIDE = {
    "short": "Be concise — capture only the most essential points.",
    "medium": "Provide a balanced summary covering the main points.",
    "detailed": "Be thorough and comprehensive, covering all significant points and supporting detail.",
}
TONE_GUIDE = {
    "simple": "Use simple, everyday language that a beginner can easily understand.",
    "professional": "Use a polished, professional business tone.",
    "academic": "Use a formal, precise, academic tone.",
}
_LENGTH_FACTOR = {"short": 0.6, "medium": 1.0, "detailed": 1.7}


def _effective_count(sentences_count: int, length: str) -> int:
    factor = _LENGTH_FACTOR.get((length or "medium").lower(), 1.0)
    return max(2, min(25, round(sentences_count * factor)))


# ---------------------------------------------------------------------------
# Summarization (style + length + tone aware)
# ---------------------------------------------------------------------------
def summarize_text(
    text: str,
    sentences_count: int = 7,
    style: str = "paragraph",
    custom_instructions: str = "",
    length: str = "medium",
    tone: str = "professional",
) -> str:
    text = _truncate(text)
    n = _effective_count(sentences_count, length)
    length_guide = LENGTH_GUIDE.get((length or "medium").lower(), LENGTH_GUIDE["medium"])
    tone_guide = TONE_GUIDE.get((tone or "professional").lower(), TONE_GUIDE["professional"])

    if style == "bullets":
        system_prompt = (
            "You are a professional document summarizer. "
            "You MUST respond with a bullet-point list ONLY. "
            f"Produce about {n} bullets. "
            "Use • as the bullet character. Each bullet is one key idea on its own line. "
            "Place one relevant emoji at the start of each bullet. "
            "Do NOT write any prose, introduction, or conclusion — only the bullet list."
        )
        user_prompt = (
            f"Summarize the following text as about {n} bullet points "
            f"(use • character, one per line, with an emoji at the start of each):\n\n{text}"
        )
    elif style == "action_items":
        system_prompt = (
            "You are a professional document summarizer. "
            "You MUST respond with a numbered action-item list ONLY. "
            f"Produce about {n} numbered items. "
            "Each item starts with a number, then a relevant emoji, then an action verb. "
            "Do NOT write any prose, introduction, or conclusion — only the numbered list."
        )
        user_prompt = (
            f"Summarize the following text as about {n} numbered action items "
            f"(format: '1. 🔹 Verb...', one per line):\n\n{text}"
        )
    else:
        system_prompt = (
            "You are a professional document summarizer. "
            "Write in plain prose with no bullet points or headings. "
            "Place relevant emojis inline where they add context — 1-2 per sentence at most."
        )
        user_prompt = f"Summarize the following text in about {n} sentences:\n\n{text}"

    system_prompt += f" {length_guide} {tone_guide}"
    if custom_instructions.strip():
        system_prompt += f" Additional user instructions: {custom_instructions.strip()}"

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1536,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Document analysis — Key Insights + Action Items (single JSON call)
# ---------------------------------------------------------------------------
EMPTY_ANALYSIS = {
    "main_topic": "",
    "key_takeaways": [],
    "entities": [],
    "numbers": [],
    "risks": [],
    "opportunities": [],
    "action_items": [],
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

    # Normalize: ensure all keys present and of the right shape
    result = dict(EMPTY_ANALYSIS)
    for key in result:
        val = data.get(key)
        if key == "main_topic":
            result[key] = val if isinstance(val, str) else ""
        else:
            result[key] = [str(x) for x in val] if isinstance(val, list) else []
    return result


# ---------------------------------------------------------------------------
# Document Q&A
# ---------------------------------------------------------------------------
def answer_question(text: str, question: str) -> str:
    text = _truncate(text)
    question = (question or "").strip()
    if not question:
        raise ValueError("No question provided.")

    system_prompt = (
        "You are a helpful document assistant. Answer the user's question using ONLY the information "
        "in the provided document. If the answer is not contained in the document, say so clearly and "
        "do not invent facts. Be clear, concise, and accurate. Use short paragraphs or bullet points "
        "where helpful."
    )
    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"DOCUMENT:\n{text}\n\nQUESTION: {question}"},
        ],
        max_tokens=800,
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Study Mode — flashcards, quiz, key terms, ELI5
# ---------------------------------------------------------------------------
EMPTY_STUDY = {"flashcards": [], "quiz": [], "key_terms": [], "eli5": ""}


def generate_study(text: str) -> dict:
    text = _truncate(text)
    system_prompt = (
        "You are an expert tutor. From the provided document, create study material as a JSON object "
        "with EXACTLY these keys:\n"
        '- "flashcards": array of 5 objects, each {"front": question/term, "back": answer/definition}.\n'
        '- "quiz": array of 5 objects, each {"question": str, "options": array of 4 strings, "answer": the exact correct option string}.\n'
        '- "key_terms": array of objects, each {"term": str, "definition": str} for important terms.\n'
        '- "eli5": a clear beginner-friendly explanation of the document in 3-5 sentences.\n'
        "Base everything strictly on the document content. Respond with valid JSON only."
    )
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create study material from this document:\n\n{text}"},
            ],
            max_tokens=1800,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
    except Exception:
        return dict(EMPTY_STUDY)

    result = dict(EMPTY_STUDY)
    fc = data.get("flashcards")
    if isinstance(fc, list):
        result["flashcards"] = [
            {"front": str(c.get("front", "")), "back": str(c.get("back", ""))}
            for c in fc if isinstance(c, dict)
        ]
    qz = data.get("quiz")
    if isinstance(qz, list):
        cleaned = []
        for q in qz:
            if not isinstance(q, dict):
                continue
            opts = q.get("options")
            cleaned.append({
                "question": str(q.get("question", "")),
                "options": [str(o) for o in opts] if isinstance(opts, list) else [],
                "answer": str(q.get("answer", "")),
            })
        result["quiz"] = cleaned
    kt = data.get("key_terms")
    if isinstance(kt, list):
        result["key_terms"] = [
            {"term": str(t.get("term", "")), "definition": str(t.get("definition", ""))}
            for t in kt if isinstance(t, dict)
        ]
    result["eli5"] = data.get("eli5") if isinstance(data.get("eli5"), str) else ""
    return result
