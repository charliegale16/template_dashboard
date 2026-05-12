import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => subscription.unsubscribe()
  }, [])

  /** Google OAuth — redirects away; provider_token becomes the Sheets API token.
   *  Pass a custom redirectTo to return to a specific page after OAuth. */
  const loginWithGoogle = (redirectTo = window.location.origin) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        redirectTo,
      },
    })

  /** Email + password sign-in. Returns { error } */
  const loginWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  /** Email + password sign-up. Returns { error } */
  const signUpWithEmail = (email, password) =>
    supabase.auth.signUp({ email, password })

  /** Magic link — sends an email, no password needed. Returns { error } */
  const loginWithMagicLink = (email) =>
    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })

  const logout = () => supabase.auth.signOut()

  return {
    session,
    user: session?.user ?? null,
    /** Google OAuth sessions carry provider_token (Sheets API); email sessions have null */
    accessToken: session?.provider_token ?? null,
    isAuthenticated: Boolean(session),
    loading: session === undefined,
    // convenience alias kept for backwards compat
    login: loginWithGoogle,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    loginWithMagicLink,
    logout,
  }
}
