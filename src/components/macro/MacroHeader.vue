<template>
  <div class="macro-header">
    <div class="header-content">
      <div class="title-region-wrapper">
        <h2>Macro Economic Dashboard</h2>
        <select 
          :value="selectedRegion" 
          @change="$emit('region-change', ($event.target as HTMLSelectElement).value as Region)" 
          class="region-selector"
        >
          <option value="US">US</option>
          <option value="EU">EU</option>
        </select>
      </div>
      
      <div v-if="indexData.length > 0" class="index-cards">
        <div v-for="(index, i) in indexData" :key="i" class="index-card">
          <div class="index-name">{{ index.name }}</div>
          <div class="index-change" :class="{ positive: index.change >= 0, negative: index.change < 0 }">
            {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { IndexData } from '../../types/macro.types'
import type { Region } from '../../services/macro/macroDataService'

defineProps({
  indexData: {
    type: Array as PropType<IndexData[]>,
    default: () => []
  },
  selectedRegion: {
    type: String as PropType<Region>,
    default: 'US'
  }
})

defineEmits<{
  'region-change': [region: Region]
}>()
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

.region-selector {
  padding: 8px 14px;
  background: linear-gradient(135deg, #00594C 0%, #004438 100%);
  border: 2px solid #00594C;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  text-align: center;
  outline: none;
}

.region-selector:hover {
  background: linear-gradient(135deg, #00755F 0%, #00594C 100%);
  border-color: #00755F;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 89, 76, 0.3);
}

.region-selector:focus {
  border-color: #00755F;
  box-shadow: 0 0 0 3px rgba(0, 89, 76, 0.3);
}

.region-selector option {
  background: #1A1A1D;
  color: #fff;
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
