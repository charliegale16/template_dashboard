import React, { useState } from 'react'
import { WIDGET_REGISTRY, SIZE_SPANS, SIZES } from '../../widgets/registry'
import WidgetConfigDrawer from './WidgetConfigDrawer'

export default function WidgetGrid({
  widgets,
  filteredTabDataMap,
  config,
  editMode,
  onUpdate,
  onRemove,
  onMove,
  onAdd,
}) {
  // { widgetId, tab } — which widget's config drawer is open
  const [configuring, setConfiguring] = useState(null)

  if (!widgets?.length) {
    return <EmptyGrid editMode={editMode} onAdd={onAdd} message="No widgets configured." />
  }

  const tabs = (config.sheetTabs || (config.sheetName ? [config.sheetName] : []))
    .filter((tab) => config.tabMappings?.[tab]?.revenue)

  if (!tabs.length) {
    return (
      <EmptyGrid
        editMode={editMode}
        onAdd={onAdd}
        message="No column mappings found. Open Settings to map your columns."
      />
    )
  }

  const multiTab = tabs.length > 1

  // Resolve the tab context for the open config drawer
  const configuringWidget = configuring
    ? widgets.find((w) => w.id === configuring.widgetId)
    : null
  const configuringTab = configuring?.tab ?? tabs[0]
  const configuringHeaders = filteredTabDataMap[configuringTab]?.headers ?? []
  const configuringTabMappings = config.tabMappings?.[configuringTab] ?? {}

  return (
    <>
      <div className="space-y-10">
        {tabs.map((tab) => {
          const data = filteredTabDataMap[tab] || { headers: [], rows: [] }

          return (
            <div key={tab}>
              {multiTab && (
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">{tab}</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{data.rows.length} rows</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-min">
                {widgets.map((widget, idx) => {
                  const entry = WIDGET_REGISTRY[widget.type]
                  if (!entry) return null

                  // Per-widget overrides merged on top of the tab's shared mappings
                  const tabMappings = config.tabMappings[tab] || {}
                  const effectiveMappings = { ...tabMappings, ...(widget.config || {}) }
                  const effectiveConfig = { ...config, mappings: effectiveMappings }

                  const { component: Widget, props: extraProps = {} } = entry
                  const span = SIZE_SPANS[widget.size] ?? SIZE_SPANS.md

                  return (
                    <div key={widget.id} className={span}>
                      {editMode ? (
                        <EditableWidget
                          widget={widget}
                          isFirst={idx === 0}
                          isLast={idx === widgets.length - 1}
                          hasOverrides={Boolean(widget.config && Object.keys(widget.config).length)}
                          hasConfigurableRoles={(entry.configurableRoles ?? []).length > 0}
                          onUpdate={(updates) => onUpdate(widget.id, updates)}
                          onRemove={() => onRemove(widget.id)}
                          onMoveLeft={() => onMove(widget.id, -1)}
                          onMoveRight={() => onMove(widget.id, 1)}
                          onConfigure={() => setConfiguring({ widgetId: widget.id, tab })}
                        >
                          <Widget data={data} config={effectiveConfig} {...extraProps} />
                        </EditableWidget>
                      ) : (
                        <Widget data={data} config={effectiveConfig} {...extraProps} />
                      )}
                    </div>
                  )
                })}

                {editMode && (
                  <div className="col-span-1">
                    <button
                      onClick={onAdd}
                      className="w-full h-full min-h-[120px] rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-medium">Add widget</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <WidgetConfigDrawer
        open={Boolean(configuring)}
        widget={configuringWidget}
        tabHeaders={configuringHeaders}
        tabMappings={configuringTabMappings}
        multiTab={multiTab}
        onUpdate={onUpdate}
        onClose={() => setConfiguring(null)}
      />
    </>
  )
}

function EditableWidget({
  widget,
  isFirst,
  isLast,
  hasOverrides,
  hasConfigurableRoles,
  onUpdate,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onConfigure,
  children,
}) {
  return (
    <div className="relative group">
      {/* Highlight ring */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-brand-400/0 group-hover:ring-brand-400/60 transition-all pointer-events-none z-10" />

      {/* Content */}
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">
        {children}
      </div>

      {/* Override badge */}
      {hasOverrides && (
        <div className="absolute top-2 left-2 z-20">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full border border-brand-200">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Custom data
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Configure data */}
        {hasConfigurableRoles && (
          <button
            title="Configure data"
            onClick={onConfigure}
            className="p-1 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm text-gray-400 hover:text-brand-600 hover:border-brand-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        )}

        {/* Size buttons */}
        <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {SIZES.map((s) => (
            <button
              key={s.id}
              title={s.title}
              onClick={() => onUpdate({ size: s.id })}
              className={[
                'px-2 py-1 text-xs font-semibold transition-colors',
                widget.size === s.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Move */}
        <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <button
            title="Move left"
            disabled={isFirst}
            onClick={onMoveLeft}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            title="Move right"
            disabled={isLast}
            onClick={onMoveRight}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Remove */}
        <button
          title="Remove widget"
          onClick={onRemove}
          className="p-1 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Size label */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-medium text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100">
          {SIZES.find((s) => s.id === widget.size)?.title ?? widget.size}
        </span>
      </div>
    </div>
  )
}

function EmptyGrid({ editMode, onAdd, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-gray-400 text-sm">{message}</p>
      {editMode && (
        <button onClick={onAdd} className="btn-primary text-sm px-4 py-2">
          + Add your first widget
        </button>
      )}
    </div>
  )
}
