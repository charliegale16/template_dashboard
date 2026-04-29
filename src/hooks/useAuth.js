import { useState, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

const TOKEN_KEY = 'dashboard_access_token'

/**
 * Manages Google OAuth 2.0 state for the dashboard.
 *
 * The implicit flow is used so the access token is available immediately
 * in the browser — no server-side token exchange needed.
 *
 * Token expiry: Google implicit-flow tokens last ~1 hour. When a 401 is
 * returned by any Sheets API call, callers should invoke logout() which
 * clears the token and redirects the user back to /setup to reconnect.
 *
 * Phase 2 — Excel / OneDrive: replace the Google login call with a
 * Microsoft Identity Platform MSAL flow and store its access token under
 * a different localStorage key (e.g. 'dashboard_ms_access_token').
 */
export function useAuth() {
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null
  })

  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(TOKEN_KEY + '_profile')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token
      setAccessToken(token)
      localStorage.setItem(TOKEN_KEY, token)

      // Fetch basic profile so Step 1 can show "Connected as ..."
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const info = await res.json()
          setProfile(info)
          localStorage.setItem(TOKEN_KEY + '_profile', JSON.stringify(info))
        }
      } catch {
        // Profile fetch is best-effort; auth still succeeds
      }
    },
    onError: (err) => {
      console.error('Google login error', err)
    },
  })

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY + '_profile')
    setAccessToken(null)
    setProfile(null)
  }, [])

  const isAuthenticated = Boolean(accessToken)

  return { accessToken, profile, isAuthenticated, login: googleLogin, logout }
}
