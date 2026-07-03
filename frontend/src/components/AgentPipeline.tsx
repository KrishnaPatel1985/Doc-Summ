import React, { useEffect, useState } from 'react';
import type { TaskKey } from '../types';
import './AgentPipeline.css';

// Honest staged loading indicator for the agent pipeline that runs while the
// request is in flight. Steps advance on a timer and the final step stays
// active until the result arrives (the component unmounts on completion).
const PIPELINES: Record<'summarize' | 'study' | 'compare', string[]> = {
  summarize: [
    'Extracting document',
    'Preparing text',
    'Summary Agent',
    'Evidence Agent',
    'Risk Agent',
    'Action Agent',
    'Preparing workspace',
  ],
  study: ['Extracting document', 'Preparing text', 'Preparing study workspace'],
  compare: ['Extracting Document A', 'Extracting Document B', 'Compare Agent', 'Building comparison'],
};

function stepsFor(task: TaskKey): string[] {
  if (task === 'study') return PIPELINES.study;
  if (task === 'compare') return PIPELINES.compare;
  return PIPELINES.summarize; // summarize, ask, risk, action, evidence
}

interface AgentPipelineProps {
  task: TaskKey;
  filename?: string | null;
}

const AgentPipeline: React.FC<AgentPipelineProps> = ({ task, filename }) => {
  const steps = stepsFor(task);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const id = window.setInterval(() => {
      setActive(a => (a < steps.length - 1 ? a + 1 : a));
    }, 750);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  return (
    <div className="agent-pipeline animate-in">
      <div className="ap-header">
        <div className="ap-badge"><span className="ap-pulse" /> DocSumm agents at work</div>
        {filename && <span className="ap-file" title={filename}>{filename}</span>}
      </div>

      <ol className="ap-steps">
        {steps.map((label, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending';
          return (
            <li key={label} className={`ap-step ap-step-${state}`}>
              <span className="ap-marker" aria-hidden="true">
                {state === 'done' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : state === 'active' ? (
                  <span className="ap-spinner" />
                ) : (
                  <span className="ap-dot" />
                )}
              </span>
              <span className="ap-label">{label}</span>
            </li>
          );
        })}
      </ol>

      <p className="ap-note">This usually takes a few seconds. Please keep this tab open.</p>
    </div>
  );
};

export default AgentPipeline;
