/**
 * Supabase Edge Function: send-report
 *
 * Called by pg_cron every hour. Finds all active schedules where next_run_at <= now(),
 * computes KPI values, generates an HTML email, and sends it via Resend.
 *
 * Deploy:
 *   supabase functions deploy send-report
 *
 * Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY   — from resend.com (free tier: 3,000 emails/month)
 *   FROM_EMAIL       — e.g. reports@yourdomain.com (must be verified in Resend)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Schedule {
  id: string
  user_id: string
  source_id: string
  name: string
  recipient: string
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  hour_utc: number
  date_filter: { type: string; value: number | null }
  active: boolean
  last_sent_at: string | null
  next_run_at: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeNextRun(s: Schedule): string {
  const now = new Date()
  const next = new Date()
  next.setUTCHours(s.hour_utc, 0, 0, 0)

  if (s.frequency === 'daily') {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  } else if (s.frequency === 'weekly') {
    const currentDay = next.getUTCDay()
    const target = s.day_of_week ?? 1
    let daysUntil = (target - currentDay + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setUTCDate(next.getUTCDate() + daysUntil)
  } else if (s.frequency === 'monthly') {
    next.setUTCDate(s.day_of_month ?? 1)
    if (next <= now) {
      next.setUTCMonth(next.getUTCMonth() + 1)
      next.setUTCDate(s.day_of_month ?? 1)
    }
  }

  return next.toISOString()
}

function toNum(val: unknown): number {
  return parseFloat(String(val ?? '').replace(/[$£€,%\s,]/g, '')) || 0
}

function computeKPI(rows: { data: Record<string, unknown> }[], formula: Record<string, unknown>): number {
  if (!rows.length) return 0
  const { aggregation, column, column2 } = formula as { aggregation: string; column: string; column2: string }
  const nums = rows.map((r) => toNum(r.data?.[column]))
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

  switch (aggregation) {
    case 'sum':            return sum(nums)
    case 'avg':            return sum(nums) / nums.length
    case 'count':          return rows.length
    case 'count_distinct': return new Set(rows.map((r) => String(r.data?.[column] ?? ''))).size
    case 'min':            return Math.min(...nums)
    case 'max':            return Math.max(...nums)
    case 'ratio': {
      const den = sum(rows.map((r) => toNum(r.data?.[column2])))
      return den !== 0 ? sum(nums) / den : 0
    }
    case 'percent': {
      const den = sum(rows.map((r) => toNum(r.data?.[column2])))
      return den !== 0 ? (sum(nums) / den) * 100 : 0
    }
    default: return 0
  }
}

function formatValue(value: number, format: string): string {
  if (!isFinite(value)) return '—'
  if (format === 'currency') {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }
  if (format === 'percent') return `${value.toFixed(1)}%`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000)     return `${(value / 1_000).toFixed(1)}K`
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
}

function parseDate(val: unknown): Date | null {
  if (!val) return null
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? null : d
}

function filterRows(rows: { data: Record<string, unknown> }[], headers: string[], dateFilter: { type: string; value: number | null }) {
  if (dateFilter.type === 'all') return rows
  const dateCol = headers.find((h) => /date|day|time|created|period|month/i.test(h))
  if (!dateCol) return rows
  const now = new Date()
  return rows.filter((r) => {
    const d = parseDate(r.data?.[dateCol])
    if (!d) return false
    if (dateFilter.type === 'days') {
      const cutoff = new Date()
      cutoff.setDate(now.getDate() - (dateFilter.value ?? 30))
      return d >= cutoff
    }
    if (dateFilter.type === 'ytd') {
      return d >= new Date(now.getFullYear(), 0, 1) && d <= now
    }
    if (dateFilter.type === 'year') {
      return d.getFullYear() === dateFilter.value
    }
    return true
  })
}

function frequencyLabel(s: Schedule): string {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  if (s.frequency === 'daily')   return `Daily at ${s.hour_utc}:00 UTC`
  if (s.frequency === 'weekly')  return `Every ${DAYS[s.day_of_week ?? 1]} at ${s.hour_utc}:00 UTC`
  if (s.frequency === 'monthly') return `Monthly on the ${s.day_of_month ?? 1}${['st','nd','rd'][((s.day_of_month ?? 1) - 1) % 10] ?? 'th'} at ${s.hour_utc}:00 UTC`
  return s.frequency
}

function filterLabel(f: { type: string; value: number | null }): string {
  if (f.type === 'all')   return 'All time'
  if (f.type === 'days')  return `Last ${f.value} days`
  if (f.type === 'ytd')   return 'Year to date'
  if (f.type === 'year')  return `Full year ${f.value}`
  return 'Custom'
}

// ── HTML email template ───────────────────────────────────────────────────────

function buildEmailHTML(
  sourceName: string,
  reportName: string,
  dateFilterLabel: string,
  kpiResults: { name: string; value: string; color: string }[],
  rowCount: number,
  generatedAt: string,
  scheduleLabel: string,
): string {
  const colorMap: Record<string, string> = {
    blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
    red: '#ef4444', purple: '#8b5cf6', gray: '#9ca3af',
  }

  const kpiCards = kpiResults.map(({ name, value, color }) => `
    <td style="padding:8px;width:${Math.floor(100 / Math.min(kpiResults.length, 4))}%">
      <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;border-left:4px solid ${colorMap[color] ?? '#3b82f6'};padding:16px 20px;">
        <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${name}</div>
        <div style="font-size:26px;font-weight:800;color:${colorMap[color] ?? '#3b82f6'};line-height:1;">${value}</div>
      </div>
    </td>`).join('')

  const kpiRows: string[] = []
  for (let i = 0; i < kpiResults.length; i += 4) {
    const chunk = kpiResults.slice(i, i + 4)
    while (chunk.length < 4) chunk.push({ name: '', value: '', color: 'gray' })
    kpiRows.push(`<tr>${chunk.map(({ name, value, color }) => name ? `
      <td style="padding:8px;width:25%">
        <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;border-left:4px solid ${colorMap[color] ?? '#3b82f6'};padding:16px 20px;">
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${name}</div>
          <div style="font-size:26px;font-weight:800;color:${colorMap[color] ?? '#3b82f6'};line-height:1;">${value}</div>
        </div>
      </td>` : '<td style="padding:8px;width:25%"></td>').join('')}</tr>`)
  }

  const tableRows = kpiResults.map(({ name, value }) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${reportName}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
    <div style="font-size:11px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Analytics Report</div>
    <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:4px;">${reportName}</div>
    <div style="font-size:14px;color:#bfdbfe;">${sourceName} &nbsp;·&nbsp; ${dateFilterLabel}</div>
  </td></tr>

  <!-- KPI grid -->
  <tr><td style="background:#ffffff;padding:32px 32px 8px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Key Metrics</div>
    <table width="100%" cellpadding="0" cellspacing="0">${kpiRows.join('')}</table>
  </td></tr>

  <!-- Detail table -->
  <tr><td style="background:#ffffff;padding:24px 32px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Metrics Summary</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Metric</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Value</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#94a3b8;">
          ${rowCount.toLocaleString()} rows analysed &nbsp;·&nbsp; Generated ${generatedAt}
        </td>
        <td style="text-align:right;font-size:12px;color:#94a3b8;">${scheduleLabel}</td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey    = Deno.env.get('RESEND_API_KEY')!
    const fromEmail    = Deno.env.get('FROM_EMAIL') ?? 'reports@example.com'

    const db = createClient(supabaseUrl, serviceKey)

    // 1. Find all active schedules that are due
    const { data: schedules, error: schedErr } = await db
      .from('report_schedules')
      .select('*, data_sources(name, headers)')
      .eq('active', true)
      .lte('next_run_at', new Date().toISOString())

    if (schedErr) throw schedErr
    if (!schedules?.length) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    let processed = 0

    for (const schedule of schedules) {
      try {
        const source = schedule.data_sources as { name: string; headers: string[] }

        // 2. Load rows
        const { data: rowData } = await db
          .from('data_rows')
          .select('data')
          .eq('source_id', schedule.source_id)
          .order('row_index')

        const rows = rowData ?? []
        const filtered = filterRows(rows, source.headers, schedule.date_filter)

        // 3. Load KPIs for this source
        const { data: kpis } = await db
          .from('kpis')
          .select('*')
          .eq('source_id', schedule.source_id)
          .eq('user_id', schedule.user_id)
          .order('sort_order')

        const kpiCards = (kpis ?? [])
          .filter((k: Record<string, unknown>) => !k.formula || (k.formula as Record<string, unknown>).widget_type === 'kpi' || !(k.formula as Record<string, unknown>).widget_type)
          .map((k: Record<string, unknown>) => ({
            name: String(k.name),
            value: formatValue(computeKPI(filtered, k.formula as Record<string, unknown>), String(k.format ?? 'number')),
            color: String(k.color ?? 'blue'),
          }))

        // 4. Build and send email
        const generatedAt = new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        }) + ' UTC'

        const html = buildEmailHTML(
          source.name,
          schedule.name,
          filterLabel(schedule.date_filter),
          kpiCards,
          filtered.length,
          generatedAt,
          frequencyLabel(schedule),
        )

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: fromEmail,
            to: [schedule.recipient],
            subject: `${schedule.name} — ${filterLabel(schedule.date_filter)}`,
            html,
          }),
        })

        if (!emailRes.ok) {
          const err = await emailRes.text()
          console.error(`Failed to send email for schedule ${schedule.id}: ${err}`)
          continue
        }

        // 5. Update last_sent_at and next_run_at
        await db.from('report_schedules').update({
          last_sent_at: new Date().toISOString(),
          next_run_at: computeNextRun(schedule as Schedule),
        }).eq('id', schedule.id)

        processed++
      } catch (err) {
        console.error(`Error processing schedule ${schedule.id}:`, err)
      }
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
