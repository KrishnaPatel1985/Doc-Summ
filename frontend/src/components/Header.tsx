import React, { useState } from 'react';
import type { AuthUser } from '../types';
import { initialsOf } from '../auth/AuthContext';
import './Header.css';

export interface NavLink {
  label: string;
  target: string;
}

interface HeaderProps {
  variant?: 'landing' | 'app';
  onHistoryToggle: () => void;
  historyOpen: boolean;
  onGetStarted: () => void;
  onLogo: () => void;
  ctaLabel?: string;
  navLinks?: NavLink[];
  onNav?: (target: string) => void;
  user?: AuthUser | null;
  authReady?: boolean;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  variant = 'app',
  onHistoryToggle,
  historyOpen,
  onGetStarted,
  onLogo,
  ctaLabel = 'Get Started',
  navLinks,
  onNav,
  user,
  authReady = true,
  onSignIn,
  onCreateAccount,
  onSignOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
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

      {variant === 'landing' && navLinks && navLinks.length > 0 && (
        <nav className="app-nav-links" aria-label="Primary">
          {navLinks.map(link => (
            <button key={link.target} className="app-nav-link" onClick={() => onNav?.(link.target)}>
              {link.label}
            </button>
          ))}
        </nav>
      )}

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

        {!authReady ? (
          <span className="app-nav-auth-loading">Checking account...</span>
        ) : user ? (
          <div className="app-nav-user">
            <div className="app-nav-user-summary">
              <span>Signed in</span>
              <strong>{user.name || user.email}</strong>
            </div>
            <button
              className="app-nav-avatar"
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={user.name || user.email}
            >
              {initialsOf(user)}
            </button>
            {menuOpen && (
              <>
                <div className="app-nav-menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="app-nav-menu" role="menu">
                  <div className="app-nav-menu-id">
                    <strong>{user.name || 'Your account'}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button
                    className="app-nav-menu-item"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onSignOut?.(); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Sign out of DocSumm
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {onSignIn && (
              <button className="app-nav-btn app-nav-btn--text" onClick={onSignIn}>
                Sign in
              </button>
            )}
            {onCreateAccount && (
              <button className="app-nav-btn app-nav-btn--outline" onClick={onCreateAccount}>
                Create Free Account
              </button>
            )}
          </>
        )}

        <button className="app-nav-btn app-nav-btn--solid" onClick={onGetStarted}>
          {ctaLabel}
        </button>
      </div>
    </header>
  );
};

export default Header;
