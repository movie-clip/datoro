<template>
  <div class="chart-panel">
    <div class="chart-header">
      <h2 class="chart-title">{{ title }}</h2>
    </div>
    <div class="chart-container">
      <canvas :id="chartId" ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.labels && value.values
    }
  },
  yAxisLabel: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#00A88E'
  },
  chartId: {
    type: String,
    required: true
  }
})

const canvasRef = ref(null)
let chartInstance = null

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: props.data.labels,
      datasets: [{
        data: props.data.values,
        backgroundColor: props.color,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1E1E22',
          titleColor: '#E5E5E5',
          bodyColor: '#E5E5E5',
          borderColor: '#2A2A2E',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => {
              return `${context.parsed.y.toLocaleString()} M`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#888',
            font: {
              size: 11
            },
            maxRotation: 45,
            minRotation: 45
          },
          border: {
            color: '#2A2A2E'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#1E1E22',
            lineWidth: 1
          },
          ticks: {
            color: '#888',
            font: {
              size: 11
            },
            callback: (value) => {
              return value.toLocaleString()
            }
          },
          border: {
            display: false
          },
          title: {
            display: !!props.yAxisLabel,
            text: props.yAxisLabel,
            color: '#AAA',
            font: {
              size: 12,
              weight: '500'
            }
          }
        }
      }
    }
  })
}

onMounted(() => {
  createChart()
})

watch(() => props.data, () => {
  createChart()
}, { deep: true })
</script>

<style scoped>
.chart-panel {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.chart-panel:hover {
  border-color: #00594C;
  box-shadow: 0 4px 20px rgba(56, 189, 248, 0.1);
}

.chart-header {
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0;
  letter-spacing: -0.01em;
}

.chart-container {
  height: 350px;
  position: relative;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-panel {
    padding: 1.25rem;
  }

  .chart-title {
    font-size: 1rem;
  }

  .chart-container {
    height: 300px;
  }
}
</style>
