<template>
  <section class="panel" style="max-width: 900px; margin: 12px auto 0;">
    <div class="head">Valuation</div>
    <table class="valtab">
      <tbody>
        <tr>
          <th>Market Cap</th>
          <td>{{ data.marketCap }}</td>
        </tr>
        <tr>
          <th>PE / FPE</th>
          <td>{{ data.pe }} / {{ data.fpe }}</td>
        </tr>
        <tr>
          <th>Price to Sales</th>
          <td>{{ data.ps }}</td>
        </tr>
        <tr>
          <th>Price to Book</th>
          <td>{{ data.pb }}</td>
        </tr>
        <tr>
          <th>EV / EBITDA</th>
          <td>{{ data.evEbitda }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, watch, toRef } from 'vue'
import { fetchValuation } from '../services/company/valuationService'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({
  marketCap: '—',
  pe: '—',
  fpe: '—',
  ps: '—',
  pb: '—',
  evEbitda: '—',
})

async function refresh() {
  data.value = await fetchValuation(tRef.value)
}
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
