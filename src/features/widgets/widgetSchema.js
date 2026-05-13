/**
 * Widget Configuration Schema
 *
 * Single source of truth for all widget types — their field definitions,
 * validation rules, aggregation options, and default formula values.
 *
 * This schema drives:
 *   - Widget builder form rendering and validation
 *   - Dashboard rendering type dispatch
 *   - Layout size defaults (see useDashboardLayout)
 *   - Future filter and comparison capabilities
 *
 * Data flow: Dataset → formula (validated here) → formulaEngine → Visualization
 */

// ── WidgetQuery model ──────────────────────────────────────────────────────────
// Follows Architecture.md pipeline:
//   Dataset → Computed Columns → Widget Filters → Grouping → Aggregation
//             → Calculated Metrics → Output
//
// WidgetQuery = {
//   datasetId:          string,
//   datasetVersionId?:  string,
//   filters:            FilterCondition[],
//   computed_columns:   { name, expression }[],
//   groupBy?:           string[],
//   metric:             MetricDefinition,
//   calculated_metrics: CalculatedMetric[],
// }
//
// MetricDefinition = { type: 'count'|'sum'|'avg'|'min'|'max'|..., column? }
//
// CalculatedMetric = {
//   name:        string,
//   aggregation: 'count'|'sum'|'avg'|'min'|'max',
//   column?:     string,
//   conditions:  FilterCondition[],  — applied after base widget filters
// }
//
// FilterCondition = { column, operator, value }

// ── Aggregation options ────────────────────────────────────────────────────────

export const AGGREGATIONS = [
  { value: 'sum',            label: 'Sum' },
  { value: 'avg',            label: 'Average' },
  { value: 'count',          label: 'Count rows' },
  { value: 'count_distinct', label: 'Count distinct' },
  { value: 'min',            label: 'Min' },
  { value: 'max',            label: 'Max' },
  { value: 'ratio',          label: 'Ratio (A ÷ B)' },
  { value: 'percent',        label: 'Percentage (A ÷ B × 100)' },
]

/**
 * Subset of aggregations valid for chart widgets.
 * ratio / percent are excluded — they are not meaningful when applied per group.
 */
export const AGGREGATIONS_CHART = AGGREGATIONS.filter(
  (a) => !['ratio', 'percent'].includes(a.value)
)

/**
 * Aggregations valid for calculated metrics (COUNTIF / SUMIF / AVGIF style).
 * A calculated metric always produces a single scalar from a conditional subset.
 */
export const CALC_AGGREGATIONS = [
  { value: 'count',          label: 'Count (COUNTIF)'    },
  { value: 'sum',            label: 'Sum (SUMIF)'         },
  { value: 'avg',            label: 'Average (AVGIF)'     },
  { value: 'min',            label: 'Min'                 },
  { value: 'max',            label: 'Max'                 },
  { value: 'count_distinct', label: 'Count distinct'      },
]

/** Factory: empty CalculatedMetric with required shape */
export function defaultCalculatedMetric() {
  return { name: '', aggregation: 'count', column: '', conditions: [] }
}

// ── Format options ─────────────────────────────────────────────────────────────

export const FORMATS = [
  { value: 'number',   label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'percent',  label: 'Percent (%)' },
]

// ── Colour palette ─────────────────────────────────────────────────────────────

export const COLORS = ['blue', 'emerald', 'amber', 'red', 'purple', 'gray']

// ── Widget type schema map ─────────────────────────────────────────────────────

/**
 * Each entry defines:
 *   label           — human-readable type name
 *   description     — short description shown in the type picker
 *   supportsFilters — whether the widget accepts row-level filters
 *   formulaFields   — ordered list of formula keys this type writes
 *   aggregations    — which aggregation options apply
 *   defaults        — default formula values (merged with { widget_type })
 *   validate(formula, headers) → string[]  — returns validation errors
 */
