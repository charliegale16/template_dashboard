/**
 * Smart column mapping for the Shopify Profit Dashboard.
 *
 * Strategy:
 *  1. Score every (header, field) pair using a tiered alias list.
 *  2. Apply word-boundary reject rules so e.g. "total_cost" never maps to revenue.
 *  3. Optionally boost score via data-type inference on sample rows.
 *  4. Greedy assignment: always pick the highest-scoring unassigned pair,
 *     so each header and each field is used at most once.
 */

// ── Field definitions ─────────────────────────────────────────────────────────
// reject: words that — if present as a whole word in the slug — disqualify this field.
// exact / tier1 / tier2 / tier3: ordered highest → lowest confidence.
// type: expected data type used for inference fallback.

const FIELD_DEFS = {
  date: {
    reject: ['update', 'cancel', 'ship', 'deliver', 'estimate', 'due', 'birth', 'expire', 'return'],
    exact:  ['date', 'created_at', 'order_date', 'paid_at', 'day', 'order_created_at'],
    tier1:  ['processed_at', 'fulfilled_at', 'closed_at', 'transaction_date', 'sale_date', 'purchase_date'],
    tier2:  ['timestamp', 'datetime', 'period', 'week', 'month', 'year'],
    tier3:  ['time'],
    type:   'date',
  },
  revenue: {
    // "cost", "spend", "fee", "tax", "discount", "refund", "ship" disqualify
    reject: ['cost', 'spend', 'fee', 'tax', 'discount', 'refund', 'ship', 'duty', 'return'],
    exact:  ['revenue', 'total', 'subtotal', 'total_price', 'subtotal_price', 'net_payment',
             'total_revenue', 'gross_sales', 'net_sales'],
    tier1:  ['total_sales', 'gross_revenue', 'net_revenue', 'order_total', 'sales', 'lineitem_price'],
    tier2:  ['amount', 'income', 'turnover', 'proceeds'],
    tier3:  ['price', 'value', 'payment'],
    type:   'numeric',
  },
  adSpend: {
    reject: ['revenue', 'sales', 'organic', 'seo', 'cost_of', 'cogs'],
    exact:  ['ad_spend', 'ads_spend', 'advertising_spend', 'marketing_spend', 'paid_ads_spend'],
    tier1:  ['ad_cost', 'ads_cost', 'advertising_cost', 'paid_ads', 'paid_marketing', 'media_spend'],
    tier2:  ['ads', 'advertising', 'marketing', 'spend', 'ad_budget', 'campaign_spend'],
    tier3:  ['promo', 'promotion'],
    type:   'numeric',
  },
  costs: {
    reject: ['revenue', 'sales', 'ad', 'marketing', 'price', 'total', 'subtotal'],
    exact:  ['cogs', 'cost_of_goods_sold', 'cost_of_goods', 'total_cost', 'item_cost', 'unit_cost'],
    tier1:  ['product_cost', 'fulfillment_cost', 'costs', 'cost'],
    tier2:  ['expenses', 'overhead', 'opex', 'variable_cost'],
    tier3:  ['expense'],
    type:   'numeric',
  },
  productName: {
    reject: ['id', 'count', 'quantity', 'qty', 'price', 'cost', 'revenue',
             'date', 'time', 'amount', 'number', 'total', 'tax', 'status'],
    exact:  ['product_name', 'lineitem_name', 'product_title', 'variant_title'],
    tier1:  ['product', 'item_name', 'lineitem_sku', 'sku', 'name', 'title'],
    tier2:  ['item', 'description', 'goods', 'merchandise'],
    tier3:  ['label'],
    type:   'text',
  },
}

const TIER_SCORES   = { exact: 100, tier1: 80, tier2: 55, tier3: 35 }
const PARTIAL_BONUS = -20  // partial match is weaker than exact
const MIN_CONFIDENCE = 30

// ── Helpers ───────────────────────────────────────────────────────────────────

function slug(str) {
  return String(str).toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '')
}

/** Split a slug into individual words for word-boundary checks. */
function words(s) {
  return s.split('_').filter(Boolean)
}

/**
 * Score a single header slug against a field definition.
 * Returns 0 if the header matches any reject word.
 */
function scoreHeader(headerSlug, def) {
  // Word-boundary reject check — "discount".split("_") ≠ ["cost"]
  const w = words(headerSlug)
  if ((def.reject || []).some((r) => w.includes(r))) return 0

  const tiers = [
    ['exact', TIER_SCORES.exact],
    ['tier1', TIER_SCORES.tier1],
    ['tier2', TIER_SCORES.tier2],
    ['tier3', TIER_SCORES.tier3],
  ]

  for (const [tier, baseScore] of tiers) {
    for (const alias of (def[tier] || [])) {
      if (headerSlug === alias) return baseScore
      // Partial containment — penalised
      if (headerSlug.includes(alias) || alias.includes(headerSlug)) {
        return baseScore + PARTIAL_BONUS
      }
    }
  }

  return 0
}

