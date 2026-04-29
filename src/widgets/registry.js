import KPICard from './KPICard'
import LineChart from './LineChart'
import BarChart from './BarChart'
import DataTable from './DataTable'

export const WIDGET_REGISTRY = {
  kpi_total: {
    component: KPICard,
    props: { variant: 'total' },
    defaultSize: 'sm',
    label: 'KPI — Total',
    description: 'Sum of the primary metric with % change vs. prior period.',
    icon: '📊',
    requires: ['primaryMetric'],
    configurableRoles: ['primaryMetric'],
  },
  kpi_orders: {
    component: KPICard,
    props: { variant: 'orders' },
    defaultSize: 'sm',
    label: 'KPI — Orders',
    description: 'Row count with % change vs. prior period.',
    icon: '🛒',
    requires: [],
    configurableRoles: [],
  },
  kpi_aov: {
    component: KPICard,
    props: { variant: 'aov' },
    defaultSize: 'sm',
    label: 'KPI — Avg Order Value',
    description: 'Primary metric ÷ row count with % change.',
    icon: '💰',
    requires: ['primaryMetric'],
    configurableRoles: ['primaryMetric'],
  },
  revenue_over_time: {
    component: LineChart,
    props: {},
    defaultSize: 'md',
    label: 'Line Chart',
    description: 'Primary metric plotted over time.',
    icon: '📈',
    requires: ['date', 'primaryMetric'],
    configurableRoles: ['date', 'primaryMetric', 'secondaryMetric'],
  },
  top_categories: {
    component: BarChart,
    props: {},
    defaultSize: 'md',
    label: 'Bar Chart',
    description: 'Primary metric broken down by category.',
    icon: '📉',
    requires: ['category', 'primaryMetric'],
    configurableRoles: ['primaryMetric', 'category'],
  },
  data_table: {
    component: DataTable,
    props: {},
    defaultSize: 'full',
    label: 'Data Table',
    description: 'Paginated raw data view with sorting.',
    icon: '🗂️',
    requires: [],
    configurableRoles: [],
  },
}

// col-span classes per size — grid is lg:grid-cols-4
export const SIZE_SPANS = {
  sm:   'col-span-1',
  md:   'col-span-2',
  lg:   'sm:col-span-2 lg:col-span-3',
  full: 'col-span-full',
}

export const SIZES = [
  { id: 'sm',   label: 'S',    title: 'Small — 1 col' },
  { id: 'md',   label: 'M',    title: 'Medium — 2 cols' },
  { id: 'lg',   label: 'L',    title: 'Large — 3 cols' },
  { id: 'full', label: '⬛',   title: 'Full width' },
]

export function makeWidget(type) {
  const entry = WIDGET_REGISTRY[type]
  return {
    id: crypto.randomUUID(),
    type,
    size: entry?.defaultSize ?? 'md',
  }
}