export const WIDGET_TYPE_SCHEMA = {
  kpi: {
    label:           'KPI Card',
    description:     'Single aggregated metric',
    supportsFilters: true,
    formulaFields:   ['aggregation', 'column', 'column2', 'filters', 'computed_columns', 'calculated_metrics'],
    aggregations:    AGGREGATIONS,
    defaults: {
      aggregation:         'sum',
      column:              null,
      column2:             null,
      filters:             [],
      computed_columns:    [],
      calculated_metrics:  [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.aggregation) errors.push('Aggregation is required.')
      const needsCol  = formula.aggregation !== 'count'
      const needsCol2 = ['ratio', 'percent'].includes(formula.aggregation)
      if (needsCol && !formula.column) errors.push('Column is required.')
      if (needsCol2 && !formula.column2) errors.push('Denominator column is required.')
      if (formula.column  && headers.length && !headers.includes(formula.column))
        errors.push(`Column "${formula.column}" not found in dataset.`)
      if (formula.column2 && headers.length && !headers.includes(formula.column2))
        errors.push(`Column "${formula.column2}" not found in dataset.`)
      return errors
    },
  },

  line_chart: {
    label:           'Line Chart',
    description:     'Trend over time or category',
    supportsFilters: true,
    formulaFields:   ['x_column', 'y_column', 'y_label', 'aggregation', 'filters', 'computed_columns'],
    aggregations:    AGGREGATIONS_CHART,
    defaults: {
      x_column:         null,
      y_column:         null,
      y_label:          '',
      aggregation:      'sum',
      filters:          [],
      computed_columns: [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.x_column) errors.push('X-axis column is required.')
      if (!formula.y_column) errors.push('Y-axis column is required.')
      if (formula.x_column && headers.length && !headers.includes(formula.x_column))
        errors.push(`Column "${formula.x_column}" not found in dataset.`)
      if (formula.y_column && headers.length && !headers.includes(formula.y_column))
        errors.push(`Column "${formula.y_column}" not found in dataset.`)
      return errors
    },
  },

  bar_chart: {
    label:           'Bar Chart',
    description:     'Compare values across categories',
    supportsFilters: true,
    formulaFields:   ['x_column', 'y_column', 'y_label', 'aggregation', 'filters', 'computed_columns'],
    aggregations:    AGGREGATIONS_CHART,
    defaults: {
      x_column:         null,
      y_column:         null,
      y_label:          '',
      aggregation:      'sum',
      filters:          [],
      computed_columns: [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.x_column) errors.push('X-axis column is required.')
      if (!formula.y_column) errors.push('Y-axis column is required.')
      if (formula.x_column && headers.length && !headers.includes(formula.x_column))
        errors.push(`Column "${formula.x_column}" not found in dataset.`)
      if (formula.y_column && headers.length && !headers.includes(formula.y_column))
        errors.push(`Column "${formula.y_column}" not found in dataset.`)
      return errors
    },
  },

  comparison: {
    label:           'Comparison',
    description:     'Two data series on one chart',
    supportsFilters: true,
    formulaFields:   ['x_column', 'y1_column', 'y1_label', 'y2_column', 'y2_label', 'aggregation', 'filters', 'computed_columns'],
    aggregations:    AGGREGATIONS_CHART,
    defaults: {
      x_column:         null,
      y1_column:        null,
      y1_label:         'Series 1',
      y2_column:        null,
      y2_label:         'Series 2',
      aggregation:      'sum',
      filters:          [],
      computed_columns: [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.x_column)  errors.push('X-axis column is required.')
      if (!formula.y1_column) errors.push('Series 1 column is required.')
      if (!formula.y2_column) errors.push('Series 2 column is required.')
      if (formula.x_column  && headers.length && !headers.includes(formula.x_column))
        errors.push(`Column "${formula.x_column}" not found in dataset.`)
      if (formula.y1_column && headers.length && !headers.includes(formula.y1_column))
        errors.push(`Column "${formula.y1_column}" not found in dataset.`)
      if (formula.y2_column && headers.length && !headers.includes(formula.y2_column))
        errors.push(`Column "${formula.y2_column}" not found in dataset.`)
      return errors
    },
  },

  pivot_table: {
    label:           'Pivot Table',
    description:     'Group and aggregate data',
    supportsFilters: true,
    formulaFields:   ['group_by', 'value_column', 'aggregation', 'filters', 'computed_columns'],
    aggregations:    AGGREGATIONS_CHART,
    defaults: {
      group_by:         [],
      value_column:     null,
      aggregation:      'sum',
      filters:          [],
      computed_columns: [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.group_by?.length) errors.push('At least one group-by column is required.')
      if (!formula.value_column) errors.push('Value column is required.')
      if (formula.value_column && headers.length && !headers.includes(formula.value_column))
        errors.push(`Column "${formula.value_column}" not found in dataset.`)
      return errors
    },
  },

  period_comparison: {
    label:           'Period Compare',
    description:     'Current vs previous period',
    supportsFilters: true,
    formulaFields:   ['aggregation', 'column', 'filters', 'computed_columns'],
    aggregations:    AGGREGATIONS,
    defaults: {
      aggregation:      'sum',
      column:           null,
      filters:          [],
      computed_columns: [],
    },
    validate(formula, headers = []) {
      const errors = []
      if (!formula.aggregation) errors.push('Aggregation is required.')
      if (formula.aggregation !== 'count' && !formula.column) errors.push('Column is required.')
      if (formula.column && headers.length && !headers.includes(formula.column))
        errors.push(`Column "${formula.column}" not found in dataset.`)
      return errors
    },
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the schema entry for a widget_type string.
 * Falls back to 'kpi' for unknown / legacy types.
 */
export function getWidgetSchema(widgetType) {
  return WIDGET_TYPE_SCHEMA[widgetType] ?? WIDGET_TYPE_SCHEMA.kpi
}

/**
 * Validate a full widget config (name + formula) against its schema.
 * @param {{ name: string, formula: object }} widget
 * @param {string[]} headers  — dataset column names for column-existence checks
 * @returns {string[]}  — empty array means valid
 */
export function validateWidget({ name, formula }, headers = []) {
  const errors = []
  if (!name?.trim()) errors.push('Name is required.')
  const schema = getWidgetSchema(formula?.widget_type)
  errors.push(...schema.validate(formula ?? {}, headers))
  return errors
}

/**
 * Build a default formula object for a given widget type.
 * Merges schema defaults with the widget_type key.
 */
export function defaultFormula(widgetType) {
  const schema = getWidgetSchema(widgetType)
  return { widget_type: widgetType, ...schema.defaults }
}