/**
 * Infer the dominant data type of a column from up to 10 sample values.
 * Returns 'date' | 'numeric' | 'text' | null.
 */
function inferType(samples) {
  const vals = samples.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (vals.length === 0) return null

  const dateHits = vals.filter((v) => {
    const s = String(v)
    return (
      /^\d{4}-\d{2}-\d{2}/.test(s) ||
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s)
    )
  }).length
  if (dateHits / vals.length >= 0.6) return 'date'

  const numHits = vals.filter((v) => {
    const n = parseFloat(String(v).replace(/[$£€,\s]/g, ''))
    return !isNaN(n)
  }).length
  if (numHits / vals.length >= 0.7) return 'numeric'

  const textHits = vals.filter((v) => typeof v === 'string' && /[a-zA-Z]/.test(v)).length
  if (textHits / vals.length >= 0.7) return 'text'

  return null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Map sheet headers to Shopify schema fields.
 *
 * @param {string[]} headers  - Column header names from the sheet.
 * @param {any[][]}  rows     - Optional raw data rows for type-inference fallback.
 * @returns {Record<string, string>}  Partial mapping: { fieldKey → headerName }
 */
export function autoMap(headers, rows = []) {
  const slugs = headers.map(slug)
  const fields = Object.keys(FIELD_DEFS)

  // Build score matrix: matrix[field][colIdx] = score
  const matrix = {}
  for (const field of fields) {
    const def = FIELD_DEFS[field]
    matrix[field] = slugs.map((s, colIdx) => {
      let score = scoreHeader(s, def)

      // Type-inference boost when name score is weak
      if (score < TIER_SCORES.tier2 && rows.length > 0) {
        const samples = rows.slice(0, 10).map((r) => r[colIdx])
        if (inferType(samples) === def.type) {
          score = Math.max(score, MIN_CONFIDENCE + 5)
        }
      }

      return score
    })
  }

  // Greedy bipartite assignment: always take the globally highest score
  const assigned     = {}
  const usedCols     = new Set()
  const remaining    = new Set(fields)

  while (remaining.size > 0) {
    let best = { score: MIN_CONFIDENCE - 1, field: null, col: null }

    for (const field of remaining) {
      matrix[field].forEach((score, colIdx) => {
        if (!usedCols.has(colIdx) && score > best.score) {
          best = { score, field, col: colIdx }
        }
      })
    }

    if (best.field === null) break  // nothing left above threshold

    assigned[best.field] = best.col
    usedCols.add(best.col)
    remaining.delete(best.field)
  }

  // Convert colIdx → original header name
  const mappings = {}
  for (const [field, colIdx] of Object.entries(assigned)) {
    mappings[field] = headers[colIdx]
  }

  return mappings
}

// ── Row normalisation ─────────────────────────────────────────────────────────

/** Parse a cell as a float, stripping currency symbols and commas. */
function toNum(val) {
  if (typeof val === 'number') return val
  return parseFloat(String(val ?? '').replace(/[$,£€\s]/g, '')) || 0
}

/**
 * Normalise raw sheet rows into typed records using the confirmed mappings.
 * Returns: { date, revenue, adSpend, costs, productName }[]
 */
export function normalizeRows(headers, rows, mappings) {
  const colOf = (field) => {
    const col = mappings[field]
    return col ? headers.indexOf(col) : -1
  }

  const dateIdx  = colOf('date')
  const revIdx   = colOf('revenue')
  const adsIdx   = colOf('adSpend')
  const costIdx  = colOf('costs')
  const prodIdx  = colOf('productName')

  return rows
    .filter((row) => {
      // Drop completely empty rows
      if (!row || row.length === 0) return false
      if (revIdx !== -1 && !row[revIdx] && row[revIdx] !== 0) return false
      return true
    })
    .map((row) => ({
      date:        dateIdx !== -1 ? String(row[dateIdx] ?? '').trim() : '',
      revenue:     revIdx  !== -1 ? toNum(row[revIdx])                : 0,
      adSpend:     adsIdx  !== -1 ? toNum(row[adsIdx])                : 0,
      costs:       costIdx !== -1 ? toNum(row[costIdx])               : 0,
      productName: prodIdx !== -1 ? String(row[prodIdx] ?? '').trim() : '',
    }))
}
