import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractSheetId, fetchSheetTabs, fetchSheetData } from '../../adapters/SheetsAdapter'
import { getCached, setCached, getCachedTabs, setCachedTabs } from '../../utils/sheetCache'
import { autoMap } from './utils/normalize'
import { SHOPIFY_SCHEMA } from './config'

const STEPS = ['Connect', 'Map fields', 'Done']

export default function ShopifyOnboarding({ auth, onComplete }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(auth.isAuthenticated ? 1 : 0)

  useEffect(() => {
    if (auth.isAuthenticated && step === 0) setStep(1)
  }, [auth.isAuthenticated, step])

  function handleBack() {
    if (step === 0 || step === 1) {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Back to home */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Shopify Profit Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Know your real profit. Instantly.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <span className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  i < step  ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-emerald-600 text-white' :
                               'bg-gray-100 text-gray-400',
                ].join(' ')}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`text-xs font-medium hidden sm:inline ${i === step ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? 'bg-emerald-300' : 'bg-gray-100'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {step === 0 && <StepConnect auth={auth} />}
          {step === 1 && (
            <StepSheet
              auth={auth}
              onComplete={(sheetId, sheetName, mappings) => {
                onComplete({ sheetId, sheetName, mappings })
                setStep(2)
              }}
            />
          )}
          {step === 2 && <StepDone />}
        </div>

        {/* Bottom nav */}
        <div className="mt-4 flex justify-between items-center">
          {step === 1 ? (
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </button>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-300">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Step 0: Connect Google ────────────────────────────────────────────────────

function StepConnect({ auth }) {
  return (
    <div className="text-center space-y-5">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Connect your Google account</h2>
        <p className="text-sm text-gray-500 mt-1">Read-only access. Nothing is stored on our servers.</p>
      </div>
      <button
        onClick={auth.login}
        className="inline-flex items-center gap-2.5 bg-white border border-gray-200 hover:border-gray-300 shadow-sm rounded-xl px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:shadow"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
        </svg>
        Sign in with Google
      </button>
    </div>
  )
}

// ── Step 1: Sheet URL + auto-map ──────────────────────────────────────────────

function StepSheet({ auth, onComplete }) {
  const [url, setUrl]                   = useState('')
  const [tabs, setTabs]                 = useState([])
  const [activeTab, setActiveTab]       = useState(null)
  const [mappings, setMappings]         = useState({})
  const [headers, setHeaders]           = useState([])
  const [tabsLoading, setTabsLoading]   = useState(false)
  const [dataLoading, setDataLoading]   = useState(false)
  const [error, setError]               = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const id = extractSheetId(url)
    if (!id) return
    debounceRef.current = setTimeout(() => loadTabs(id), 600)
    return () => clearTimeout(debounceRef.current)
  }, [url])

  const loadTabs = useCallback(async (sheetId) => {
    setTabsLoading(true)
    setError(null)
    try {
      const cached = getCachedTabs(sheetId)
      const names  = cached ?? await fetchSheetTabs(sheetId, auth.accessToken)
      if (!cached) setCachedTabs(sheetId, names)
      setTabs(names)
      const first = names[0]
      setActiveTab(first)
      await loadTabData(sheetId, first)
    } catch (err) {
      setError(err.message)
    } finally {
      setTabsLoading(false)
    }
  }, [auth.accessToken])

  const loadTabData = useCallback(async (sheetId, tabName) => {
    setDataLoading(true)
    setError(null)
    try {
      const hit = getCached(sheetId, tabName)
      const raw = hit?.data ?? await fetchSheetData(sheetId, tabName, auth.accessToken)
      if (!hit) setCached(sheetId, tabName, raw)
      setHeaders(raw.headers)
      setMappings(autoMap(raw.headers, raw.rows))
    } catch (err) {
      setError(err.message)
    } finally {
      setDataLoading(false)
    }
  }, [auth.accessToken])

  const sheetId       = extractSheetId(url)
  const requiredMapped = ['date', 'revenue'].every((f) => mappings[f])

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (sheetId) loadTabData(sheetId, tab)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Connect your data</h2>
        <p className="text-sm text-gray-500 mt-1">Paste your Google Sheet URL — we'll detect your columns automatically.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
          Google Sheet URL
        </label>
        <input
          className="input"
          type="url"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {tabsLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="animate-spin w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading sheet…
        </div>
      )}

      {tabs.length > 1 && (
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">Sheet tab</label>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  activeTab === t
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {headers.length > 0 && (
        <MappingFields
          headers={headers}
          mappings={mappings}
          onChange={setMappings}
          loading={dataLoading}
        />
      )}

      {requiredMapped && (
        <button
          onClick={() => onComplete(sheetId, activeTab, mappings)}
          className="btn-primary w-full py-3 text-sm"
        >
          Build my dashboard →
        </button>
      )}
    </div>
  )
}

function MappingFields({ headers, mappings, onChange, loading }) {
  const FIELD_ORDER = ['date', 'revenue', 'adSpend', 'costs', 'productName']

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const allRequired = ['date', 'revenue'].every((f) => mappings[f])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Column Mapping</p>
        {allRequired && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Ready
          </span>
        )}
      </div>
      <div className="space-y-2">
        {FIELD_ORDER.map((field) => {
          const def        = SHOPIFY_SCHEMA[field]
          const isRequired = field === 'date' || field === 'revenue'
          const isMapped   = Boolean(mappings[field])
          return (
            <div key={field} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <span className="text-xs font-medium text-gray-700">{def.label}</span>
                {isRequired && <span className="ml-1 text-red-400 text-xs">*</span>}
              </div>
              <select
                value={mappings[field] || ''}
                onChange={(e) => onChange((p) => ({ ...p, [field]: e.target.value || undefined }))}
                className={[
                  'input flex-1 text-sm py-1.5',
                  isMapped ? 'border-emerald-400 ring-1 ring-emerald-200 bg-emerald-50' : '',
                ].join(' ')}
              >
                <option value="">— Not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center ${isMapped ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                {isMapped && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Done ──────────────────────────────────────────────────────────────

function StepDone() {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Building your dashboard…</h2>
        <p className="text-sm text-gray-500 mt-1">Crunching your numbers now.</p>
      </div>
      <div className="flex justify-center gap-1.5 pt-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
