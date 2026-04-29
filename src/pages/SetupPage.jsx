import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Step1Source from '../components/Wizard/Step1Source'
import Step2Connect from '../components/Wizard/Step2Connect'
import Step3Map from '../components/Wizard/Step3Map'
import Step4Widgets from '../components/Wizard/Step4Widgets'

const STEPS = [
  { label: 'Data source' },
  { label: 'Connect' },
  { label: 'Map columns' },
  { label: 'Widgets' },
]

export default function SetupPage({ config, saveConfig }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  function handleChange(updates) {
    saveConfig(updates)
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      navigate('/dashboard')
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
    else navigate('/')
  }

  function canAdvance() {
    if (step === 0) return Boolean(config.source)
    if (step === 1) return Boolean(config.sheetId && config.apiKey)
    if (step === 2) return Boolean(config.mappings?.primaryMetric)
    if (step === 3) return Boolean(config.widgets?.length && config.dashboardName)
    return true
  }

  const StepComponent = [Step1Source, Step2Connect, Step3Map, Step4Widgets][step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Connect your data in 4 quick steps.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => i < step && setStep(i)}
                className={[
                  'flex items-center gap-1.5 text-xs font-medium transition-colors',
                  i === step ? 'text-brand-600' : i < step ? 'text-gray-500 hover:text-gray-700 cursor-pointer' : 'text-gray-300 cursor-default',
                ].join(' ')}
              >
                <span className={[
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold',
                  i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-300',
                ].join(' ')}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? 'bg-gray-300' : 'bg-gray-100'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <StepComponent config={config} onChange={handleChange} />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          <button className="btn-secondary" onClick={handleBack}>
            ← {step === 0 ? 'Home' : 'Back'}
          </button>
          <button className="btn-primary" onClick={handleNext} disabled={!canAdvance()}>
            {step === STEPS.length - 1 ? 'Go to Dashboard →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
