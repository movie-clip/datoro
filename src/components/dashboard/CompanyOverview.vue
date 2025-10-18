<template>
  <div class="company-overview">
    <!-- Header Bar -->
    <HeaderBar 
      :ticker="selectedTicker" 
      :companyName="companyName"
      @search="handleSearch" 
    />

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Company Title -->
        <div v-if="selectedTicker" class="company-title">
          <h1>{{ selectedTicker }} – {{ companyName }}</h1>
        </div>

        <!-- Charts Row -->
        <div class="charts-grid">
          <ChartPanel
            title="Quarterly Revenue (5Y)"
            :data="revenueData"
            yAxisLabel="Revenue (USD Millions)"
            color="#00C27A"
            chartId="revenue-chart"
          />
          <ChartPanel
            title="Quarterly Free Cash Flow (5Y)"
            :data="fcfData"
            yAxisLabel="Free Cash Flow (USD Millions)"
            color="#00D57A"
            chartId="fcf-chart"
          />
        </div>

        <!-- Valuation Metrics Grid -->
        <ValuationGrid :metrics="valuationMetrics" />
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <p>Data not investment advice.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import HeaderBar from './HeaderBar.vue'
import ChartPanel from './ChartPanel.vue'
import ValuationGrid from './ValuationGrid.vue'

// State
const selectedTicker = ref('ACN')
const companyName = ref('Accenture plc')

// Placeholder data - 20 quarters (5 years)
const revenueData = reactive({
  labels: [
    'Q1 2020', 'Q2 2020', 'Q3 2020', 'Q4 2020',
    'Q1 2021', 'Q2 2021', 'Q3 2021', 'Q4 2021',
    'Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022',
    'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
    'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'
  ],
  values: [
    12000, 12300, 12800, 13100,
    13500, 13800, 14200, 14600,
    15000, 15300, 15700, 16100,
    16500, 16800, 17200, 17600,
    18000, 18300, 18700, 19100
  ]
})

const fcfData = reactive({
  labels: [
    'Q1 2020', 'Q2 2020', 'Q3 2020', 'Q4 2020',
    'Q1 2021', 'Q2 2021', 'Q3 2021', 'Q4 2021',
    'Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022',
    'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
    'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'
  ],
  values: [
    2500, 2700, 2600, 2800,
    2900, 3100, 3000, 3200,
    3300, 3500, 3400, 3600,
    3700, 3900, 3800, 4000,
    4100, 4300, 4200, 4400
  ]
})

const valuationMetrics = reactive({
  pe: { value: 28.4, label: 'Price to Earnings (TTM)' },
  fpe: { value: 25.2, label: 'Forward P/E' },
  ps: { value: 3.1, label: 'Price to Sales' },
  ebitda: { value: 17.3, label: 'EV/EBITDA' },
  pb: { value: 8.7, label: 'Price to Book' }
})

// Methods
const handleSearch = (ticker) => {
  selectedTicker.value = ticker.toUpperCase()
  // In real app, fetch company data here
  companyName.value = `${ticker} Company Name`
}
</script>

<style scoped>
.company-overview {
  min-height: 100vh;
  background: #0F0F10;
  color: #E5E5E5;
  font-family: 'Inter', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem 1rem;
  margin-top: 70px; /* Account for fixed header */
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.company-title {
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.company-title h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.footer {
  padding: 2rem 1rem;
  text-align: center;
  background: #121214;
  border-top: 1px solid #1E1E22;
}

.footer p {
  margin: 0;
  font-size: 0.875rem;
  color: #888;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem 1rem;
  }

  .company-title h1 {
    font-size: 1.5rem;
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
