/**
 * useDashboardLayout
 *
 * ROW_HEIGHT = 32px, GAP = 12px  (set in DashboardPage)
 *   KPI S(h=2)  → 2×32 + 1×12 =  76px  (default)
 *   KPI M(h=3)  → 3×32 + 2×12 = 120px
 *   KPI L(h=4)  → 4×32 + 3×12 = 164px
 *   Chart h=5   → 5×32 + 4×12 = 208px  (default)
 *
 * LAYOUT_VERSION must be bumped whenever ROW_HEIGHT or default sizes change.
 * A version mismatch auto-resets every user's saved layout to fresh defaults.
 *
 * Snapshot storage — layout JSONB shape:
 *   { v: N, items: [...current items...], snapshots: [{id, name, items, savedAt}] }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const LAYOUT_VERSION  = 6   // ← bumped: ROW_HEIGHT 40→32, compact KPI (h=2) + chart h=5
const MAX_SNAPSHOTS   = 10

// ROW_HEIGHT = 32px, GAP = 12px  (set in DashboardPage)
// KPI presets:   S(h=2)→76px  M(h=3)→120px  L(h=4)→164px  — default S
// Chart default: h=5 → 208px  (½ or full width)
const SIZE_CONFIG = {
  kpi: {
    w: 3, h: 2,
    minW: 2, maxW: 12,
    minH: 2, maxH: 10,
  },
  line_chart: {
    w: 12, h: 5,
    minW: 4, maxW: 12,
    minH: 3, maxH: 30,
  },
  bar_chart: {
    w: 12, h: 5,
    minW: 4, maxW: 12,
    minH: 3, maxH: 30,
  },
  comparison: {
    w: 12, h: 5,
    minW: 4, maxW: 12,
    minH: 3, maxH: 30,
  },
}

function widgetType(kpi) {
  return kpi.formula?.widget_type ?? 'kpi'
}

function cfg(kpi) {
  return SIZE_CONFIG[widgetType(kpi)] ?? SIZE_CONFIG.kpi
}

export function buildDefaultLayout(kpis) {
  const layout = []
  const kpiWidgets   = kpis.filter((k) => widgetType(k) === 'kpi')
  const chartWidgets = kpis.filter((k) => widgetType(k) !== 'kpi')

  const kc = SIZE_CONFIG.kpi
  const perRow = Math.floor(12 / kc.w)   // 3 KPI cards per row

  kpiWidgets.forEach((kpi, i) => {
    layout.push({
      i: kpi.id,
      x: (i % perRow) * kc.w,
      y: Math.floor(i / perRow) * kc.h,
      w: kc.w, h: kc.h,
      minW: kc.minW, maxW: kc.maxW,
      minH: kc.minH, maxH: kc.maxH,
    })
  })

  const chartStartY = Math.ceil(kpiWidgets.length / perRow) * kc.h
  chartWidgets.forEach((widget, i) => {
    const c = cfg(widget)
    layout.push({
      i: widget.id,
      x: 0,
      y: chartStartY + i * c.h,
      w: c.w, h: c.h,
      minW: c.minW, maxW: c.maxW,
      minH: c.minH, maxH: c.maxH,
    })
  })

  return layout
}

function mergeLayout(savedItems, kpis) {
  const kpiById  = Object.fromEntries(kpis.map((k) => [k.id, k]))
  const savedIds = new Set(savedItems.map((l) => l.i))

  const valid = savedItems
    .filter((l) => kpiById[l.i])
    .map((l) => {
      const c = cfg(kpiById[l.i])
      return {
        ...l,
        w: Math.min(Math.max(l.w, c.minW), c.maxW),
        h: Math.min(Math.max(l.h, c.minH), c.maxH),
        minW: c.minW, maxW: c.maxW,
        minH: c.minH, maxH: c.maxH,
      }
    })

  const newWidgets = kpis.filter((k) => !savedIds.has(k.id))
  if (newWidgets.length) {
    const maxY = valid.reduce((acc, l) => Math.max(acc, l.y + l.h), 0)
    buildDefaultLayout(newWidgets).forEach((l) => valid.push({ ...l, y: l.y + maxY }))
  }

  return valid
}

/** Persist the full layout JSONB (items + snapshots) to Supabase. */
async function persist({ sourceId, userId, items, snapshots }) {
  const { error } = await supabase.from('dashboard_layouts').upsert(
    {
      user_id:    userId,
      source_id:  sourceId,
      layout:     { v: LAYOUT_VERSION, items, snapshots: snapshots ?? [] },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,source_id' }
  )
  if (error) console.error('[layout] save failed:', error.message)
}

export function useDashboardLayout(sourceId, userId, kpis) {
  const [layout, setLayout]         = useState([])
  const [snapshots, setSnapshots]   = useState([])
  const [layoutLoaded, setLoaded]   = useState(false)
  const saveTimer                   = useRef(null)
  // Keep a ref so callbacks always close over the latest snapshots without re-creating
  const snapshotsRef = useRef(snapshots)
  useEffect(() => { snapshotsRef.current = snapshots }, [snapshots])

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sourceId || !userId || !kpis.length) return

    supabase
      .from('dashboard_layouts')
      .select('layout')
      .eq('source_id', sourceId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const saved   = data?.layout
        const isValid = saved && !Array.isArray(saved) && saved.v === LAYOUT_VERSION && saved.items?.length

        const snaps = (saved?.snapshots ?? []).filter(Boolean)
        setSnapshots(snaps)
        snapshotsRef.current = snaps

        if (isValid) {
          setLayout(mergeLayout(saved.items, kpis))
        } else {
          const fresh = buildDefaultLayout(kpis)
          setLayout(fresh)
          persist({ sourceId, userId, items: fresh, snapshots: snaps })
        }
        setLoaded(true)
      })
  }, [sourceId, userId, kpis.length]) // eslint-disable-line

  // ── Debounced layout save (items only, preserves snapshots) ──────────────────
  const persistLayout = useCallback((newItems) => {
    if (!sourceId || !userId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      persist({ sourceId, userId, items: newItems, snapshots: snapshotsRef.current })
    }, 800)
  }, [sourceId, userId])

  const onLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout)
    persistLayout(newLayout)
  }, [persistLayout])

  // ── Manual reset ─────────────────────────────────────────────────────────────
  const resetLayout = useCallback(() => {
    if (!sourceId || !userId) return
    const fresh = buildDefaultLayout(kpis)
    setLayout(fresh)
    persist({ sourceId, userId, items: fresh, snapshots: snapshotsRef.current })
  }, [sourceId, userId, kpis])

  // ── Snapshot: save current layout as a named view ────────────────────────────
  const saveSnapshot = useCallback(async (name) => {
    if (!sourceId || !userId || !name?.trim()) return
    const snap = {
      id:      crypto.randomUUID(),
      name:    name.trim(),
      items:   layout,
      savedAt: new Date().toISOString(),
    }
    // Cap at MAX_SNAPSHOTS — drop the oldest if over limit
    const next = [...snapshotsRef.current, snap].slice(-MAX_SNAPSHOTS)
    setSnapshots(next)
    snapshotsRef.current = next
    await persist({ sourceId, userId, items: layout, snapshots: next })
    return snap
  }, [sourceId, userId, layout])

  // ── Snapshot: restore a saved view ───────────────────────────────────────────
  const loadSnapshot = useCallback((snapshotId) => {
    const snap = snapshotsRef.current.find((s) => s.id === snapshotId)
    if (!snap) return
    const restored = mergeLayout(snap.items, kpis)
    setLayout(restored)
    persist({ sourceId, userId, items: restored, snapshots: snapshotsRef.current })
  }, [sourceId, userId, kpis])

  // ── Snapshot: delete ─────────────────────────────────────────────────────────
  const deleteSnapshot = useCallback(async (snapshotId) => {
    const next = snapshotsRef.current.filter((s) => s.id !== snapshotId)
    setSnapshots(next)
    snapshotsRef.current = next
    await persist({ sourceId, userId, items: layout, snapshots: next })
  }, [sourceId, userId, layout])

  return {
    layout, layoutLoaded, onLayoutChange, resetLayout,
    snapshots, saveSnapshot, loadSnapshot, deleteSnapshot,
  }
}
