<template>
  <header class="header">
    <div class="header-content">
      <h1>🤖 AI Insights Generator</h1>
      <div class="header-stats">
        <div class="stat" v-if="bundleStats">
          <span class="stat-label">Tickers:</span>
          <span class="stat-value">{{ bundleStats.count }}</span>
        </div>
        <div class="stat" v-if="bundleStats">
          <span class="stat-label">Size:</span>
          <span class="stat-value">{{ bundleStats.size_kb }} KB</span>
        </div>
        <div class="stat">
          <span class="stat-label">Ollama:</span>
          <span :class="['status-indicator', ollamaStatus]">
            {{ ollamaStatus === 'connected' ? '✅ Connected' : '❌ Offline' }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  bundleStats: { type: Object, default: null },
  ollamaStatus: { type: String, required: true }
})
</script>
