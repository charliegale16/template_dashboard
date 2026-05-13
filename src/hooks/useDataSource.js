import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const BATCH_SIZE = 500

/** List all data sources for the current user */
export function useDataSources() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSources(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const deleteSource = useCallback(async (id) => {
    await supabase.from('data_sources').delete().eq('id', id)
    setSources((s) => s.filter((x) => x.id !== id))
  }, [])

  return { sources, loading, error, reload: load, deleteSource }
}

/** Save a new data source + its rows to Supabase */
export async function saveDataSource({ userId, name, type, headers, rows, meta = {} }) {
  // 1. Insert the source record
  const { data: source, error: srcErr } = await supabase
    .from('data_sources')
    .insert({ user_id: userId, name, type, headers, row_count: rows.length, meta })
    .select()
    .single()
  if (srcErr) throw new Error(srcErr.message)

  // 2. Batch-insert rows
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((rowArr, j) => {
      // rowArr is a plain array; convert to { header: value } object
      const data = {}
      headers.forEach((h, hi) => { data[h] = rowArr[hi] ?? '' })
      return { source_id: source.id, user_id: userId, row_index: i + j, data }
    })
    const { error: rowErr } = await supabase.from('data_rows').insert(batch)
    if (rowErr) throw new Error(rowErr.message)
  }

  return source
}

/** Load all rows for a source */
export async function loadRows(sourceId) {
  const { data, error } = await supabase
    .from('data_rows')
    .select('data')
    .eq('source_id', sourceId)
    .order('row_index')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Load a single source record */
export async function loadSource(sourceId) {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('id', sourceId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Duplicate a data source — clones the source record and all its widgets.
 *
 * Does NOT copy data_rows (too expensive). The new source starts with 0 rows
 * and a `meta.template_from` reference so the user knows to upload data.
 * All widget (KPI) configurations are copied intact.
 */
export async function duplicateSource(sourceId, userId) {
  // 1. Load original source
  const { data: source, error: srcErr } = await supabase
    .from('data_sources')
    .select('*')
    .eq('id', sourceId)
    .single()
  if (srcErr) throw new Error(srcErr.message)

  // 2. Create new source record (no rows)
  const { data: newSource, error: newErr } = await supabase
    .from('data_sources')
    .insert({
      user_id:   userId,
      name:      `${source.name} (Copy)`,
      type:      source.type,
      headers:   source.headers,
      row_count: 0,
      meta: {
        ...(source.meta ?? {}),
        version:       1,
        template_from: sourceId,
        uploaded_at:   new Date().toISOString(),
      },
    })
    .select()
    .single()
  if (newErr) throw new Error(newErr.message)

  // 3. Copy all widgets to new source
  const { data: kpis, error: kpiErr } = await supabase
    .from('kpis')
    .select('*')
    .eq('source_id', sourceId)
    .order('sort_order')
  if (kpiErr) throw new Error(kpiErr.message)

  if (kpis?.length) {
    const newKpis = kpis.map(({ id: _id, ...k }) => ({
      ...k,
      source_id: newSource.id,
    }))
    const { error: insertErr } = await supabase.from('kpis').insert(newKpis)
    if (insertErr) throw new Error(insertErr.message)
  }

  return newSource
}

/**
 * Re-upload data to an existing source.
 *
 * Preserves the source_id — all widgets, layouts, and KPIs remain intact.
 * Steps:
 *   1. Delete all existing data_rows for the source
 *   2. Batch-insert the new rows
 *   3. Update data_sources metadata (headers, row_count, version, updated_at)
 *
 * Version is tracked inside the meta JSONB column so no schema change is needed.
 */
export async function refreshDataSource({ sourceId, userId, headers, rows, meta = {} }) {
  // 1. Remove existing rows
  const { error: delErr } = await supabase
    .from('data_rows')
    .delete()
    .eq('source_id', sourceId)
  if (delErr) throw new Error(delErr.message)

  // 2. Batch-insert new rows
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((rowArr, j) => {
      const data = {}
      headers.forEach((h, hi) => { data[h] = rowArr[hi] ?? '' })
      return { source_id: sourceId, user_id: userId, row_index: i + j, data }
    })
    const { error: rowErr } = await supabase.from('data_rows').insert(batch)
    if (rowErr) throw new Error(rowErr.message)
  }

  // 3. Update source record — bump version, record timestamp
  const prevVersion = meta.version ?? 1
  const { data: source, error: srcErr } = await supabase
    .from('data_sources')
    .update({
      headers,
      row_count: rows.length,
      meta: {
        ...meta,
        version:    prevVersion + 1,
        updated_at: new Date().toISOString(),
      },
    })
    .eq('id', sourceId)
    .select()
    .single()
  if (srcErr) throw new Error(srcErr.message)
  return source
}

/** Rename a data source */
export async function renameSource(id, newName) {
  const { error } = await supabase
    .from('data_sources')
    .update({ name: newName.trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
