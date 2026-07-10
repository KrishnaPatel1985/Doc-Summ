import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header from './components/Header';
import TaskSelector from './components/TaskSelector';
import UploadArea from './components/UploadArea';
import MarketingSections from './components/MarketingSections';
import Footer from './components/Footer';
import AgentPipeline from './components/AgentPipeline';
import AgentContextPanel from './components/AgentContextPanel';
import SummaryCard from './components/SummaryCard';
import StudyWorkspace from './components/StudyWorkspace';
import CompareWorkspace from './components/CompareWorkspace';
import HistoryPanel from './components/HistoryPanel';
import AuthModal from './components/AuthModal';
import type { AuthMode } from './components/AuthModal';
import { useAuth } from './auth/AuthContext';
import { submitSummarizeJob, fetchHistoryItem, prepareDocument, compareDocuments } from './api/client';
import type { SummaryResponse, PreparedDoc, CompareResult, DocInput, TaskKey } from './types';

const NAV_LINKS = [
  { label: 'Product', target: 'composer' },
  { label: 'Workflows', target: 'workflows' },
  { label: 'How It Works', target: 'how-it-works' },
];

// Every task reuses the summarize pipeline and opens the matching result tab.
const TASK_TO_TAB: Record<TaskKey, string> = {
  summarize: 'summary',
  study: 'study',
  ask: 'ask',
  risk: 'risk',
  action: 'actions',
  evidence: 'evidence',
  compare: 'summary',
};

// One-click demo content so anyone can run a real workflow without their own file.
const SAMPLE_DOC =
  'Q3 Performance Review — Northwind Analytics. Revenue reached $8.4M in Q3 2025, up 18% year over year, driven by strong enterprise renewals (net revenue retention of 112%). Gross margin held at 74%. Leadership flagged three risks: (1) a key infrastructure vendor contract expires in January with a proposed 20% price increase, (2) two senior platform engineers have given notice, and (3) cloud costs grew 31% and are not yet optimized. The board approved hiring 12 engineers by Q1 and allocated $500K to a reliability initiative. Recommended next steps: renegotiate the vendor contract before December, begin backfill hiring immediately, and complete a cloud cost audit by the end of Q4. The CFO, Dana Reyes, will present the revised forecast at the January board meeting.';
const SAMPLE_A =
  'Vendor Proposal A — CloudScale. Total cost: $50,000 for a 12-month engagement. Deployment: on-premise. Timeline: 6 months to full rollout. Support: 24/7 included for 12 months. Data residency: customer-controlled. SLA: 99.9% uptime. Includes a dedicated implementation manager.';
const SAMPLE_B =
  'Vendor Proposal B — NimbusWorks. Total cost: $42,000 for a 12-month engagement. Deployment: cloud-hosted. Timeline: 9 months to full rollout. Support: business hours only for the first 6 months, then paid renewal. Data residency: vendor-managed. SLA: 99.5% uptime. Includes quarterly reviews.';

