/**
 * All Shopify profit calculations.
 * Input: normalised rows from normalize.js
 * costInputs: { cogs, fees, misc } — flat dollar amounts added to every row proportionally
 */

export function computeMetrics(rows, costInputs = {}) {
  const extraPerRow = ((costInputs.cogs || 0) + (costInputs.fees || 0) + (costInputs.misc || 0)) / Math.max(rows.length, 1)

  let totalRevenue = 0
  let totalAdSpend = 0
  let totalCosts   = 0
  let totalProfit  = 0

  const enriched = rows.map((row) => {
    const revenue  = row.revenue
    const adSpend  = row.adSpend
    const costs    = row.costs + extraPerRow
    const profit   = revenue - adSpend - costs
    const margin   = revenue > 0 ? profit / revenue : 0

    totalRevenue  += revenue
    totalAdSpend  += adSpend
    totalCosts    += costs
    totalProfit   += profit

    return { ...row, costs, profit, margin }
  })

  return {
    rows: enriched,
    totals: {
      revenue:  totalRevenue,
      adSpend:  totalAdSpend,
      costs:    totalCosts,
      profit:   totalProfit,
      margin:   totalRevenue > 0 ? totalProfit / totalRevenue : 0,
    },
  }
}

export function getTopProducts(enrichedRows, limit = 8) {
  const map = {}
  for (const row of enrichedRows) {
    const key = row.productName || '(unknown)'
    if (!map[key]) map[key] = { name: key, revenue: 0, adSpend: 0, costs: 0, profit: 0, orders: 0 }
    map[key].revenue  += row.revenue
    map[key].adSpend  += row.adSpend
    map[key].costs    += row.costs
    map[key].profit   += row.profit
    map[key].orders   += 1
  }
  return Object.values(map)
    .map((p) => ({ ...p, margin: p.revenue > 0 ? p.profit / p.revenue : 0 }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit)
}

export function getDailyBreakdown(enrichedRows) {
  const map = {}
  for (const row of enrichedRows) {
    const key = row.date || '(unknown)'
    if (!map[key]) map[key] = { date: key, revenue: 0, adSpend: 0, costs: 0, profit: 0, orders: 0 }
    map[key].revenue  += row.revenue
    map[key].adSpend  += row.adSpend
    map[key].costs    += row.costs
    map[key].profit   += row.profit
    map[key].orders   += 1
  }
  return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

export function getProfitOverTime(enrichedRows) {
  return getDailyBreakdown(enrichedRows).map((d) => ({
    date:    d.date,
    profit:  d.profit,
    revenue: d.revenue,
  }))
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmt$(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

export function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`
}
