import React from 'react';
import './Footer.css';

const WORKFLOWS = ['Summarize', 'Study', 'Ask Document', 'Compare', 'Risk Review', 'Action Plan', 'Evidence Map'];

const Footer: React.FC = () => (
  <footer className="app-footer">
    <div className="app-footer-top">
      <div className="app-footer-brand">
        <span className="app-footer-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
        <div>
          <div className="app-footer-name">DocSumm</div>
          <div className="app-footer-tag">AI Document Command Center</div>
        </div>
      </div>
      <nav className="app-footer-workflows" aria-label="Workflows">
        {WORKFLOWS.map(w => <span key={w} className="app-footer-chip">{w}</span>)}
      </nav>
    </div>
    <div className="app-footer-bottom">
      <span>Documents are processed locally for your session.</span>
      <span className="app-footer-status"><span className="app-footer-dot" /> All systems operational</span>
    </div>
  </footer>
);

export default Footer;
