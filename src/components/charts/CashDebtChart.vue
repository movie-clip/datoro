
<template>
  <div style="position:relative; min-height:240px;">
    <div
      v-if="loading && series.length === 0"
      class="spinner"
      aria-live="polite"
      aria-busy="true"
      tabindex="0"
    >
      Loading…
    </div>
    <BaseChart
      v-else
      :title="title"
      :series="series"
      kind="bar"
      y-format="short"
      :loading="loading"
      aria-label="Cash and Debt chart"
      :force-expanded="forceExpanded"
    />
    <p
      v-if="error"
      class="msg error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="message"
      class="msg"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { useCashDebtSeries } from '../../composables/useCashDebtSeries';
import BaseChart from '../common/BaseChart.vue';

// Accept forceExpanded prop
const props = defineProps({
  forceExpanded: {
    type: Boolean,
    default: false
  }
})

// No ticker prop - using Pinia store
const { series, title, message, loading, error } = useCashDebtSeries();
</script>

<style scoped>
.msg { margin: 6px 0 0; opacity: 0.85; }
.msg.error { color: #ff6b6b; font-weight: bold; }
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
