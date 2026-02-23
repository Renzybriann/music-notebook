'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const inputStyle = {
  fontFamily: 'Comic Sans MS, cursive',
  border: '3px solid #4A5FBF',
  borderRadius: '10px',
  outline: 'none',
  width: '100%',
  padding: '12px 16px',
  fontSize: '1rem',
};

const buttonStyle = (primary) => ({
  fontFamily: 'Comic Sans MS, cursive',
  padding: '12px 24px',
  borderRadius: '12px',
  border: '3px solid',
  fontWeight: 'bold',
  cursor: 'pointer',
  ...(primary
    ? { backgroundColor: '#4A5FBF', color: 'white', borderColor: '#2C3E8F', boxShadow: '4px 4px 0px #2C3E8F' }
    : { backgroundColor: '#E8D4C0', color: '#4A5FBF', borderColor: '#4A5FBF' }),
});

export default function AuthForm() {
  const { signIn, signUp, signInWithDiscord, authError, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) setMessage(error.message || 'Sign up failed');
      else setMessage('Check your email to confirm your account.');
    } else {
      const { error } = await signIn(email, password);
      if (error) setMessage(error.message || 'Sign in failed');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl" style={{
      border: '4px solid #4A5FBF',
      boxShadow: '10px 10px 0px rgba(74, 95, 191, 0.3)',
      transform: 'rotate(-0.5deg)',
    }}>
      <h2 className="text-3xl font-bold text-center mb-6" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545' }}>
        ♪ {isSignUp ? 'Sign Up' : 'Sign In'} ♪
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            aria-label="Display name"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          aria-label="Email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
          aria-label="Password"
        />
        {(authError || message) && (
          <p className="text-sm text-red-600 whitespace-pre-wrap break-words max-w-full" role="alert">{authError || message}</p>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} style={buttonStyle(true)}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            style={buttonStyle(false)}
          >
            {isSignUp ? 'Sign In instead' : 'Sign Up instead'}
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => signInWithDiscord()}
            style={buttonStyle(false)}
            className="w-full"
          >
            Continue with Discord
          </button>
        </div>
      </form>
    </div>
  );
}
