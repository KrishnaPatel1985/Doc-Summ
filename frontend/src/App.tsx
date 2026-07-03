import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header from './components/Header';
import TaskSelector from './components/TaskSelector';
import UploadArea from './components/UploadArea';
import MarketingSections from './components/MarketingSections';
import AgentPipeline from './components/AgentPipeline';
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
  const [resultWorkflow, setResultWorkflow] = useState<TaskKey>('summarize');

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
    mutationFn: ({ a, b, focus }: { a: DocInput; b: DocInput; focus: string }) => compareDocuments(a, b, focus),
    onSuccess: (data) => setComparison(data),
  });

  const handleCompare = (a: DocInput, b: DocInput, focus: string) => {
    setHistoryOpen(false);
    setSummary(null);
    setPreparedDoc(null);
    setActiveFilename(a.file?.name || b.file?.name || 'Comparison');
    compareMutation.reset();
    compareMutation.mutate({ a, b, focus });
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
    setResultWorkflow(task);                       // controls which result tabs are shown
    summarizeMutation.reset();
    summarizeMutation.mutate({ files, text, sentences, style, customInstructions, length, tone });
  };

  const handleSelectJob = (jobId: string) => {
    setHistoryOpen(false);
    setResultTab('summary'); // history always reopens on the Summary tab
    setResultWorkflow('summarize'); // saved jobs show the full summarize tab set
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
                <span className="hero-badge-dark"><StarIcon /></span>
                <span className="hero-badge-light">AI Document Command Center</span>
              </div>
              <h1 className="hero-title">Turn Documents into Summaries, Study Tools, Comparisons &amp; Evidence-Backed Insights</h1>
              {view === 'idle' && (
                <p className="hero-subtitle">
                  Upload PDFs, DOCX, TXT files, or paste text. Choose a workflow and let DocSumm analyze, question, compare, and transform your documents.
                </p>
              )}
            </div>
          )}

          {view === 'idle' && (
            <>
              <div className="command-center">
                <TaskSelector value={task} onChange={setTask} />
                <UploadArea key={`${task}-${resetKey}`} task={task} onSubmit={handleSubmit} onCompare={handleCompare} />
              </div>
              <MarketingSections />
            </>
          )}

          {view === 'loading' && <AgentPipeline task={task} filename={activeFilename} />}

          {view === 'result' && comparison && (
            <CompareWorkspace result={comparison} onReset={handleReset} />
          )}

          {view === 'result' && !comparison && preparedDoc && (
            <StudyWorkspace key={preparedDoc.job_id} doc={preparedDoc} onReset={handleReset} />
          )}

          {view === 'result' && !comparison && !preparedDoc && summary && (
            <SummaryCard key={summary.job_id} summary={summary} onReset={handleReset} initialTab={resultTab} workflow={resultWorkflow} />
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
