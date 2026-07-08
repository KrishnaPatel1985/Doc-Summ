import React from 'react';
import type { TaskKey, SummaryResponse, PreparedDoc, CompareResult } from '../types';
import './AgentContextPanel.css';

const MISSION_LABELS: Record<TaskKey, string> = {
  summarize: 'Summarize',
  study: 'Study',
  ask: 'Ask Document',
  compare: 'Compare Documents',
  risk: 'Risk Review',
  action: 'Action Plan',
  evidence: 'Evidence Map',
};

const AGENT_PLANS: Record<'summarize' | 'study' | 'compare', string[]> = {
  summarize: ['Extract document text', 'Summary agent', 'Insights & evidence agent', 'Risk agent', 'Action agent'],
  study: ['Extract document text', 'Study agent — flashcards, quiz, key terms'],
  compare: ['Extract Document A', 'Extract Document B', 'Compare agent'],
};
function planFor(task: TaskKey): string[] {
  if (task === 'study') return AGENT_PLANS.study;
  if (task === 'compare') return AGENT_PLANS.compare;
  return AGENT_PLANS.summarize;
}

interface Props {
  task: TaskKey;
  view: 'idle' | 'loading' | 'result';
  summary: SummaryResponse | null;
  preparedDoc: PreparedDoc | null;
  comparison: CompareResult | null;
  onCollapse: () => void;
}

const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="cp-row">
    <span>{label}</span>
    <strong className={accent ? 'cp-accent' : ''}>{value}</strong>
  </div>
);

const AgentContextPanel: React.FC<Props> = ({ task, view, summary, preparedDoc, comparison, onCollapse }) => {
  const steps = planFor(task);

  const renderBody = () => {
    if (view === 'result' && comparison) {
      return (
        <div className="cp-section">
          <span className="cp-kicker">Documents</span>
          <Row label="Document A" value={comparison.doc_a_name} />
          <Row label="Document B" value={comparison.doc_b_name} />
          {comparison.doc_a?.char_count ? <Row label="A length" value={`${comparison.doc_a.char_count.toLocaleString()} chars`} /> : null}
          {comparison.doc_b?.char_count ? <Row label="B length" value={`${comparison.doc_b.char_count.toLocaleString()} chars`} /> : null}
        </div>
      );
    }
    if (view === 'result' && preparedDoc) {
      return (
        <div className="cp-section">
          <span className="cp-kicker">Document</span>
          <Row label="Name" value={preparedDoc.filename || 'Text input'} />
          <Row label="Type" value={(preparedDoc.file_type || 'text').toUpperCase()} />
          {preparedDoc.char_count_original ? <Row label="Length" value={`${preparedDoc.char_count_original.toLocaleString()} chars`} /> : null}
        </div>
      );
    }
    if (view === 'result' && summary) {
      const orig = summary.char_count_original || 0;
      const sum = summary.char_count_summary || 0;
      // Only show reduction when the summary is genuinely shorter than the source.
      const reductionPct = orig && sum ? Math.round((1 - sum / orig) * 100) : 0;
      return (
        <div className="cp-section">
          <span className="cp-kicker">Document</span>
          <Row label="Name" value={summary.filename || 'Text input'} />
          <Row label="Type" value={(summary.file_type || 'text').toUpperCase()} />
          <Row label="Original" value={`${orig.toLocaleString()} chars`} />
          <Row label="Summary" value={`${sum.toLocaleString()} chars`} />
          {reductionPct > 0 && <Row label="Reduction" value={`${reductionPct}%`} accent />}
        </div>
      );
    }

    // idle / loading — show the agent plan
    return (
      <div className="cp-section">
        <span className="cp-kicker">{view === 'loading' ? 'Agents running' : 'Agent plan'}</span>
        <ol className="cp-plan">
          {steps.map((s, i) => (
            <li key={s} className={`cp-plan-step ${view === 'loading' ? 'running' : ''}`}>
              <span className="cp-plan-marker">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {view === 'idle' && <p className="cp-note">Run the mission to generate outputs from your document.</p>}
      </div>
    );
  };

  return (
    <aside className="context-panel" aria-label="Agent and document context">
      <div className="cp-top">
        <div className="cp-mission">
          <span className="cp-mission-dot" />
          {MISSION_LABELS[task]}
        </div>
        <button className="cp-collapse" onClick={onCollapse} aria-label="Collapse panel" title="Collapse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      {renderBody()}
    </aside>
  );
};

export default AgentContextPanel;
