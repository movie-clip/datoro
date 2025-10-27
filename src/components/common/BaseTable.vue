<template>
  <section class="table-panel">
    <div 
      class="table-header"
      :class="{ 'clickable-header': collapsible && rows.length > 3 }"
      @click="collapsible && rows.length > 3 ? toggleExpanded() : null"
    >
      <div class="head">
        {{ title }}
        <span 
          v-if="collapsible && rows.length > 3" 
          class="expand-indicator"
        >
          {{ isExpanded ? '▼' : '▶' }}
        </span>
      </div>
      <button
        v-if="audioName && !loading && !error"
        class="audio-btn"
        :title="isPlaying ? 'Pause audio' : 'Play audio explanation'"
        @click.stop="toggleAudio"
      >
        {{ isPlaying ? '⏸' : '🔊' }}
      </button>
    </div>
    
    <!-- Skeleton loader -->
    <div
      v-if="loading"
      class="skeleton-rows"
    >
      <SkeletonLoader 
        v-for="i in 5" 
        :key="i" 
        variant="text" 
        :style="{ marginBottom: '12px' }" 
      />
    </div>
    
    <div
      v-else-if="error"
      class="error-container"
      role="alert"
      aria-live="assertive"
    >
      <p class="error">
        {{ error }}
      </p>
      <button
        v-if="onRetry"
        class="retry-btn"
        @click="onRetry"
      >
        ↻ Retry
      </button>
    </div>
    
    <table
      v-else
      class="data-table"
      :aria-label="ariaLabel || `${title} metrics`"
      tabindex="0"
    >
      <tbody>
        <tr
          v-for="(row, index) in displayedRows"
          :key="row.label"
          :class="{ 'clickable-row': clickable }"
          @click="clickable ? $emit('row-click', row) : null"
        >
          <th scope="row">
            {{ row.label }}
          </th>
          <td :style="row.color ? { color: row.color, fontWeight: '600' } : {}">
            {{ row.value }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Hidden audio element -->
    <audio
      v-if="audioName"
      ref="audioPlayer"
      @ended="onAudioEnded"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SkeletonLoader from './SkeletonLoader.vue'

export interface TableRow {
  label: string
  value: string | number
  color?: string
}

interface Props {
  title: string
  rows: TableRow[]
  loading?: boolean
  error?: string | null
  ariaLabel?: string | null
  onRetry?: (() => void) | null
  audioName?: string | null
  clickable?: boolean
  collapsible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  ariaLabel: null,
  onRetry: null,
  audioName: null,
  clickable: false,
  collapsible: true
})

interface Emits {
  (e: 'row-click', row: TableRow): void
}

const emit = defineEmits<Emits>()

// Expand/collapse state
const isExpanded = ref(false)

// Show only first 3 rows when collapsed, all rows when expanded (if collapsible)
const displayedRows = computed(() => {
  if (!props.collapsible || props.rows.length <= 3) {
    return props.rows
  }
  return isExpanded.value ? props.rows : props.rows.slice(0, 3)
})

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value
}

// Audio playback
const audioPlayer = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)

function toggleAudio(): void {
  if (!audioPlayer.value || !props.audioName) return

  // Load audio source if not already loaded
  if (!audioPlayer.value.src || !audioPlayer.value.src.includes(props.audioName)) {
    const audioPath = `/voiceovers/${props.audioName}.mp3`
    audioPlayer.value.src = audioPath
  }

  if (isPlaying.value) {
    audioPlayer.value.pause()
    isPlaying.value = false
  } else {
    audioPlayer.value.play()
      .then(() => {
        isPlaying.value = true
      })
      .catch((err: Error) => {
        console.error('Audio playback failed:', err)
        console.error('Attempted path:', audioPlayer.value?.src)
        alert(`Audio file not found for ${props.audioName}. Please generate voiceover first.\nPath: ${audioPlayer.value?.src}`)
      })
  }
}

function onAudioEnded(): void {
  isPlaying.value = false
}

// Reset playing state when loading or error changes
watch(() => props.loading, (newLoading) => {
  if (newLoading && audioPlayer.value) {
    audioPlayer.value.pause()
    isPlaying.value = false
  }
})

watch(() => props.error, (newError) => {
  if (newError && audioPlayer.value) {
    audioPlayer.value.pause()
    isPlaying.value = false
  }
})
</script>

<style scoped>
.table-panel {
  position: relative;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.table-header.clickable-header {
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px 8px -8px;
  border-radius: 6px;
}

.table-header.clickable-header:hover {
  background-color: rgba(0, 89, 76, 0.1);
}

.head {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-indicator {
  font-size: 10px;
  color: #aaa;
  transition: transform 0.2s;
  display: inline-block;
  min-width: 12px;
}

.audio-btn {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.audio-btn:hover {
  border-color: #00594C;
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.4);
  transform: scale(1.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table th {
  width: 180px;
  color: #ddd;
  font-weight: 500;
  text-align: left;
}

.data-table td {
  color: #fff;
  text-align: right;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: rgba(0, 89, 76, 0.1);
}

.skeleton-rows {
  padding: 12px 0;
}

.loading {
  color: #aaa;
  padding: 12px;
}

.error-container {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.error {
  color: #ff6b6b;
  font-weight: bold;
  margin: 0;
}

.retry-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff8787;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .head {
    font-size: 14px;
    padding: 6px 0;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
    font-size: 13px;
  }

  .data-table th {
    width: 140px;
  }

  .error-container {
    padding: 8px;
    gap: 8px;
  }

  .retry-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}

@media (max-width: 400px) {
  .data-table th,
  .data-table td {
    padding: 6px 4px;
    font-size: 12px;
  }

  .data-table th {
    width: 120px;
  }
}
</style>
