import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header from './components/Header';
import TaskSelector from './components/TaskSelector';
import UploadArea from './components/UploadArea';
import LoadingSpinner from './components/ProgressBar';
import SummaryCard from './components/SummaryCard';
import StudyWorkspace from './components/StudyWorkspace';
import CompareWorkspace from './components/CompareWorkspace';
import HistoryPanel from './components/HistoryPanel';
import { submitSummarizeJob, fetchHistoryItem, prepareDocument, compareDocuments } from './api/client';
import type { SummaryResponse, PreparedDoc, CompareResult, DocInput, TaskKey } from './types';

// Phase 1: every task reuses the summarize pipeline and opens the matching result tab.
const TASK_TO_TAB: Record<TaskKey, string> = {
  summarize: 'summary',
  study: 'study',
  ask: 'ask',
  risk: 'risk',
  action: 'actions',
  evidence: 'evidence',
  compare: 'summary',
};

const TASK_HERO: Record<TaskKey, { title: string; subtitle: string }> = {
  summarize: { title: 'Summarize Any Document Instantly', subtitle: 'Drop in a PDF, DOCX, or TXT file, or paste your text, and get a clear, accurate AI summary in seconds.' },
  study: { title: 'Turn Any Document into a Study Pack', subtitle: 'Upload or paste your material and generate flashcards, a quiz, and key terms to learn faster.' },
  ask: { title: 'Ask Questions About Your Document', subtitle: 'Upload or paste content, then chat with it — answers are grounded in your document.' },
  compare: { title: 'Compare Two Documents Side by Side', subtitle: 'See similarities, differences, contradictions, and a final conclusion across two files.' },
  risk: { title: 'Surface Risks and Red Flags Fast', subtitle: 'Upload or paste a document and get risks, assumptions, missing info, and follow-up questions.' },
  action: { title: 'Extract a Clear Action Plan', subtitle: 'Turn any document into concrete tasks, decisions, and next steps you can act on.' },
  evidence: { title: 'Map Claims to Their Evidence', subtitle: 'Upload or paste a document and see each key claim backed by supporting evidence.' },
};

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const App: React.FC = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [preparedDoc, setPreparedDoc] = useState<PreparedDoc | null>(null);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // forces a fresh UploadArea on reset
  const [task, setTask] = useState<TaskKey>('summarize');
  const [resultTab, setResultTab] = useState<string>('summary');

  const queryClient = useQueryClient();

  const summarizeMutation = useMutation({
    mutationFn: ({ files, text, sentences, style, customInstructions, length, tone }: { files: File[]; text: string | null; sentences: number; style: string; customInstructions: string; length: string; tone: string }) =>
      submitSummarizeJob(files, text, sentences, style, customInstructions, length, tone),
    onSuccess: (data) => {
      setSummary(data);
      setActiveFilename(null);
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const historyMutation = useMutation({
    mutationFn: (jobId: string) => fetchHistoryItem(jobId),
    onSuccess: (data) => {
      setSummary(data);
      setActiveFilename(data.filename || 'Text input');
    },
  });

  // Study task: prepare the document (extract text, no summary), then open StudyWorkspace.
  const prepareMutation = useMutation({
    mutationFn: ({ files, text }: { files: File[]; text: string | null }) => prepareDocument(files, text),
    onSuccess: (data) => setPreparedDoc(data),
  });

  // Compare task: two documents in, structured comparison out (stateless).
  const compareMutation = useMutation({
    mutationFn: ({ a, b }: { a: DocInput; b: DocInput }) => compareDocuments(a, b),
    onSuccess: (data) => setComparison(data),
  });

  const handleCompare = (a: DocInput, b: DocInput) => {
    setHistoryOpen(false);
    setSummary(null);
    setPreparedDoc(null);
    setActiveFilename(a.file?.name || b.file?.name || 'Comparison');
    compareMutation.reset();
    compareMutation.mutate({ a, b });
  };

  const focusInput = () => {
    window.setTimeout(() => {
      document.getElementById('text-input')?.focus();
    }, 60);
  };

  const handleSubmit = (files: File[], text: string | null, sentences: number, style: string, customInstructions: string, length: string, tone: string) => {
    setHistoryOpen(false);
    setActiveFilename(files.length > 0 ? files.map(f => f.name).join(', ') : 'Text input');
    setSummary(null);
    setPreparedDoc(null);
    setComparison(null);

    // Study runs standalone: prepare the document, then StudyWorkspace generates the pack.
    if (task === 'study') {
      prepareMutation.reset();
      prepareMutation.mutate({ files, text });
      return;
    }

    setResultTab(TASK_TO_TAB[task] || 'summary'); // open the tab matching the chosen task
    summarizeMutation.reset();
    summarizeMutation.mutate({ files, text, sentences, style, customInstructions, length, tone });
  };

  const handleSelectJob = (jobId: string) => {
    setHistoryOpen(false);
    setResultTab('summary'); // history always reopens on the Summary tab
    summarizeMutation.reset();
    setSummary(null);
    setPreparedDoc(null);
    setComparison(null);
    historyMutation.mutate(jobId);
  };

  // Full reset back to the main input state (used by Summarize Another, Get Started, logo)
  const handleReset = () => {
    summarizeMutation.reset();
    historyMutation.reset();
    prepareMutation.reset();
    compareMutation.reset();
    setSummary(null);
    setPreparedDoc(null);
    setComparison(null);
    setActiveFilename(null);
    setHistoryOpen(false);
    setResetKey(k => k + 1);
    focusInput();
  };

  const isLoading = summarizeMutation.isPending || historyMutation.isPending || prepareMutation.isPending || compareMutation.isPending;
  const error = summarizeMutation.error?.message || historyMutation.error?.message || prepareMutation.error?.message || compareMutation.error?.message || null;
  const hasResult = !!summary || !!preparedDoc || !!comparison;
  const view: 'idle' | 'loading' | 'result' = isLoading ? 'loading' : hasResult ? 'result' : 'idle';

  return (
    <div className="app-container">
      <Header
        onHistoryToggle={() => setHistoryOpen(o => !o)}
        historyOpen={historyOpen}
        onGetStarted={handleReset}
        onLogo={handleReset}
      />

      <main className="main-layout">
        <div className="content-container">
          {error && (
            <div className="error-banner animate-in">
              <div className="error-banner-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
              <button className="error-dismiss-btn" onClick={handleReset}>&times;</button>
            </div>
          )}

          {/* Hero shown for input + loading so the brand/structure stays consistent */}
          {view !== 'result' && (
            <div className={`hero ${view === 'loading' ? 'hero--compact' : ''}`}>
              <div className="hero-badge">
                <span className="hero-badge-dark"><StarIcon /> AI</span>
                <span className="hero-badge-light">AI Document Workspace</span>
              </div>
              <h1 className="hero-title">Understand, Study, Compare &amp; Analyze Documents with AI</h1>
              {view === 'idle' && (
                <p className="hero-subtitle">{TASK_HERO[task].subtitle}</p>
              )}
            </div>
          )}

          {view === 'idle' && (
            <>
              <TaskSelector value={task} onChange={setTask} />
              <UploadArea key={`${task}-${resetKey}`} task={task} onSubmit={handleSubmit} onCompare={handleCompare} />
            </>
          )}

          {view === 'loading' && <LoadingSpinner filename={activeFilename} />}

          {view === 'result' && comparison && (
            <CompareWorkspace result={comparison} onReset={handleReset} />
          )}

          {view === 'result' && !comparison && preparedDoc && (
            <StudyWorkspace key={preparedDoc.job_id} doc={preparedDoc} onReset={handleReset} />
          )}

          {view === 'result' && !comparison && !preparedDoc && summary && (
            <SummaryCard key={summary.job_id} summary={summary} onReset={handleReset} initialTab={resultTab} />
          )}
        </div>
      </main>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectJob={handleSelectJob}
      />
    </div>
  );
};

export default App;
