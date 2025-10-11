<template>
  <section class="table-panel">
    <div class="head">{{ title }}</div>
    <div v-if="loading" class="loading" role="status" aria-live="polite">Loading...</div>
    <div v-else-if="error" class="error" role="alert" aria-live="assertive">{{ error }}</div>
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

.loading {
  color: #aaa;
  padding: 12px;
}

.error {
  color: #ff6a6a;
  padding: 12px;
}
</style>
