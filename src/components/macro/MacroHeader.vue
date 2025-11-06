<template>
  <div class="macro-header">
    <div class="header-content">
      <div class="title-region-wrapper">
        <h2>Macro Economic Dashboard</h2>
        <div class="region-dropdown-wrapper">
          <BaseDropdown
            :model-value="selectedRegion"
            :options="regionOptions"
            @update:model-value="(value: string) => $emit('region-change', value as Region)"
          />
        </div>
      </div>
      
      <div v-if="indexData.length > 0" class="index-cards">
        <div v-for="(index, i) in indexData" :key="i" class="index-card">
          <div class="index-name">{{ index.name }}</div>
          <div class="index-change" :class="{ positive: index.change >= 0, negative: index.change < 0 }">
            {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
          </div>
        </div>
      </div>
      
      <!-- Skeleton Loading (5 cards) -->
      <div v-else-if="indexLoading" class="index-cards">
        <div v-for="i in 5" :key="`skeleton-${i}`" class="index-card skeleton">
          <div class="index-name skeleton-text"></div>
          <div class="index-change skeleton-text"></div>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="indexError" class="index-error">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ indexError }}</span>
        <button class="retry-btn" @click="$emit('retry-index')">Retry</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { IndexData } from '../../types/macro.types'
import type { Region } from '../../services/macro/macroDataService'
import BaseDropdown, { type DropdownOption } from '../common/BaseDropdown.vue'

defineProps({
  indexData: {
    type: Array as PropType<IndexData[]>,
    default: () => []
  },
  indexLoading: {
    type: Boolean,
    default: false
  },
  indexError: {
    type: String,
    default: null as string | null
  },
  selectedRegion: {
    type: String as PropType<Region>,
    default: 'US'
  }
})

defineEmits<{
  'region-change': [region: Region]
  'retry-index': []
}>()

const regionOptions: DropdownOption[] = [
  { label: 'US', value: 'US' },
  { label: 'EU', value: 'EU' }
]
</script>

<style scoped>
.macro-header {
  margin-bottom: 0px;
  padding-bottom: 0px;
  padding: 12px 35px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0px;
  flex-wrap: wrap;
}

.macro-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #999;
}

.title-region-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.region-dropdown-wrapper {
  width: 120px;
}

.index-cards {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.index-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 8px;
  min-width: 100px;
  text-align: center;
}

/* Skeleton Loading */
.index-card.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-text {
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin: 4px 0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Error State */
.index-error {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  color: #EF4444;
  font-size: 14px;
  flex: 1;
}

.retry-btn {
  background: #EF4444;
  color: #FFF;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #DC2626;
  transform: translateY(-1px);
}

.index-name {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.index-change {
  font-size: 16px;
  font-weight: 600;
  color: #FFF;
}

.index-change.positive {
  color: #00B59A;
}

.index-change.negative {
  color: #FF5252;
}
</style>
