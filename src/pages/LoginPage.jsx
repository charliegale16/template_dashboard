import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const MODES = { signin: 'signin', signup: 'signup', magic: 'magic' }

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, loginWithMagicLink } = useAuth()

  const [mode, setMode]         = useState(MODES.signin)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [sent, setSent]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === MODES.magic) {
        const { error } = await loginWithMagicLink(email)
        if (error) throw error
        setSent(true)
      } else if (mode === MODES.signup) {
        const { error } = await signUpWithEmail(email, password)
        if (error) throw error
        setSent(true)
      } else {
        const { error } = await loginWithEmail(email, password)
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to manage your data and KPIs.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-5">

          {/* Confirmation banners */}
          {sent && mode === MODES.magic && (
            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 px-4 py-3 text-sm text-brand-700 dark:text-brand-300 text-center">
              ✉️ Magic link sent — check your inbox.
            </div>
          )}
          {sent && mode === MODES.signup && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 text-center">
              ✉️ Confirmation email sent — click the link to activate your account.
            </div>
          )}

          {!sent && (
            <>
              {/* Google */}
              <button
                onClick={() => loginWithGoogle()}
                className="w-full inline-flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:shadow"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              </div>

              {/* Mode tabs */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 gap-0.5 text-xs font-medium">
                {[
                  { key: MODES.signin, label: 'Sign in' },
                  { key: MODES.signup, label: 'Create account' },
                  { key: MODES.magic,  label: 'Magic link' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setMode(key); setError(null) }}
                    className={[
                      'flex-1 py-1.5 rounded-md transition-colors',
                      mode === key
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="input w-full"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {mode !== MODES.magic && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                      Password
                      {mode === MODES.signup && (
                        <span className="normal-case font-normal text-gray-400 ml-1">(min. 6 characters)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === MODES.signup ? 'new-password' : 'current-password'}
                      className="input w-full"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      {mode === MODES.magic ? 'Sending…' : mode === MODES.signup ? 'Creating…' : 'Signing in…'}
                    </span>
                  ) : (
                    mode === MODES.magic  ? 'Send magic link →' :
                    mode === MODES.signup ? 'Create account →'  : 'Sign in →'
                  )}
                </button>

                {mode === MODES.magic && (
                  <p className="text-xs text-gray-400 text-center">
                    We'll email you a one-click sign-in link. No password needed.
                  </p>
                )}
              </form>
            </>
          )}

          {sent && (
            <button
              onClick={() => { setSent(false); setMode(MODES.signin); setEmail(''); setPassword('') }}
              className="w-full text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← Back to sign in
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-5">
          Google sign-in also enables Google Sheets import.
        </p>
      </div>
    </div>
  )
}
