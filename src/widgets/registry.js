import KPICard from './KPICard'
import LineChart from './LineChart'
import BarChart from './BarChart'
import DataTable from './DataTable'
import CustomWidget from './CustomWidget'

export const WIDGET_REGISTRY = {
  // ── KPI cards ──────────────────────────────────────────────────────────────
  kpi_revenue: {
    component: KPICard,
    props: { variant: 'revenue' },
    defaultSize: 'sm',
    label: 'KPI — Revenue',
    description: 'Total revenue with % change vs. prior period.',
    icon: '💵',
    requires: ['revenue'],
    configurableRoles: ['revenue'],
  },
  kpi_orders: {
    component: KPICard,
    props: { variant: 'orders' },
    defaultSize: 'sm',
    label: 'KPI — Orders',
    description: 'Order count with % change vs. prior period.',
    icon: '🛒',
    requires: [],
    configurableRoles: [],
  },
  kpi_aov: {
    component: KPICard,
    props: { variant: 'aov' },
    defaultSize: 'sm',
    label: 'KPI — Avg Order Value',
    description: 'Revenue ÷ order count with % change.',
    icon: '💰',
    requires: ['revenue'],
    configurableRoles: ['revenue'],
  },
  kpi_units: {
    component: KPICard,
    props: { variant: 'units' },
    defaultSize: 'sm',
    label: 'KPI — Units Sold',
    description: 'Total units sold with % change.',
    icon: '📦',
    requires: ['quantity'],
    configurableRoles: ['quantity'],
  },
  kpi_customers: {
    component: KPICard,
    props: { variant: 'customers' },
    defaultSize: 'sm',
    label: 'KPI — Unique Customers',
    description: 'Count of distinct customer IDs.',
    icon: '👥',
    requires: ['customerId'],
    configurableRoles: ['customerId'],
  },
  kpi_margin: {
    component: KPICard,
    props: { variant: 'margin' },
    defaultSize: 'sm',
    label: 'KPI — Gross Margin',
    description: '(Revenue − Cost) ÷ Revenue as a percentage.',
    icon: '📈',
    requires: ['revenue', 'cost'],
    configurableRoles: ['revenue', 'cost'],
  },

  // ── Time-series ────────────────────────────────────────────────────────────
  revenue_over_time: {
    component: LineChart,
    props: {},
    defaultSize: 'md',
    label: 'Revenue Over Time',
    description: 'Revenue (and optional secondary metric) plotted over time.',
    icon: '📉',
    requires: ['date', 'revenue'],
    configurableRoles: ['date', 'revenue', 'secondaryMetric'],
  },

  // ── Bar charts ─────────────────────────────────────────────────────────────
  top_categories: {
    component: BarChart,
    props: { xRole: 'category', yRole: 'revenue' },
    defaultSize: 'md',
    label: 'Revenue by Category',
    description: 'Revenue broken down by product category.',
    icon: '🏷️',
    requires: ['category', 'revenue'],
    configurableRoles: ['revenue', 'category'],
  },
  top_products: {
    component: BarChart,
    props: { xRole: 'product', yRole: 'revenue', horizontal: true },
    defaultSize: 'md',
    label: 'Top Products',
    description: 'Top 10 products by revenue (horizontal bar).',
    icon: '🥇',
    requires: ['product', 'revenue'],
    configurableRoles: ['product', 'revenue'],
  },
  revenue_by_region: {
    component: BarChart,
    props: { xRole: 'region', yRole: 'revenue' },
    defaultSize: 'md',
    label: 'Revenue by Region',
    description: 'Revenue broken down by region or country.',
    icon: '🌍',
    requires: ['region', 'revenue'],
    configurableRoles: ['region', 'revenue'],
  },
  orders_by_status: {
    component: BarChart,
    props: { xRole: 'status', countMode: true },
    defaultSize: 'md',
    label: 'Orders by Status',
    description: 'Order count broken down by status.',
    icon: '📋',
    requires: ['status'],
    configurableRoles: ['status'],
  },
  channel_breakdown: {
    component: BarChart,
    props: { xRole: 'channel', yRole: 'revenue' },
    defaultSize: 'md',
    label: 'Revenue by Channel',
    description: 'Revenue split across sales channels.',
    icon: '📡',
    requires: ['channel', 'revenue'],
    configurableRoles: ['channel', 'revenue'],
  },

  // ── Custom ─────────────────────────────────────────────────────────────────
  custom: {
    component: CustomWidget,
    props: {},
    defaultSize: 'md',
    label: 'Custom Widget',
    description: 'Build your own — choose chart type, title, and columns.',
    icon: '⚙️',
    requires: [],
    configurableRoles: [],
    isCustom: true,
  },

  // ── Table ──────────────────────────────────────────────────────────────────
  data_table: {
    component: DataTable,
    props: {},
    defaultSize: 'full',
    label: 'Data Table',
    description: 'Paginated, sortable view of all raw rows.',
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
