import os
import tempfile
from pathlib import Path


with tempfile.TemporaryDirectory(prefix="docsumm-smoke-") as tmp_dir:
    tmp_path = Path(tmp_dir)
    os.environ["DATABASE_URL"] = f"sqlite:///{(tmp_path / 'smoke.db').as_posix()}"
    os.environ["UPLOAD_DIR"] = str(tmp_path / "uploads")

    from fastapi.testclient import TestClient
    from main import app
    import app.api.intelligence as intelligence_api
    import app.api.summarize as summarize_api
    from app.db import engine

    def fake_summarize_text(
        text: str,
        sentences_count: int = 7,
        style: str = "paragraph",
        custom_instructions: str = "",
        length: str = "medium",
        tone: str = "professional",
    ) -> str:
        return f"Smoke summary ({style}, {length}, {tone}) for {len(text)} chars."

    def fake_analyze_document(text: str) -> dict:
        print("fake analyze called")
        return {
            "main_topic": "Smoke test document",
            "key_takeaways": ["The current API returns a completed summary."],
            "entities": ["DocSumm"],
            "numbers": ["One synchronous summary response"],
            "risks": [],
            "opportunities": ["Keep smoke tests fast and deterministic."],
            "action_items": ["Verify current API behavior."],
            "evidence_map": [{
                "claim": "The smoke test checks the current API flow.",
                "evidence_snippet": "Artificial intelligence is transforming industries.",
                "source": "Document content",
                "confidence": "High",
            }],
            "risk_report": {
                "risks": ["External AI calls should stay mocked in smoke tests."],
                "opportunities": ["Keep smoke tests fast and deterministic."],
                "assumptions": ["The API routes are mounted under /api."],
                "missing_information": ["No production database is used in this test."],
                "follow_up_questions": ["Do history items reopen the full result payload?"],
                "red_flags": [{
                    "issue": "Unmocked external dependency",
                    "why_it_matters": "It would make the smoke test slow or flaky.",
                    "suggested_follow_up": "Keep summarizer functions patched.",
                }],
            },
        }

    def fake_answer_question(text: str, question: str) -> str:
        return f"Smoke answer for: {question}"

    def fake_generate_study(text: str) -> dict:
        return {
            "flashcards": [{"front": "What is tested?", "back": "The current API flow."}],
            "quiz": [{
                "question": "What status should summarize return?",
                "options": ["200", "202", "404", "500"],
                "answer": "200",
            }],
            "key_terms": [{"term": "Smoke test", "definition": "A quick end-to-end sanity check."}],
            "eli5": "This checks the main backend routes without calling external AI services.",
        }

    summarize_api.summarize_text = fake_summarize_text
    summarize_api.analyze_document = fake_analyze_document
    intelligence_api.answer_question = fake_answer_question
    intelligence_api.generate_study = fake_generate_study

    print("Starting backend smoke test...")

    try:
        with TestClient(app) as client:
            response = client.get("/health")
            assert response.status_code == 200, response.text
            print("Health OK")

            response = client.post(
                "/api/summarize",
                data={
                    "text": "Artificial intelligence is transforming industries. " * 30,
                    "sentences": "5",
                    "style": "paragraph",
                    "length": "medium",
                    "tone": "professional",
                },
            )
            assert response.status_code == 200, response.text
            summary = response.json()
            print(summary)
            assert summary["status"] == "done"
            assert summary["summary"]
            assert summary["key_insights"]["main_topic"] == "Smoke test document"
            assert summary["action_items"] == ["Verify current API behavior."]
            assert summary["file_type"] == "text"
            assert summary["document_preview"]
            assert summary["source_snippets"]
            assert summary["key_insights"]["evidence_map"][0]["source"] == "Document content"
            assert summary["key_insights"]["risk_report"]["red_flags"][0]["issue"] == "Unmocked external dependency"
            job_id = summary["job_id"]
            print(f"Summary OK ({summary['char_count_summary']} chars)")

            response = client.get(f"/api/summary/{job_id}")
            assert response.status_code == 200, response.text
            assert response.json()["job_id"] == job_id
            print("Summary lookup OK")

            response = client.get("/api/history")
            assert response.status_code == 200, response.text
            history = response.json()
            assert len(history) == 1
            assert history[0]["job_id"] == job_id
            print("History OK")

            response = client.get(f"/api/history/{job_id}")
            assert response.status_code == 200, response.text
            assert response.json()["summary"] == summary["summary"]
            print("History item OK")

            response = client.post(
                "/api/ask",
                json={"job_id": job_id, "question": "What changed in the API?"},
            )
            assert response.status_code == 200, response.text
            assert "Smoke answer" in response.json()["answer"]
            print("Ask Document OK")

            response = client.post(f"/api/study/{job_id}")
            assert response.status_code == 200, response.text
            study = response.json()
            assert study["flashcards"]
            assert study["quiz"]
            assert study["key_terms"]
            assert study["eli5"]
            print("Study Mode OK")
    finally:
        engine.dispose()

    print("\nAll backend smoke tests passed!")
