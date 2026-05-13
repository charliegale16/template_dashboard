import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

// ── Avatar helpers ────────────────────────────────────────────────────────────

function initials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-rose-500', 'bg-cyan-500',
]

function avatarColor(email) {
  if (!email) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ user, size = 'lg' }) {
  const avatarUrl = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name
  const email = user?.email
  const [imgError, setImgError] = useState(false)

  const sizeClasses = size === 'lg'
    ? 'w-24 h-24 text-3xl'
    : size === 'md'
    ? 'w-10 h-10 text-base'
    : 'w-8 h-8 text-sm'

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || email}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow`}
      />
    )
  }

  return (
    <div className={`${sizeClasses} rounded-full ${avatarColor(email)} flex items-center justify-center font-bold text-white ring-2 ring-white dark:ring-gray-800 shadow`}>
      {initials(name, email)}
    </div>
  )
}

// ── Provider badge ────────────────────────────────────────────────────────────

function ProviderBadge({ provider }) {
  if (provider === 'google') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 shadow-sm">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
        </svg>
        Google
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 shadow-sm">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      Email
    </span>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 text-right break-all">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, accessToken, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name
  const email = user?.email
  const provider = user?.app_metadata?.provider ?? 'email'
  const isGoogleUser = provider === 'google'
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Profile</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Avatar card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
          <Avatar user={user} size="lg" />

          <div className="space-y-1">
            {name && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{name}</h1>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
          </div>

          <ProviderBadge provider={provider} />

          {isGoogleUser && (
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
              Signed in with Google · Google Sheets import enabled
            </p>
          )}
        </div>

        {/* Account details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account details</h2>
          <div>
            <InfoRow label="Email" value={email} />
            {name && <InfoRow label="Name" value={name} />}
            <InfoRow label="Sign-in method" value={isGoogleUser ? 'Google OAuth' : 'Email / password'} />
            <InfoRow label="Member since" value={createdAt} />
            <InfoRow label="Last sign in" value={lastSignIn} />
            <InfoRow label="User ID" value={user?.id} />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Preferences</h2>
          <p className="text-xs text-gray-400 mb-4">Choose how GridFlow looks on this device.</p>
          <div className="flex items-center gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                  theme === opt.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className={theme === opt.value ? 'text-brand-600 dark:text-brand-400' : ''}>
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Session</h2>
          <p className="text-xs text-gray-400 mb-4">Signing out will end your current session on this device.</p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>

      </main>
    </div>
  )
}

// Export Avatar so HomePage header can reuse it
export { Avatar }
