import React from 'react';
import type { TaskKey } from '../types';
import './TaskSelector.css';

interface TaskDef {
  key: TaskKey;
  label: string;
  icon: string;
  soon?: boolean;
}

const TASKS: TaskDef[] = [
  { key: 'summarize', label: 'Summarize', icon: '📝' },
  { key: 'study', label: 'Study', icon: '🎓' },
  { key: 'ask', label: 'Ask', icon: '💬' },
  { key: 'compare', label: 'Compare', icon: '⚖️', soon: true },
  { key: 'risk', label: 'Risk Review', icon: '⚠️' },
  { key: 'action', label: 'Action Plan', icon: '✅' },
  { key: 'evidence', label: 'Evidence Map', icon: '🔍' },
];

interface TaskSelectorProps {
  value: TaskKey;
  onChange: (task: TaskKey) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ value, onChange }) => (
  <div className="task-selector" role="tablist" aria-label="Choose a task">
    {TASKS.map(t => (
      <button
        key={t.key}
        type="button"
        role="tab"
        aria-selected={value === t.key}
        className={`task-pill ${value === t.key ? 'active' : ''}`}
        onClick={() => onChange(t.key)}
      >
        <span className="task-pill-icon" aria-hidden="true">{t.icon}</span>
        <span className="task-pill-label">{t.label}</span>
        {t.soon && <span className="task-pill-soon">Soon</span>}
      </button>
    ))}
  </div>
);

export default TaskSelector;
