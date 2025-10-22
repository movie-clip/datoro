<template>
  <div v-if="growthData" class="growth-labels">
    <!-- Short-term mode: 1D, 1W, 1M -->
    <template v-if="growthData.oneDay !== undefined">
      <div
        v-if="growthData.oneDay !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.oneDay)"
      >
        <span class="label-period">1D</span>
        <span class="label-value">{{ formatGrowth(growthData.oneDay) }}</span>
      </div>
      <div
        v-if="growthData.oneWeek !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.oneWeek)"
      >
        <span class="label-period">1W</span>
        <span class="label-value">{{ formatGrowth(growthData.oneWeek) }}</span>
      </div>
      <div
        v-if="growthData.oneMonth !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.oneMonth)"
      >
        <span class="label-period">1M</span>
        <span class="label-value">{{ formatGrowth(growthData.oneMonth) }}</span>
      </div>
    </template>
    
    <!-- Long-term mode: 1Y, 2Y, 5Y -->
    <template v-else>
      <div
        v-if="growthData.oneYear !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.oneYear)"
      >
        <span class="label-period">1Y</span>
        <span class="label-value">{{ formatGrowth(growthData.oneYear) }}</span>
      </div>
      <div
        v-if="growthData.twoYear !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.twoYear)"
      >
        <span class="label-period">2Y</span>
        <span class="label-value">{{ formatGrowth(growthData.twoYear) }}</span>
      </div>
      <div
        v-if="growthData.fiveYear !== null"
        class="growth-label"
        :class="getGrowthClass(growthData.fiveYear)"
      >
        <span class="label-period">5Y</span>
        <span class="label-value">{{ formatGrowth(growthData.fiveYear) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { formatGrowth as formatGrowthUtil } from '../../utils/growthCalculator.js'

const props = defineProps({
  growthData: {
    type: Object,
    default: null,
  },
  invertGrowth: {
    type: Boolean,
    default: false,
  },
})

// Format growth value for display
const formatGrowth = (growth) => {
  if (growth === null || growth === undefined) return 'N/A'
  return formatGrowthUtil(growth)
}

// Get CSS class for growth label (handling inversion)
const getGrowthClass = (growth) => {
  if (growth === null || growth === undefined || isNaN(growth)) return ''

  // For inverted growth (expenses), negative is good (positive class)
  if (props.invertGrowth) {
    return growth <= 0 ? 'positive' : 'negative'
  }

  // Normal growth: positive is good
  return growth >= 0 ? 'positive' : 'negative'
}
</script>

<style scoped>
.growth-labels {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 0px;
  padding: 2px;
  flex-wrap: wrap;
}

.growth-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 1px;
  border-radius: 6px;
  min-width: 60px;
}

.growth-label:hover {
  transform: scale(1.05);
}

.growth-label.positive {
  background: rgba(0, 89, 76, 0.15);
  border: 1px solid #00594c;
  color: #00a88e;
}

.growth-label.negative {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.label-period {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.label-value {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

@media (max-width: 768px) {
  .growth-labels {
    gap: 6px;
    margin-top: 4px;
    padding: 4px;
  }

  .growth-label {
    padding: 5px 10px;
    min-width: 55px;
  }

  .label-period {
    font-size: 9px;
  }

  .label-value {
    font-size: 12px;
  }
}
</style>
