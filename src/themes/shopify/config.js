export const SHOPIFY_SCHEMA = {
  date:        { label: 'Order Date',    required: true  },
  revenue:     { label: 'Revenue',       required: true  },
  adSpend:     { label: 'Ad Spend',      required: false },
  costs:       { label: 'Costs / COGS',  required: false },
  productName: { label: 'Product Name',  required: false },
}

export const SHOPIFY_THEME = {
  id: 'shopify',
  name: 'Shopify Profit Dashboard',
  tagline: 'Know your real profit. Instantly.',
  schema: SHOPIFY_SCHEMA,
}
