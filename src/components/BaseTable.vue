<template>
  <section class="table-panel">
    <div class="head">{{ title }}</div>
    
    <!-- Skeleton loader -->
    <div v-if="loading" class="skeleton-rows">
      <SkeletonLoader 
        v-for="i in 5" 
        :key="i" 
        variant="text" 
        :style="{ marginBottom: '12px' }" 
      />
    </div>
    
    <div v-else-if="error" class="error-container" role="alert" aria-live="assertive">
      <p class="error">{{ error }}</p>
      <button v-if="onRetry" class="retry-btn" @click="onRetry">
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
        <tr v-for="row in rows" :key="row.label">
          <th scope="row">{{ row.label }}</th>
          <td :style="row.color ? { color: row.color, fontWeight: '600' } : {}">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import SkeletonLoader from './SkeletonLoader.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  rows: {
    type: Array,
    required: true,
    // Expected format: [{ label: 'Market Cap', value: '$100B' }, ...]
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  ariaLabel: {
    type: String,
    default: null
  },
  onRetry: {
    type: Function,
    default: null
  }
})
</script>

<style scoped>
.head {
  font-weight: 600;
  margin-bottom: 8px;
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
