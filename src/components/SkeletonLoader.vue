<template>
  <div class="skeleton-loader" :class="variant" :style="customStyle">
    <div class="skeleton-shimmer"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'text', // text, chart, table, card
    validator: (v) => ['text', 'chart', 'table', 'card'].includes(v)
  },
  width: { type: String, default: '100%' },
  height: { type: String, default: 'auto' },
  lines: { type: Number, default: 1 } // For text variant
})

const customStyle = computed(() => ({
  width: props.width,
  height: props.variant === 'text' ? '16px' : props.height
}))
</script>

<style scoped>
.skeleton-loader {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border-radius: 8px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 2s infinite;
}

.skeleton-loader.text {
  height: 16px;
  border-radius: 4px;
  margin: 4px 0;
}

.skeleton-loader.chart {
  height: 300px;
  border-radius: 12px;
}

.skeleton-loader.table {
  height: 200px;
  border-radius: 12px;
}

.skeleton-loader.card {
  height: 120px;
  border-radius: 12px;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes skeleton-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>
