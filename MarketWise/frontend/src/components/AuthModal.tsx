import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { loginUser, registerUser } from '../services/authApi';
import type { User } from '../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: User) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const res = await registerUser(name, email, password);
        onAuthSuccess(res.access_token, res.user);
        onClose();
      } else {
        const res = await loginUser(email, password);
        onAuthSuccess(res.access_token, res.user);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '420px',
          boxShadow: 'var(--shadow-md)',
          padding: '28px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'var(--text-muted)',
            padding: '4px',
            borderRadius: '6px'
          }}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.875rem',
              fontWeight: mode === 'login' ? 600 : 500,
              background: mode === 'login' ? 'var(--surface)' : 'transparent',
              color: mode === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.875rem',
              fontWeight: mode === 'register' ? 600 : 500,
              background: mode === 'register' ? 'var(--surface)' : 'transparent',
              color: mode === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Create Account
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {mode === 'login' 
              ? 'Access your investment portfolio and transaction ledger.' 
              : 'Start tracking real-time positions with relational integrity.'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Full Name
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                <UserIcon size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="e.g. Manya Shetty"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
              <Mail size={16} color="var(--text-muted)" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {isLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
