import React from 'react';
import './ProgressBar.css';

interface LoadingSpinnerProps {
  filename?: string | null;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ filename }) => (
  <div className="progress-wrapper card animate-in">
    {filename && (
      <div className="progress-file-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>{filename}</span>
      </div>
    )}
    <div className="progress-header">
      <div className="progress-status-row">
        <div className="spinner" />
        <span className="progress-label bar-processing">Summarizing with AI...</span>
      </div>
    </div>
    <div className="progress-track">
      <div className="progress-fill bar-processing indeterminate" />
    </div>
    <p className="progress-stage">This may take a few seconds</p>
  </div>
);

export default LoadingSpinner;
