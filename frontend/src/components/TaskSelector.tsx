import React from 'react';
import type { TaskKey } from '../types';
import './TaskSelector.css';

interface WorkflowDef {
  key: TaskKey;
  title: string;
  desc: string;
}

const WORKFLOWS: WorkflowDef[] = [
  { key: 'summarize', title: 'Summarize', desc: 'Generate a clear summary, key insights, and action items.' },
  { key: 'study', title: 'Study', desc: 'Create flashcards, quizzes, key terms, and beginner explanations.' },
  { key: 'ask', title: 'Ask', desc: 'Prepare your document for question answering.' },
  { key: 'risk', title: 'Risk Review', desc: 'Find risks, assumptions, red flags, and missing information.' },
  { key: 'action', title: 'Action Plan', desc: 'Extract tasks, priorities, deadlines, and suggested owners.' },
  { key: 'evidence', title: 'Evidence Map', desc: 'Connect important claims to supporting evidence.' },
];

const WorkflowIcon: React.FC<{ name: TaskKey }> = ({ name }) => {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'summarize':
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'study':
      return <svg {...p}><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/></svg>;
    case 'ask':
      return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'risk':
      return <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'action':
      return <svg {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'evidence':
      return <svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    case 'compare':
      return <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    default:
      return null;
  }
};

const CheckMark = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

interface TaskSelectorProps {
  value: TaskKey;
  onChange: (task: TaskKey) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ value, onChange }) => (
  <section className="workflow-selector" aria-label="Choose your workflow">
    <h2 className="ws-title">What would you like to do with your document?</h2>

    <div className="ws-grid" role="tablist">
      {WORKFLOWS.map(w => {
        const active = value === w.key;
        return (
          <button
            key={w.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`ws-card ${active ? 'active' : ''}`}
            onClick={() => onChange(w.key)}
          >
            <span className="ws-card-icon"><WorkflowIcon name={w.key} /></span>
            <span className="ws-card-title">{w.title}</span>
            <span className="ws-card-desc">{w.desc}</span>
            {active && <span className="ws-card-check" aria-hidden="true"><CheckMark /></span>}
          </button>
        );
      })}
    </div>

    <button
      type="button"
      className={`ws-compare ${value === 'compare' ? 'active' : ''}`}
      aria-selected={value === 'compare'}
      onClick={() => onChange('compare')}
    >
      <span className="ws-card-icon"><WorkflowIcon name="compare" /></span>
      <span className="ws-compare-body">
        <span className="ws-compare-title">Compare Documents</span>
        <span className="ws-card-desc">Compare two documents side by side — similarities, differences, and a final conclusion.</span>
      </span>
      {value === 'compare' && <span className="ws-card-check" aria-hidden="true"><CheckMark /></span>}
    </button>
  </section>
);

export default TaskSelector;
