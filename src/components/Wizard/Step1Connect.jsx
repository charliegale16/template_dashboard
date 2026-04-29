import React from 'react'

/**
 * Step 1 — Connect a data source.
 *
 * Google Sheets uses the OAuth 2.0 implicit flow via @react-oauth/google.
 * The login function and auth state are passed in from SetupPage (which
 * receives them from App.jsx via useAuth).
 *
 * Phase 2 — Excel / OneDrive: replace the greyed-out button below with an
 * MSAL-based login using @azure/msal-react. The onSuccess callback should
 * store the Microsoft access token the same way useAuth stores the Google one.
 */
export default function Step1Connect({ auth, onConnected }) {
  const { isAuthenticated, profile, login } = auth

  async function handleGoogleLogin() {
    login()
    // onConnected is called in SetupPage via a useEffect watching isAuthenticated
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Connect your data source</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sign in with Google to access your private Google Sheets data.
        </p>
      </div>

      {/* Google Sheets */}
      <div className={[
        'rounded-xl border-2 p-5 transition-all',
        isAuthenticated ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white',
      ].join(' ')}>
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0">
            <SheetsIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">Google Sheets</span>
              {isAuthenticated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Access private or shared Google Sheets via your Google account.
            </p>

            {isAuthenticated && profile ? (
              <div className="mt-3 flex items-center gap-3">
                {profile.picture && (
                  <img src={profile.picture} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-200" />
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{profile.name}</p>
                  <p className="text-gray-500 text-xs">{profile.email}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="mt-3 btn-primary"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Excel / OneDrive — Phase 2 placeholder */}
      <div className="rounded-xl border-2 border-gray-100 bg-gray-50 p-5 opacity-50 cursor-not-allowed">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0">
            <ExcelIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Excel / OneDrive</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                Coming soon
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload an .xlsx file or connect via Microsoft 365.
            </p>
            {/* Phase 2: <button className="mt-3 btn-secondary" disabled>Connect Excel / OneDrive</button> */}
          </div>
        </div>
      </div>
    </div>
  )
}

function SheetsIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
      <rect x="6" y="2" width="28" height="36" rx="3" fill="#34a853" />
      <rect x="12" y="14" width="16" height="2" rx="1" fill="white" opacity=".9" />
      <rect x="12" y="19" width="16" height="2" rx="1" fill="white" opacity=".9" />
      <rect x="12" y="24" width="11" height="2" rx="1" fill="white" opacity=".9" />
      <rect x="12" y="7" width="10" height="5" rx="1" fill="white" opacity=".2" />
    </svg>
  )
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
      <rect x="6" y="2" width="28" height="36" rx="3" fill="#217346" />
      <path d="M13 12l5 8-5 8h3l3-5.5 3 5.5h3l-5-8 5-8h-3l-3 5.5-3-5.5z" fill="white" opacity=".8" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
