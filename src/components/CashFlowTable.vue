<template>
  <section>
    <div class="head">Cash Flow</div>
    <table class="valtab">
      <tbody>
        <tr>
          <th>Free Cash Flow (TTM)</th>
          <td>{{ data.fcf }}</td>
        </tr>
        <tr>
          <th>Adjusted FCF (TTM)</th>
          <td>{{ data.adjFcf }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, watch, toRef } from 'vue'
import { fetchCashFlowFacts } from '../services/company/cashflowService'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({ fcf: '—', adjFcf: '—' })

async function refresh() { data.value = await fetchCashFlowFacts(tRef.value) }
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>

<style scoped>
.head { font-weight: 600; margin-bottom: 8px; }
.valtab { width: 100%; border-collapse: collapse; font-size: 14px; }
.valtab th, .valtab td {
  text-align: left; padding: 10px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.valtab th { width: 260px; color: #ddd; font-weight: 500; }
.valtab td { color: #fff; }
</style>
