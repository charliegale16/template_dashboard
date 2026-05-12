import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useKPIs(sourceId) {
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!sourceId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('source_id', sourceId)
      .order('sort_order')
    setLoading(false)
    if (error) { setError(error.message); return }
    setKpis(data ?? [])
  }, [sourceId])

  useEffect(() => { load() }, [load])

  const saveKPI = useCallback(async (kpi) => {
    if (kpi.id) {
      const { data, error } = await supabase.from('kpis').update(kpi).eq('id', kpi.id).select().single()
      if (error) throw new Error(error.message)
      setKpis((prev) => prev.map((k) => k.id === kpi.id ? data : k))
      return data
    } else {
      const { data, error } = await supabase.from('kpis').insert(kpi).select().single()
      if (error) throw new Error(error.message)
      setKpis((prev) => [...prev, data])
      return data
    }
  }, [])

  const deleteKPI = useCallback(async (id) => {
    await supabase.from('kpis').delete().eq('id', id)
    setKpis((prev) => prev.filter((k) => k.id !== id))
  }, [])

  return { kpis, loading, error, saveKPI, deleteKPI, reload: load }
}
