<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  ticker: string
  isWatchlisted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isWatchlisted: false
})

interface Emits {
  (e: 'toggle', ticker: string): void
}

const emit = defineEmits<Emits>()

const loading = ref(false)

const toggle = (): void => {
  if (loading.value) return
  
  loading.value = true
  emit('toggle', props.ticker)
  // Reset loading after a short delay to show feedback
  setTimeout(() => {
    loading.value = false
  }, 300)
}
</script>

<template>
  <button 
    class="star-icon" 
    :class="{ 'is-watchlisted': isWatchlisted, 'is-loading': loading }"
    @click.stop="toggle"
    :disabled="loading"
    :title="isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      :fill="isWatchlisted ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  </button>
</template>

<style scoped>
.star-icon {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #6B7280;
}

.star-icon svg {
  width: 20px;
  height: 20px;
  transition: all 0.2s ease;
}

.star-icon:hover:not(:disabled) {
  transform: scale(1.1);
  color: #FFB800;
}

.star-icon.is-watchlisted {
  color: #FFB800;
}

.star-icon.is-watchlisted svg {
  fill: #FFB800;
  stroke: #FFB800;
}

.star-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.star-icon.is-loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
