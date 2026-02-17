<template>
  <div class="earnings-tab">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="earnings-loading"
    >
      <div 
        v-for="i in 4" 
        :key="i" 
        class="earnings-card-skeleton"
      >
        <SkeletonLoader 
          variant="card" 
          :style="{ height: '100%', borderRadius: '6px' }" 
        />
      </div>
    </div>

    <!-- No Data State -->
    <div
      v-else-if="earnings.length === 0"
      class="earnings-empty"
    >
      <p>No earnings data available</p>
    </div>

    <!-- Earnings Grid -->
    <div
      v-else
      class="earnings-grid"
    >
      <div 
        v-for="(item, index) in earnings" 
        :key="index"
        class="earnings-card"
      >
        <!-- Header with Link -->
        <div class="earnings-header">
          <div class="quarter-info">
            <h4 class="fiscal-quarter">
              {{ item.fiscalQuarter }}
            </h4>
            <span class="report-date">{{ formatDate(item.reportDate) }}</span>
          </div>
          <a 
            v-if="investorRelationsUrl"
            :href="investorRelationsUrl" 
            target="_blank"
            rel="noopener noreferrer"
            class="earnings-link"
            title="View SEC filings (10-K/10-Q)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line
                x1="10"
                y1="14"
                x2="21"
                y2="3"
              />
            </svg>
          </a>
        </div>

        <!-- Metrics Compact -->
        <div class="metrics-compact">
          <!-- EPS -->
          <div class="metric-row">
            <span class="metric-label">EPS</span>
            <div class="metric-values">
              <span
                class="actual"
                :class="{ beat: item.epsBeat, miss: item.epsBeat === false }"
              >
                ${{ item.epsActual?.toFixed(2) || '—' }}
              </span>
              <span class="vs">vs</span>
              <span class="estimate">${{ item.epsEstimate?.toFixed(2) || '—' }}</span>
            </div>
          </div>

          <!-- Revenue -->
          <div class="metric-row">
            <span class="metric-label">Revenue</span>
            <div class="metric-values">
              <span
                class="actual"
                :class="{ beat: item.revenueBeat, miss: item.revenueBeat === false }"
              >
                ${{ item.revenueActual?.toFixed(2) || '—' }}B
              </span>
              <span class="vs">vs</span>
              <span class="estimate">${{ item.revenueEstimate?.toFixed(2) || '—' }}B</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BatchData } from '@/types'
import { getEarningsFromBatch } from '@/services/financials/batchTableService'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

interface Props {
  batchData: BatchData | null | undefined
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const earnings = computed(() => {
  return getEarningsFromBatch(props.batchData)
})

// Get investor relations URL - link to SEC filings (10-K/10-Q)
const investorRelationsUrl = computed(() => {
  const symbol = props.batchData?.data?.profile?.[0]?.symbol
  if (!symbol) return null
  
  // Link to SEC EDGAR filings page for 10-K and 10-Q reports
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-&dateb=&owner=exclude&count=40`
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.earnings-tab {
  padding: 12px 0 16px 0;
  max-height: 140px; /* Match news tab height */
  overflow: hidden;
}

.earnings-loading {
  display: flex;
  gap: 10px;
  height: 100px;
}

.earnings-card-skeleton {
  flex: 1;
  min-width: 180px;
  max-width: 220px;
}

.earnings-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-secondary);
  font-size: 13px;
}

.earnings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  
  /* On mobile, use horizontal scroll */
  @media (max-width: 768px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 6px;
    gap: 8px;
    
    &::-webkit-scrollbar {
      height: 5px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--bg-tertiary);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--border-primary);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: var(--text-tertiary);
    }
  }
}

.earnings-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  padding: 10px 12px;
  transition: all 0.3s ease;
  min-width: 180px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  &:hover {
    border-color: rgba(56, 189, 248, 0.5);
    box-shadow: 0 4px 20px rgba(56, 189, 248, 0.3);
    transform: translateY(-1px);
  }
}

.earnings-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(42, 42, 46, 0.8);
}

.quarter-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fiscal-quarter {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
}

.report-date {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.earnings-link {
  color: var(--text-secondary);
  opacity: 0.6;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  padding: 2px;
  
  &:hover {
    opacity: 1;
    color: var(--primary);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
}

.metrics-compact {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  min-width: 28px;
}

.metric-values {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  flex: 1;
  justify-content: flex-end;
}

.actual {
  font-weight: 600;
  color: var(--text-primary);
  
  &.beat {
    color: var(--color-success);
  }
  
  &.miss {
    color: var(--color-danger);
  }
}

.vs {
  font-size: 10px;
  color: var(--text-tertiary);
  margin: 0 2px;
}

.estimate {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
