/**
 * useReport / useReportList
 *
 * CRUD hooks for the `reports` table.
 *
 * Report config shape (stored in JSONB):
 *   {
 *     title:       string,
 *     subtitle:    string,
 *     description: string,
 *     theme:       'blue' | 'navy' | 'minimal' | 'dark',
 *     header:      { showDate: bool, showSource: bool },
 *     footer:      { note: string, showRowCount: bool, showTimestamp: bool },
 *     dateFilter:  { type: string, value: number | null },
 *     sections:    Section[],
 *   }
 *
 * Section shape:
 *   { id, type: 'kpi_grid'|'chart'|'text'|'divider',
 *     widgetIds?, widgetId?, title?, content? }
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── List hook ─────────────────────────────────────────────────────────────────

export function useReportList(sourceId) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sourceId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('id, name, shared, updated_at, version')
      .eq('source_id', sourceId)
      .order('updated_at', { ascending: false })
    setReports(data ?? [])
    setLoading(false)
  }, [sourceId])

  useEffect(() => { load() }, [load])

  return { reports, loading, reload: load }
}

// ── Single report hook (for shared/public view) ───────────────────────────────

export function useReportById(reportId) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(!!reportId)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!reportId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setReport(data)
        setLoading(false)
      })
  }, [reportId])

  return { report, loading, error }
}

// ── Save (create or update) ───────────────────────────────────────────────────

export async function saveReport({ id, sourceId, userId, name, config, shared = false }) {
  if (id) {
    const { data, error } = await supabase
      .from('reports')
      .update({ name, config, shared, version: supabase.rpc ? undefined : undefined })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({ source_id: sourceId, user_id: userId, name, config, shared })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteReport(id) {
  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateReport(id, userId) {
  const { data: orig, error: loadErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()
  if (loadErr) throw new Error(loadErr.message)

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = orig
  const { data, error } = await supabase
    .from('reports')
    .insert({ ...rest, user_id: userId, name: `${orig.name} (copy)`, shared: false })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Toggle shared flag ────────────────────────────────────────────────────────

export async function setReportShared(id, shared) {
  const { data, error } = await supabase
    .from('reports')
    .update({ shared })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
