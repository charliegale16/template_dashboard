import React from 'react'

const SOURCES = [
  {
    id: 'sheets',
    label: 'Google Sheets',
    description: 'Connect to a public or API-key-accessible Google Sheet.',
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect x="8" y="4" width="32" height="40" rx="3" fill="#34a853" />
        <rect x="14" y="16" width="20" height="2.5" rx="1" fill="white" opacity=".9" />
        <rect x="14" y="22" width="20" height="2.5" rx="1" fill="white" opacity=".9" />
        <rect x="14" y="28" width="14" height="2.5" rx="1" fill="white" opacity=".9" />
        <rect x="14" y="8" width="12" height="6" rx="1" fill="white" opacity=".2" />
      </svg>
    ),
    available: true,
  },
  {
    id: 'excel',
    label: 'Excel / Microsoft 365',
    description: 'Upload an .xlsx file or connect via Microsoft Graph API.',
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
        <rect x="8" y="4" width="32" height="40" rx="3" fill="#217346" />
        <path d="M16 14l6 10-6 10h4l4-7 4 7h4l-6-10 6-10h-4l-4 7-4-7z" fill="white" opacity=".85" />
      </svg>
    ),
    available: false,
  },
]

export default function Step1Source({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Choose your data source</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select where your dashboard data lives. More sources coming soon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOURCES.map((source) => {
          const selected = config.source === source.id
          return (
            <button
              key={source.id}
              type="button"
              disabled={!source.available}
              onClick={() => source.available && onChange({ source: source.id })}
              className={[
                'relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                source.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                selected
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <div className="mt-0.5 shrink-0">{source.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{source.label}</span>
                  {!source.available && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{source.description}</p>
              </div>
              {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
