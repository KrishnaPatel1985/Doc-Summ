import React from 'react';
import './Header.css';

interface HeaderProps {
  onHistoryToggle: () => void;
  historyOpen: boolean;
  onGetStarted: () => void;
  onLogo: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHistoryToggle, historyOpen, onGetStarted, onLogo }) => (
  <header className="app-nav">
    <button className="app-nav-logo" onClick={onLogo} aria-label="DocSumm home">
      <span className="app-nav-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </span>
      DocSumm
    </button>

    <div className="app-nav-actions">
      <button
        className={`app-nav-btn app-nav-btn--ghost ${historyOpen ? 'is-active' : ''}`}
        onClick={onHistoryToggle}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v5h5" />
          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
        {historyOpen ? 'Close' : 'History'}
      </button>

      <button className="app-nav-btn app-nav-btn--solid" onClick={onGetStarted}>
        Get Started
      </button>
    </div>
  </header>
);

export default Header;
