"""Summary agent — style / length / tone aware summarization."""
from .base import MODEL, get_client, truncate as _truncate

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
