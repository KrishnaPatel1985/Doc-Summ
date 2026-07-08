import React from 'react';
import type { TaskKey } from '../types';
import './TaskSelector.css';

export interface MissionDef {
  key: TaskKey;
  title: string;
  desc: string;
}

export const MISSIONS: MissionDef[] = [
  { key: 'summarize', title: 'Summarize', desc: 'Executive summary, insights, and action items.' },
  { key: 'study', title: 'Study', desc: 'Flashcards, quizzes, key terms, and explanations.' },
  { key: 'ask', title: 'Ask Document', desc: 'Source-aware answers from your document.' },
  { key: 'compare', title: 'Compare Documents', desc: 'Similarities, differences, and unique points.' },
  { key: 'risk', title: 'Risk Review', desc: 'Risks, red flags, and missing information.' },
  { key: 'action', title: 'Action Plan', desc: 'Tasks, decisions, and next steps.' },
  { key: 'evidence', title: 'Evidence Map', desc: 'Claims linked to supporting evidence.' },
];

export const MissionIcon: React.FC<{ name: TaskKey }> = ({ name }) => {
  const p = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'summarize':
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'study':
      return <svg {...p}><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/></svg>;
    case 'ask':
      return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'compare':
      return <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case 'risk':
      return <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'action':
      return <svg {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'evidence':
      return <svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    default:
      return null;
  }
};

interface TaskSelectorProps {
  value: TaskKey;
  onChange: (task: TaskKey) => void;
  variant?: 'sidebar' | 'pills';
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ value, onChange, variant = 'sidebar' }) => {
  if (variant === 'pills') {
    return (
      <div className="mission-pills" role="tablist" aria-label="Choose a workflow">
        {MISSIONS.map(m => {
          const active = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`mission-pill ${active ? 'active' : ''}`}
              onClick={() => onChange(m.key)}
            >
              <span className="mission-pill-icon"><MissionIcon name={m.key} /></span>
              {m.title}
            </button>
          );
        })}
      </div>
    );
  }

  return (
  <aside className="mission-menu" role="tablist" aria-label="Choose a mission">
    <span className="mission-menu-kicker">Missions</span>
    {MISSIONS.map(m => {
      const active = value === m.key;
      return (
        <button
          key={m.key}
          type="button"
          role="tab"
          aria-selected={active}
          className={`mission-item ${active ? 'active' : ''}`}
          onClick={() => onChange(m.key)}
        >
          <span className="mission-item-icon"><MissionIcon name={m.key} /></span>
          <span className="mission-item-text">
            <span className="mission-item-title">{m.title}</span>
            <span className="mission-item-desc">{m.desc}</span>
          </span>
        </button>
      );
    })}
  </aside>
  );
};

export default TaskSelector;