const App: React.FC = () => {
  const [mode, setMode] = useState<'landing' | 'app'>('landing');
  const [contextOpen, setContextOpen] = useState(true);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [preparedDoc, setPreparedDoc] = useState<PreparedDoc | null>(null);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // forces a fresh UploadArea on reset
  const [task, setTask] = useState<TaskKey>('summarize');
  const [resultTab, setResultTab] = useState<string>('summary');
  const [resultWorkflow, setResultWorkflow] = useState<TaskKey>('summarize');
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const { user, authReady, signOut } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authReady) {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }
  }, [authReady, user?.id, queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (window.location.pathname === '/reset-password' && token) {
      setResetToken(token);
      setAuthModal('reset');
    }
  }, []);

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
    setMode('app');
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
    setMode('app');
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

  // Run a real workflow on sample content (uses the same backend path).
  const runSample = () => {
    if (task === 'compare') {
      handleCompare({ file: null, text: SAMPLE_A }, { file: null, text: SAMPLE_B }, '');
    } else {
      handleSubmit([], SAMPLE_DOC, 7, 'paragraph', '', 'medium', 'professional');
    }
  };

  const handleSelectJob = (jobId: string) => {
    setMode('app');
    setHistoryOpen(false);
    setResultTab('summary'); // history always reopens on the Summary tab
    setResultWorkflow('summarize'); // saved jobs show the full summarize tab set
    summarizeMutation.reset();
    setSummary(null);
    setPreparedDoc(null);
    setComparison(null);
    historyMutation.mutate(jobId);
  };

  // Full reset back to the composer (used by Summarize Another, New Analysis, logo).
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

  const handleMissionChange = (m: TaskKey) => {
    setTask(m);
    if (summary || preparedDoc || comparison) handleReset();
  };

  const enterApp = () => { setMode('app'); handleReset(); };

  const scrollToSection = (target: string) => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const authModalEl = authModal && (
    <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitch={setAuthModal} resetToken={resetToken} />
  );

  const isLoading = summarizeMutation.isPending || historyMutation.isPending || prepareMutation.isPending || compareMutation.isPending;
  const error = summarizeMutation.error?.message || historyMutation.error?.message || prepareMutation.error?.message || compareMutation.error?.message || null;
  const hasResult = !!summary || !!preparedDoc || !!comparison;
  const view: 'idle' | 'loading' | 'result' = isLoading ? 'loading' : hasResult ? 'result' : 'idle';

  const errorBanner = error && (
    <div className="error-banner animate-in">
      <div className="error-banner-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{error}</span>
      </div>
      <button className="error-dismiss-btn" onClick={handleReset}>&times;</button>
    </div>
  );

  // ---------- Landing ----------
  if (mode === 'landing') {
    return (
      <div className="app-container">
        <Header
          variant="landing"
          onHistoryToggle={() => setHistoryOpen(o => !o)}
          historyOpen={historyOpen}
          onGetStarted={enterApp}
          onLogo={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          ctaLabel="Launch DocSumm"
          navLinks={NAV_LINKS}
          onNav={scrollToSection}
          user={user}
          authReady={authReady}
          onSignIn={() => setAuthModal('signin')}
          onCreateAccount={() => setAuthModal('signup')}
          onSignOut={signOut}
        />
        <main className="main-layout">
          <div className="content-container">
            <div className="hero">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span className="hero-badge-light">AI Document Command Center</span>
              </div>
              <h1 className="hero-title">Turn Documents into Summaries, Study Tools, Comparisons &amp; Evidence-Backed Insights</h1>
              <p className="hero-subtitle">
                Upload PDFs, DOCX, TXT files, or paste text. Choose a workflow and let DocSumm’s agents analyze, question, compare, and transform your documents.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary btn-lg" onClick={enterApp}>
                  Launch DocSumm
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                {!user && (
                  <button className="btn btn-secondary btn-lg" onClick={() => setAuthModal('signup')}>
                    Create Free Account
                  </button>
                )}
              </div>
              <span className="hero-cta-note">PDF, DOCX, TXT supported · No account needed</span>
            </div>

            {/* Hero composer — pick a workflow and start right here; running it enters the workspace. */}
            <section className="hero-composer" id="composer" aria-label="Start a workflow">
              <div className="hero-composer-head">
                <h2>Start with any workflow</h2>
                <p>Choose a workflow, add your document or text, and DocSumm opens the full workspace with your results.</p>
              </div>
              <TaskSelector value={task} onChange={setTask} variant="pills" />
              <UploadArea key={`landing-${task}-${resetKey}`} task={task} onSubmit={handleSubmit} onCompare={handleCompare} />
            </section>

            <MarketingSections />
            <Footer />
          </div>
        </main>
        <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} onSelectJob={handleSelectJob} />
        {authModalEl}
      </div>
    );
  }

  // ---------- App workspace (three panes) ----------
  return (
    <div className="workspace-shell">
      <Header
        variant="app"
        onHistoryToggle={() => setHistoryOpen(o => !o)}
        historyOpen={historyOpen}
        onGetStarted={handleReset}
        onLogo={() => setMode('landing')}
        ctaLabel="New Analysis"
        user={user}
        authReady={authReady}
        onSignIn={() => setAuthModal('signin')}
        onCreateAccount={() => setAuthModal('signup')}
        onSignOut={signOut}
      />

      <div className={`workspace-body ${contextOpen ? '' : 'workspace-body--no-context'}`}>
        <aside className="workspace-sidebar">
          <TaskSelector value={task} onChange={handleMissionChange} />
        </aside>

        <main className="workspace-center">
          {errorBanner}

          {view === 'idle' && (
            <div className="workspace-idle">
              <div className="workspace-intro">
                <h2>Run a {task === 'compare' ? 'comparison' : 'mission'} on your document</h2>
                <p>Upload a PDF, DOCX, or TXT file, or paste text — then run the mission. New here?</p>
                <button className="btn btn-secondary sample-btn" onClick={runSample}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Try a sample document
                </button>
              </div>
              <UploadArea key={`${task}-${resetKey}`} task={task} onSubmit={handleSubmit} onCompare={handleCompare} />
            </div>
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
        </main>

        {contextOpen ? (
          <AgentContextPanel
            task={task}
            view={view}
            summary={summary}
            preparedDoc={preparedDoc}
            comparison={comparison}
            onCollapse={() => setContextOpen(false)}
          />
        ) : (
          <button className="workspace-context-reopen" onClick={() => setContextOpen(true)} title="Show context">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
      </div>

      <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} onSelectJob={handleSelectJob} />
      {authModalEl}
    </div>
  );
};

export default App;
