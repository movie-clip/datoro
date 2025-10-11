# Component Architecture - Tables & Charts

## Base Components

### 1. BaseTable.vue
**Purpose:** Reusable table component for displaying key-value financial metrics

**Props:**
- `title` (String, required): Table heading
- `rows` (Array, required): Array of `{ label, value }` objects
- `loading` (Boolean): Loading state
- `error` (String): Error message
- `ariaLabel` (String): Accessibility label

**Usage Example:**
```vue
<BaseTable
  title="Cash Flow"
  :rows="[
    { label: 'Operating Cash Flow (TTM)', value: '$100M' },
    { label: 'Free Cash Flow (TTM)', value: '$80M' }
  ]"
  :loading="false"
  :error="null"
/>
```

### 2. BaseChart.vue
**Purpose:** Reusable chart component using ECharts

**Props:**
- `title` (String): Chart heading
- `series` (Array): Array of `[timestamp, value]` pairs
- `kind` (String): 'line' or 'bar'
- `yFormat` (String): 'int' or 'short' (for axis formatting)
- `smooth` (Number): Line smoothing (default: 0.15)
- `barMaxWidth` (Number): Max bar width (default: 28)

**Usage Example:**
```vue
<BaseChart
  title="Revenue"
  :series="[[1609459200000, 50000], [1617235200000, 55000]]"
  kind="bar"
  yFormat="short"
/>
```

## Table Components (Using BaseTable)

### 1. ValuationTable.vue
- **Title:** "Valuation"
- **Metrics:** Market Cap, PE/FPE, Price to Sales, Price to Book, EV/EBITDA
- **Data Source:** `getValuation()` from FMP

### 2. CashFlowTable.vue
- **Title:** "Cash Flow"
- **Metrics:** Operating Cash Flow (TTM), Capital Expenditures (TTM), Free Cash Flow (TTM), Adjusted FCF (TTM)
- **Data Source:** `getCashFlowFacts()` from FMP

### 3. MarginsGrowthTable.vue
- **Title:** "Margins & Growth"
- **Metrics:** Profit Margin (TTM), Operating Margin (TTM), Quarterly Earnings (YoY), Quarterly Revenue (YoY)
- **Data Source:** `getMarginsGrowth()` from FMP

## Chart Components (Using BaseChart)

### 1. PriceChart.vue
- Uses `usePriceSeries` composable
- Displays historical price data

### 2. RevenueChart.vue
- Uses `useRevenueSeries` composable
- Displays revenue over time (annual/quarterly)

### 3. FcfChart.vue
- Uses `useFcfSeries` composable
- Displays free cash flow over time

## Benefits of This Architecture

1. **Consistency:** All tables/charts have the same look and feel
2. **Maintainability:** Styling changes in one place (BaseTable/BaseChart)
3. **Extensibility:** Easy to add new tables/charts by reusing base components
4. **Reduced Duplication:** No repeated CSS or template code
5. **Type Safety:** Props clearly define component interface

## Adding a New Table

```vue
<template>
  <BaseTable
    title="New Metrics"
    :rows="rows"
    :loading="loading"
    :error="error"
  />
</template>

<script setup>
import { ref, computed, watch, toRef } from 'vue'
import BaseTable from './BaseTable.vue'
import { getNewMetrics } from '../services/financials/index.js'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({ metric1: '—', metric2: '—' })
const error = ref(null)
const loading = ref(false)

const rows = computed(() => [
  { label: 'Metric 1', value: data.value.metric1 },
  { label: 'Metric 2', value: data.value.metric2 },
])

async function refresh() {
  loading.value = true
  error.value = null
  const result = await getNewMetrics(tRef.value)
  if (result.error) {
    error.value = result.error
    data.value = { metric1: '—', metric2: '—' }
  } else {
    data.value = result.data
  }
  loading.value = false
}
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>
```

## Adding a New Chart

```vue
<template>
  <ChartCard>
    <BaseChart
      title="New Chart"
      :series="series"
      kind="line"
      yFormat="short"
    />
  </ChartCard>
</template>

<script setup>
import { defineProps, toRef } from 'vue'
import BaseChart from './BaseChart.vue'
import ChartCard from './ChartCard.vue'
import { useNewSeries } from '../composables/useNewSeries.js'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const { series, error, loading } = useNewSeries(tRef)
</script>
```
