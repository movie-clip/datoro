<template>
  <div class="progress-container">
    <div class="progress-header">
      <h3>🚀 Generating AI Insights</h3>
      <p class="progress-subtitle">
        Processing {{ completed }} of {{ total }} tickers
      </p>
    </div>
    
    <div class="progress-bar-wrapper">
      <div class="progress-bar">
        <div 
          class="progress-bar-fill" 
          :style="{ width: percentage + '%' }"
        >
          <span class="progress-text">{{ percentage }}%</span>
        </div>
      </div>
    </div>

    <div class="progress-info">
      <div class="progress-stat">
        <span class="stat-icon">✅</span>
        <span>Completed: {{ completed }}</span>
      </div>
      <div class="progress-stat">
        <span class="stat-icon">⏳</span>
        <span>Remaining: {{ total - completed }}</span>
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
