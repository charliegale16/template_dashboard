import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Next-run computation (mirrors edge function logic) ────────────────────────

export function computeNextRun(frequency, dayOfWeek, dayOfMonth, hourUtc) {
  const now = new Date()
  const next = new Date()
  next.setUTCHours(hourUtc, 0, 0, 0)

  if (frequency === 'daily') {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  } else if (frequency === 'weekly') {
    const currentDay = next.getUTCDay()
    const target = dayOfWeek ?? 1
    let daysUntil = (target - currentDay + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setUTCDate(next.getUTCDate() + daysUntil)
  } else if (frequency === 'monthly') {
    next.setUTCDate(dayOfMonth ?? 1)
    if (next <= now) {
      next.setUTCMonth(next.getUTCMonth() + 1)
      next.setUTCDate(dayOfMonth ?? 1)
    }
  }

  return next.toISOString()
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReports(sourceId) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!sourceId) return
    setLoading(true)
    const { data } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
    setSchedules(data ?? [])
    setLoading(false)
  }, [sourceId])

  useEffect(() => { load() }, [load])

  /** Create or update a schedule. Pass id to update. */
  const saveSchedule = useCallback(async (schedule) => {
    const payload = {
      ...schedule,
      next_run_at: computeNextRun(
        schedule.frequency,
        schedule.day_of_week,
        schedule.day_of_month,
        schedule.hour_utc ?? 9,
      ),
    }

    if (payload.id) {
      const { data, error } = await supabase
        .from('report_schedules')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      setSchedules((s) => s.map((x) => x.id === data.id ? data : x))
      return data
    } else {
      const { data, error } = await supabase
        .from('report_schedules')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      setSchedules((s) => [data, ...s])
      return data
    }
  }, [])

  const deleteSchedule = useCallback(async (id) => {
    await supabase.from('report_schedules').delete().eq('id', id)
    setSchedules((s) => s.filter((x) => x.id !== id))
  }, [])

  const toggleSchedule = useCallback(async (id, active) => {
    const { data } = await supabase
      .from('report_schedules')
      .update({ active })
      .eq('id', id)
      .select()
      .single()
    if (data) setSchedules((s) => s.map((x) => x.id === id ? data : x))
  }, [])

  return { schedules, loading, saveSchedule, deleteSchedule, toggleSchedule, reload: load }
}
