import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import './AuthModal.css';

export type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
}

const BENEFITS = [
  'Save your workspace and history',
  'Organize and return to past analyses',
  'Faster access to your workspace',
];

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitch }) => {
  const { signIn, createAccount } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const friendlyError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
    if (message.includes('already exists')) return 'An account with this email already exists.';
    if (message.includes('Invalid email or password')) return 'Wrong email or password.';
    if (message.includes('Password must')) return message;
    if (message.includes('valid email')) return 'Enter a valid email address.';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return 'Could not reach the backend. Make sure DocSumm is running and try again.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validEmail(email)) { setError('Enter a valid email address.'); return; }
    if (isSignup && !name.trim()) { setError('Enter your name.'); return; }
    if (!password.trim()) { setError('Enter a password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setError(null);
    try {
      if (isSignup) await createAccount(name, email, password);
      else await signIn(email, password);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={isSignup ? 'Create free account' : 'Sign in'}>
      <div className="auth-modal animate-in" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">&times;</button>

        <div className="auth-brand">
          <span className="auth-brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          DocSumm
        </div>

        <h2 className="auth-title">{isSignup ? 'Create your free DocSumm account' : 'Sign in to continue'}</h2>
        <p className="auth-subtitle">
          {isSignup
            ? 'Save your workspace, history, and document intelligence sessions.'
            : 'Sign in to continue your DocSumm workspace.'}
        </p>

        {isSignup && (
          <ul className="auth-benefits">
            {BENEFITS.map(b => (
              <li key={b}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {b}
              </li>
            ))}
          </ul>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="auth-field">
              <span>Name</span>
              <input value={name} onChange={e => { setName(e.target.value); setError(null); }} placeholder="Your name" autoComplete="name" disabled={loading} />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} placeholder="you@example.com" autoComplete="email" disabled={loading} />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} disabled={loading} />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Free Account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to DocSumm?'}
          <button type="button" onClick={() => onSwitch(isSignup ? 'signin' : 'signup')} disabled={loading}>
            {isSignup ? 'Sign in' : 'Create a free account'}
          </button>
        </p>

        <p className="auth-note">
          Your account is handled by the local DocSumm backend. You can still use DocSumm as a guest.
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
