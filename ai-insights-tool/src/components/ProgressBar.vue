<template>
  <div class="progress-container">
    <div class="progress-header">
      <h3>🚀 Generating AI Insights</h3>
      <div class="progress-subtitle-row">
        <p class="progress-subtitle">
          Processing {{ completed }} of {{ total }} tickers
        </p>
        <span class="progress-percentage">{{ percentage }}%</span>
      </div>
    </div>
    
    <div class="progress-bar-wrapper">
      <div class="progress-bar">
        <div 
          class="progress-bar-fill" 
          :style="{ width: percentage + '%' }"
        >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, required: true },
  completed: { type: Number, required: true },
  percentage: { type: Number, required: true }
})
</script>
