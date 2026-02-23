import { useState } from 'react'
import './AuthModal.css'

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await onSuccess.login(email, password)
      } else {
        await onSuccess.register(email, password)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError('')
    setEmail('')
    setPassword('')
  }

  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="auth-modal-title" className="auth-modal-title">
          {mode === 'login' ? 'Log in' : 'Create account'}
        </h2>
        <p className="auth-modal-subtitle">
          {mode === 'login'
            ? 'Welcome back. Sign in to continue.'
            : 'Join Motify to save your playlists and more.'}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email" className="auth-label">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <label htmlFor="auth-password" className="auth-label">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" className="auth-switch-btn" onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
