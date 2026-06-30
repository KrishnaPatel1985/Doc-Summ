import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header from './components/Header';
import UploadArea from './components/UploadArea';
import LoadingSpinner from './components/ProgressBar';
import SummaryCard from './components/SummaryCard';
import HistoryPanel from './components/HistoryPanel';
import { submitSummarizeJob, fetchHistoryItem } from './api/client';
import type { SummaryResponse } from './types';

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const App: React.FC = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // forces a fresh UploadArea on reset

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

  const focusInput = () => {
    window.setTimeout(() => {
      document.getElementById('text-input')?.focus();
    }, 60);
  };

  const handleSubmit = (files: File[], text: string | null, sentences: number, style: string, customInstructions: string, length: string, tone: string) => {
    setHistoryOpen(false);
    setActiveFilename(files.length > 0 ? files.map(f => f.name).join(', ') : 'Text input');
    setSummary(null);
    summarizeMutation.reset();
    summarizeMutation.mutate({ files, text, sentences, style, customInstructions, length, tone });
  };

  const handleSelectJob = (jobId: string) => {
    setHistoryOpen(false);
    summarizeMutation.reset();
    setSummary(null);
    historyMutation.mutate(jobId);
  };

  // Full reset → back to the main input state (used by Summarize Another, Get Started, logo)
  const handleReset = () => {
    summarizeMutation.reset();
    historyMutation.reset();
    setSummary(null);
    setActiveFilename(null);
    setHistoryOpen(false);
    setResetKey(k => k + 1);
    focusInput();
  };

  const isLoading = summarizeMutation.isPending || historyMutation.isPending;
  const error = summarizeMutation.error?.message || historyMutation.error?.message || null;
  const view: 'idle' | 'loading' | 'result' = isLoading ? 'loading' : summary ? 'result' : 'idle';

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

          {/* Hero — shown for input + loading so the brand/structure stays consistent */}
          {view !== 'result' && (
            <div className={`hero ${view === 'loading' ? 'hero--compact' : ''}`}>
              <div className="hero-badge">
                <span className="hero-badge-dark"><StarIcon /> AI</span>
                <span className="hero-badge-light">Powered by GPT-4o-mini</span>
              </div>
              <h1 className="hero-title">Summarize Any<br />Document Instantly</h1>
              {view === 'idle' && (
                <p className="hero-subtitle">
                  Drop in a PDF, DOCX, or TXT file — or paste your text —<br />
                  and get a clear, accurate AI summary in seconds.
                </p>
              )}
            </div>
          )}

          {view === 'idle' && <UploadArea key={resetKey} onSubmit={handleSubmit} />}

          {view === 'loading' && <LoadingSpinner filename={activeFilename} />}

          {view === 'result' && summary && (
            <SummaryCard summary={summary} onReset={handleReset} />
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
