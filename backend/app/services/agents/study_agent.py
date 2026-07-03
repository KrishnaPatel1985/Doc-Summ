"""Study agent — flashcards, quiz, key terms, ELI5 (count/difficulty/type aware)."""
import json

from .base import MODEL, get_client, truncate as _truncate

EMPTY_STUDY = {"flashcards": [], "quiz": [], "key_terms": [], "eli5": ""}


_DIFFICULTY_GUIDE = {
    "beginner": "Keep questions and wording simple and foundational; test core concepts only.",
    "intermediate": "Use moderately challenging questions that require understanding, not just recall.",
    "advanced": "Use challenging questions that require deeper analysis, synthesis, and edge cases.",
}
_QUIZ_TYPE_GUIDE = {
    "multiple_choice": 'Every quiz item MUST be multiple choice with exactly 4 options.',
    "true_false": 'Every quiz item MUST be True/False — options are exactly ["True", "False"].',
    "short_answer": 'Every quiz item is short-answer: provide an empty "options" array and put the ideal concise answer in "answer".',
    "mixed": 'Mix multiple-choice (4 options), True/False (2 options), and short-answer (empty options) items.',
}


def _clamp_count(n, default: int) -> int:
    try:
        n = int(n)
    except (TypeError, ValueError):
        return default
    return max(1, min(30, n))


def generate_study(
    text: str,
    flashcard_count: int = 5,
    quiz_count: int = 5,
    difficulty: str = "intermediate",
    quiz_type: str = "mixed",
) -> dict:
    text = _truncate(text)
    fc_n = _clamp_count(flashcard_count, 5)
    qz_n = _clamp_count(quiz_count, 5)
    diff = (difficulty or "intermediate").lower()
    qtype = (quiz_type or "mixed").lower()
    diff_guide = _DIFFICULTY_GUIDE.get(diff, _DIFFICULTY_GUIDE["intermediate"])
    qtype_guide = _QUIZ_TYPE_GUIDE.get(qtype, _QUIZ_TYPE_GUIDE["mixed"])

    system_prompt = (
        "You are an expert tutor. From the provided document, create study material as a JSON object "
        "with EXACTLY these keys:\n"
        f'- "flashcards": array of {fc_n} objects, each {{"front": question/term, "back": answer/definition, "topic": short topic tag}}.\n'
        f'- "quiz": array of {qz_n} objects, each {{"question": str, "options": array of option strings, "answer": the exact correct option string (or ideal answer for short-answer), "explanation": one sentence explaining why the answer is correct}}.\n'
        '- "key_terms": array of objects, each {"term": str, "definition": str} for important terms.\n'
        '- "eli5": a clear beginner-friendly explanation of the document in 3-5 sentences.\n'
        f"Difficulty: {diff}. {diff_guide}\n"
        f"Quiz format: {qtype_guide}\n"
        "Base everything strictly on the document content. Respond with valid JSON only."
    )
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create study material from this document:\n\n{text}"},
            ],
            max_tokens=2600,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
    except Exception:
        return dict(EMPTY_STUDY)

    result = {"flashcards": [], "quiz": [], "key_terms": [], "eli5": ""}
    fc = data.get("flashcards")
    if isinstance(fc, list):
        result["flashcards"] = [
            {
                "front": str(c.get("front", "")),
                "back": str(c.get("back", "")),
                "topic": str(c.get("topic", "")),
            }
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
                "explanation": str(q.get("explanation", "")),
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
