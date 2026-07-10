import React, { useEffect, useMemo, useState } from 'react';
import { requestPasswordReset, resetPassword } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import './AuthModal.css';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  resetToken?: string | null;
}

const BENEFITS = [
  'Save your workspace and history',
  'Organize and return to past analyses',
  'Faster access to your workspace',
];

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitch, resetToken }) => {
  const { signIn, createAccount } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const isSignin = mode === 'signin';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

  const copy = useMemo(() => {
    if (isSignup) {
      return {
        title: 'Create your free DocSumm account',
        subtitle: 'Save your workspace, history, and document intelligence sessions.',
        submit: loading ? 'Creating account...' : 'Create Free Account',
      };
    }
    if (isForgot) {
      return {
        title: 'Reset your password',
        subtitle: 'Enter your email and DocSumm will send a reset link if an account exists.',
        submit: loading ? 'Sending reset link...' : 'Send reset link',
      };
    }
    if (isReset) {
      return {
        title: 'Choose a new password',
        subtitle: 'Enter a new password for your DocSumm account.',
        submit: loading ? 'Resetting password...' : 'Reset password',
      };
    }
    return {
      title: 'Sign in to continue',
      subtitle: 'Sign in to continue your DocSumm workspace.',
      submit: loading ? 'Signing in...' : 'Sign in',
    };
  }, [isForgot, isReset, isSignup, loading]);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const friendlyError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
    if (message.includes('already exists')) return 'An account with this email already exists.';
    if (message.includes('Invalid email or password')) return 'Invalid email or password.';
    if (message.includes('Password must')) return message;
    if (message.includes('valid email')) return 'Enter a valid email address.';
    if (message.includes('invalid or has expired')) return 'Reset link is invalid or has expired.';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return 'Could not reach the backend. Make sure DocSumm is running and try again.';
    }
    return message;
  };

  const resetTransientState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if ((isSignin || isSignup || isForgot) && !validEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (isSignup && !firstName.trim()) {
      setError('Enter your first name.');
      return;
    }
    if (isSignup && !lastName.trim()) {
      setError('Enter your last name.');
      return;
    }
    if (!isForgot && !password.trim()) {
      setError('Enter a password.');
      return;
    }
    if (!isForgot && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (isReset && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isReset && !resetToken) {
      setError('Reset link is invalid or has expired.');
      return;
    }

    setLoading(true);
    resetTransientState();
    try {
      if (isSignup) {
        await createAccount(firstName, lastName, email, password);
        onClose();
        return;
      }
      if (isSignin) {
        await signIn(email, password);
        onClose();
        return;
      }
      if (isForgot) {
        const response = await requestPasswordReset(email);
        setSuccess(response.message);
        return;
      }
      const response = await resetPassword(resetToken || '', password);
      setSuccess(response.message);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const switchTo = (nextMode: AuthMode) => {
    if (loading) return;
    resetTransientState();
    onSwitch(nextMode);
  };

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={copy.title}>
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

        <h2 className="auth-title">{copy.title}</h2>
        <p className="auth-subtitle">{copy.subtitle}</p>

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
            <div className="auth-name-grid">
              <label className="auth-field">
                <span>First name</span>
                <input value={firstName} onChange={e => { setFirstName(e.target.value); resetTransientState(); }} placeholder="First name" autoComplete="given-name" disabled={loading} />
              </label>
              <label className="auth-field">
                <span>Last name</span>
                <input value={lastName} onChange={e => { setLastName(e.target.value); resetTransientState(); }} placeholder="Last name" autoComplete="family-name" disabled={loading} />
              </label>
            </div>
          )}

          {(isSignin || isSignup || isForgot) && (
            <label className="auth-field">
              <span>Email</span>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); resetTransientState(); }} placeholder="you@example.com" autoComplete="email" disabled={loading} />
            </label>
          )}

          {(isSignin || isSignup || isReset) && (
            <label className="auth-field">
              <span>{isReset ? 'New password' : 'Password'}</span>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); resetTransientState(); }} placeholder="Password" autoComplete={isSignup || isReset ? 'new-password' : 'current-password'} disabled={loading} />
            </label>
          )}

          {isReset && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); resetTransientState(); }} placeholder="Confirm password" autoComplete="new-password" disabled={loading} />
            </label>
          )}

          {isSignin && (
            <button type="button" className="auth-inline-link auth-forgot" onClick={() => switchTo('forgot')} disabled={loading}>
              Forgot password?
            </button>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {!(success && isReset) && (
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {copy.submit}
            </button>
          )}
        </form>

        <p className="auth-switch">
          {isSignup && 'Already have an account?'}
          {isSignin && 'New to DocSumm?'}
          {(isForgot || isReset) && 'Remember your password?'}
          <button type="button" onClick={() => switchTo(isSignin ? 'signup' : 'signin')} disabled={loading}>
            {isSignin ? 'Create a free account' : 'Sign in'}
          </button>
        </p>

        <p className="auth-note">
          Your account is handled by the DocSumm backend. You can still use DocSumm as a guest.
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
