<template>
  <div class="valuation-section">
    <h2 class="section-title">Valuation Metrics</h2>
    <div class="valuation-grid">
      <div 
        v-for="(metric, key) in metricsData" 
        :key="key"
        class="metric-card"
      >
        <div class="metric-title">{{ metric.title }}</div>
        <div class="metric-value">{{ formatValue(metric.value) }}</div>
        <div class="metric-label">{{ metric.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  metrics: {
    type: Object,
    required: true
  }
})

const metricsData = computed(() => [
  {
    title: 'P/E',
    value: props.metrics.pe?.value,
    label: props.metrics.pe?.label || 'Price to Earnings (TTM)'
  },
  {
    title: 'FPE',
    value: props.metrics.fpe?.value,
    label: props.metrics.fpe?.label || 'Forward P/E'
  },
  {
    title: 'P/S',
    value: props.metrics.ps?.value,
    label: props.metrics.ps?.label || 'Price to Sales'
  },
  {
    title: 'EV/EBITDA',
    value: props.metrics.ebitda?.value,
    label: props.metrics.ebitda?.label || 'EV/EBITDA'
  },
  {
    title: 'P/B',
    value: props.metrics.pb?.value,
    label: props.metrics.pb?.label || 'Price to Book'
  }
])

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(1)}x`
}
</script>

<style scoped>
.valuation-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 1.5rem 0;
  padding: 0 0.5rem;
  letter-spacing: -0.01em;
}

.valuation-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.metric-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: default;
}

.metric-card:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.2);
  transform: translateY(-2px);
}

.metric-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #AAA;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.5rem;
  line-height: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: #666;
  line-height: 1.4;
  min-height: 2.8em;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Responsive */
@media (max-width: 1024px) {
  .valuation-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .section-title {
    font-size: 1.125rem;
  }

  .valuation-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.875rem;
  }

  .metric-card {
    padding: 1.25rem;
  }

  .metric-value {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .valuation-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    padding: 1.5rem;
  }

  .metric-value {
    font-size: 2rem;
  }

  .metric-label {
    min-height: auto;
  }
}
</style>
