"""Q&A agent — answers grounded strictly in the document."""
from .base import MODEL, get_client, truncate as _truncate


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
