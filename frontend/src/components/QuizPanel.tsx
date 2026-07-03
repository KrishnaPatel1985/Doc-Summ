import React, { useEffect, useMemo, useState } from 'react';
import type { QuizQuestion, QuizAttempt } from '../types';
import { saveQuizResult, fetchQuizResults } from '../api/client';

interface QuizPanelProps {
  questions: QuizQuestion[];
  resetKey: number;          // bumped by parent on "regenerate quiz" to clear all state
  docId: string;             // localStorage key for attempts
  onRegenerate: () => void;
  onGenerateMore: () => void;
  regenBusy: boolean;
  moreBusy: boolean;
}

const attemptsKey = (id: string) => `docsumm:quiz:${id}`;
const loadAttempts = (id: string): QuizAttempt[] => {
  try { return JSON.parse(localStorage.getItem(attemptsKey(id)) || '[]'); } catch { return []; }
};
const saveAttempts = (id: string, a: QuizAttempt[]) => {
  try { localStorage.setItem(attemptsKey(id), JSON.stringify(a)); } catch { /* ignore */ }
};

const isGradable = (q: QuizQuestion) => q.options.length > 0;

const QuizPanel: React.FC<QuizPanelProps> = ({
  questions, resetKey, docId, onRegenerate, onGenerateMore, regenBusy, moreBusy,
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>(() => loadAttempts(docId));

  // Load persisted attempts from the server (falls back to the localStorage seed).
  useEffect(() => {
    let active = true;
    fetchQuizResults(docId)
      .then(rows => { if (active && rows.length) { setAttempts(rows); saveAttempts(docId, rows); } })
      .catch(() => { /* offline — keep localStorage attempts */ });
    return () => { active = false; };
  }, [docId]);

  // Full reset when the parent regenerates the quiz.
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
  }, [resetKey]);

  // If more questions were appended, drop back into "taking" mode so new ones can be answered.
  useEffect(() => {
    setSubmitted(false);
  }, [questions.length]);

  const gradableCount = useMemo(() => questions.filter(isGradable).length, [questions]);

  const allAnswered = questions.length > 0 && questions.every((_, i) => (answers[i] ?? '').trim() !== '');

  const correctCount = useMemo(
    () => questions.reduce((n, q, i) => (isGradable(q) && answers[i] === q.answer ? n + 1 : n), 0),
    [questions, answers],
  );
  const pct = gradableCount ? Math.round((correctCount / gradableCount) * 100) : 0;
  const bestPct = attempts.length ? Math.max(...attempts.map(a => (a.total ? Math.round((a.score / a.total) * 100) : 0))) : null;

  const pick = (qi: number, value: string) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qi]: value }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradableCount > 0) {
      const attempt: QuizAttempt = { score: correctCount, total: gradableCount, at: Date.now() };
      const next = [attempt, ...attempts].slice(0, 20);
      setAttempts(next);
      saveAttempts(docId, next);
      // Persist to the server (Phase 5); localStorage above is the offline fallback.
      saveQuizResult(docId, correctCount, gradableCount, answers).catch(() => { /* ignore */ });
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  if (!questions.length) {
    return <p className="sw-empty">No quiz questions generated.</p>;
  }

  return (
    <div className="qp">
      {submitted && (
        <div className="qp-scorebar">
          {gradableCount > 0 ? (
            <>
              <span className="qp-score">{correctCount}/{gradableCount} correct</span>
              <span className={`qp-score-pct ${pct >= 70 ? 'good' : pct >= 40 ? 'ok' : 'low'}`}>{pct}%</span>
            </>
          ) : (
            <span className="qp-score">Review mode — self-check your answers below</span>
          )}
          {bestPct !== null && <span className="qp-best">Best: {bestPct}% · {attempts.length} attempt{attempts.length > 1 ? 's' : ''}</span>}
        </div>
      )}

      <div className="qp-list">
        {questions.map((q, i) => {
          const chosen = answers[i];
          const gradable = isGradable(q);
          const questionCorrect = submitted && gradable && chosen === q.answer;
          return (
            <div key={i} className={`qp-q ${submitted && gradable ? (questionCorrect ? 'is-correct' : 'is-wrong') : ''}`}>
              <p className="qp-question">
                <span className="qp-qnum">{i + 1}</span>
                {q.question}
              </p>

              {gradable ? (
                <div className="qp-options">
                  {q.options.map((opt, oi) => {
                    const selected = chosen === opt;
                    let state = '';
                    if (submitted) {
                      if (opt === q.answer) state = 'correct';
                      else if (selected) state = 'wrong';
                    } else if (selected) {
                      state = 'selected';
                    }
                    return (
                      <button
                        key={oi}
                        type="button"
                        className={`qp-opt ${state}`}
                        onClick={() => pick(i, opt)}
                        disabled={submitted}
                      >
                        <span className="qp-opt-mark" aria-hidden="true" />
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="qp-short-input"
                  placeholder="Type your answer…"
                  value={chosen ?? ''}
                  onChange={e => pick(i, e.target.value)}
                  disabled={submitted}
                />
              )}

              {submitted && (
                <div className="qp-feedback">
                  {gradable ? (
                    <span className={`qp-verdict ${questionCorrect ? 'good' : 'bad'}`}>
                      {questionCorrect ? '✓ Correct' : `✗ Correct answer: ${q.answer}`}
                    </span>
                  ) : (
                    <span className="qp-verdict review">Model answer: {q.answer}</span>
                  )}
                  {q.explanation && <p className="qp-explain">{q.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="qp-actions">
        {!submitted ? (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!allAnswered}>
            {allAnswered ? 'Submit quiz' : 'Answer all questions to submit'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleRetry}>Retry quiz</button>
        )}
        <button className="btn btn-ghost" onClick={onRegenerate} disabled={regenBusy}>
          {regenBusy ? 'Regenerating…' : 'Regenerate quiz'}
        </button>
        <button className="btn btn-ghost" onClick={onGenerateMore} disabled={moreBusy}>
          {moreBusy ? 'Adding…' : 'Generate more'}
        </button>
      </div>
    </div>
  );
};

export default QuizPanel;
