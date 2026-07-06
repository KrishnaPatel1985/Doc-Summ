import React, { useRef, useState } from 'react';
import type { PreparedDoc, StudyData, StudyOptions } from '../types';
import { fetchStudy } from '../api/client';
import QuizPanel from './QuizPanel';
import './StudyWorkspace.css';

interface StudyWorkspaceProps {
  doc: PreparedDoc;
  onReset: () => void;
}

const DIFFICULTIES: StudyOptions['difficulty'][] = ['beginner', 'intermediate', 'advanced'];
const QUIZ_TYPES: { value: StudyOptions['quiz_type']; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
];
const COUNTS = [5, 10, 15, 20];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const emptyStudy: StudyData = { flashcards: [], quiz: [], key_terms: [], eli5: '' };

const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({ doc, onReset }) => {
  const [options, setOptions] = useState<StudyOptions>({
    flashcard_count: 10,
    quiz_count: 5,
    difficulty: 'intermediate',
    quiz_type: 'mixed',
  });
  const [study, setStudy] = useState<StudyData>(emptyStudy);
  const [busy, setBusy] = useState<'initial' | 'regenerate' | 'regenerate-quiz' | 'more-cards' | 'more-quiz' | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [quizResetKey, setQuizResetKey] = useState(0);

  // Mirror the selected options in a ref so the click handler always sends the
  // latest selection, immune to any stale closure over `options`.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const set = (patch: Partial<StudyOptions>) => setOptions(o => ({ ...o, ...patch }));

  const run = async (mode: 'initial' | 'regenerate' | 'regenerate-quiz' | 'more-cards' | 'more-quiz') => {
    setBusy(mode);
    setHasRun(true);
    setError(null);
    try {
      const data = await fetchStudy(doc.job_id, optionsRef.current);
      if (mode === 'more-cards') {
        setStudy(s => ({ ...s, flashcards: [...s.flashcards, ...data.flashcards] }));
      } else if (mode === 'more-quiz') {
        setStudy(s => ({ ...s, quiz: [...s.quiz, ...data.quiz] }));
      } else if (mode === 'regenerate-quiz') {
        setStudy(s => ({ ...s, quiz: data.quiz }));
        setQuizResetKey(k => k + 1);
      } else {
        setStudy(data);
        setFlipped({});
        setQuizResetKey(k => k + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copyFlashcards = async () => {
    if (!study.flashcards.length) return;
    const text = study.flashcards
      .map((c, i) => `${i + 1}. Q: ${c.front}\n   A: ${c.back}${c.topic ? `\n   [${c.topic}]` : ''}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isInitialLoading = busy === 'initial' && study.flashcards.length === 0 && study.quiz.length === 0;

  return (
    <div className="study-workspace animate-in">
      {/* Header */}
      <div className="sw-header">
        <div className="sw-title-row">
          <div className="sw-icon">🎓</div>
          <div>
            <h2 className="sw-heading">Study Pack</h2>
            <p className="sw-filename" title={doc.filename || 'Text input'}>{doc.filename || 'Text input'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onReset}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
          New document
        </button>
      </div>

      {/* Options */}
      <div className="sw-options">
        <div className="sw-option-row">
          <span className="sw-option-label">Difficulty</span>
          <div className="sw-pills">
            {DIFFICULTIES.map(d => (
              <button key={d} className={`sw-pill ${options.difficulty === d ? 'active' : ''}`} onClick={() => set({ difficulty: d })}>{cap(d)}</button>
            ))}
          </div>
        </div>
        <div className="sw-option-row">
          <span className="sw-option-label">Quiz type</span>
          <div className="sw-pills">
            {QUIZ_TYPES.map(q => (
              <button key={q.value} className={`sw-pill ${options.quiz_type === q.value ? 'active' : ''}`} onClick={() => set({ quiz_type: q.value })}>{q.label}</button>
            ))}
          </div>
        </div>
        <div className="sw-option-row">
          <span className="sw-option-label">Flashcards</span>
          <div className="sw-pills">
            {COUNTS.map(n => (
              <button key={n} className={`sw-pill ${options.flashcard_count === n ? 'active' : ''}`} onClick={() => set({ flashcard_count: n })}>{n}</button>
            ))}
          </div>
        </div>
        <div className="sw-option-row">
          <span className="sw-option-label">Quiz questions</span>
          <div className="sw-pills">
            {COUNTS.map(n => (
              <button key={n} className={`sw-pill ${options.quiz_count === n ? 'active' : ''}`} onClick={() => set({ quiz_count: n })}>{n}</button>
            ))}
          </div>
        </div>
        <div className="sw-option-actions">
          <button className="btn btn-primary" onClick={() => run(hasRun ? 'regenerate' : 'initial')} disabled={!!busy}>
            {busy === 'regenerate' || busy === 'initial'
              ? 'Generating…'
              : hasRun ? 'Regenerate pack' : 'Generate study pack'}
          </button>
        </div>
      </div>

      {error && <div className="sw-error">{error}</div>}

      {!hasRun ? (
        <div className="sw-empty">
          Choose your difficulty, quiz type, and counts above, then click
          <strong> Generate study pack</strong> to build flashcards and a quiz from this document.
        </div>
      ) : isInitialLoading ? (
        <div className="sw-loading"><div className="spinner" /> Building your study pack…</div>
      ) : (
        <div className="sw-sections">
          {/* ELI5 */}
          {study.eli5 && (
            <section className="sw-section">
              <h3>🧒 Beginner Explanation</h3>
              <p className="sw-eli5">{study.eli5}</p>
            </section>
          )}

          {/* Flashcards */}
          <section className="sw-section">
            <div className="sw-section-head">
              <h3>🃏 Flashcards <small>({study.flashcards.length}) · click to flip</small></h3>
              <div className="sw-section-actions">
                <button className="btn btn-ghost" onClick={copyFlashcards} disabled={!study.flashcards.length}>{copied ? 'Copied!' : 'Copy'}</button>
                <button className="btn btn-ghost" onClick={() => run('more-cards')} disabled={!!busy}>{busy === 'more-cards' ? 'Adding…' : 'Generate more'}</button>
              </div>
            </div>
            {study.flashcards.length ? (
              <div className="sw-flashcards">
                {study.flashcards.map((c, i) => (
                  <button key={i} className={`sw-flashcard ${flipped[i] ? 'flipped' : ''}`} onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}>
                    <span className="sw-flashcard-top">
                      <span className="sw-flashcard-label">{flipped[i] ? 'Answer' : 'Question'}</span>
                      {c.topic && <span className="sw-flashcard-topic">{c.topic}</span>}
                    </span>
                    <span className="sw-flashcard-text">{flipped[i] ? c.back : c.front}</span>
                  </button>
                ))}
              </div>
            ) : <p className="sw-empty">No flashcards generated.</p>}
          </section>

          {/* Quiz — interactive taking + scoring (Phase 3) */}
          <section className="sw-section">
            <div className="sw-section-head">
              <h3>❓ Quiz <small>({study.quiz.length} questions)</small></h3>
            </div>
            <QuizPanel
              questions={study.quiz}
              resetKey={quizResetKey}
              docId={doc.job_id}
              onRegenerate={() => run('regenerate-quiz')}
              onGenerateMore={() => run('more-quiz')}
              regenBusy={busy === 'regenerate-quiz'}
              moreBusy={busy === 'more-quiz'}
            />
          </section>

          {/* Key terms */}
          {study.key_terms.length > 0 && (
            <section className="sw-section">
              <h3>📚 Key Terms</h3>
              <dl className="sw-terms">
                {study.key_terms.map((t, i) => (
                  <div key={i} className="sw-term"><dt>{t.term}</dt><dd>{t.definition}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyWorkspace;
