<template>
  <div class="macro-header">
    <div class="header-content">
      <h2>Macro Economic Dashboard</h2>
      
      <div class="index-cards">
        <div v-if="indexData.length === 0" class="index-card">
          <div class="index-name">Loading...</div>
          <div class="index-change">--</div>
        </div>
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

defineProps({
  indexData: {
    type: Array as PropType<IndexData[]>,
    default: () => []
  }
})
</script>

<style scoped>
.macro-header {
  margin-bottom: 10px;
  padding-bottom: 0px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.macro-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #999;
}

.index-cards {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  padding: 12px 0px;
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
