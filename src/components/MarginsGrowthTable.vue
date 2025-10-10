<template>
  <section>
    <div class="head">Margins &amp; Growth</div>
    <table class="valtab">
      <tbody>
        <tr>
          <th>Profit Margin (TTM)</th>
          <td>{{ data.profitMargin }}</td>
        </tr>
        <tr>
          <th>Operating Margin (TTM)</th>
          <td>{{ data.operatingMargin }}</td>
        </tr>
        <tr>
          <th>Quarterly Earnings (YoY)</th>
          <td>{{ data.earningsYoY }}</td>
        </tr>
        <tr>
          <th>Quarterly Revenue (YoY)</th>
          <td>{{ data.revenueYoY }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, watch, toRef } from 'vue'
import { fetchMarginsGrowth } from '../services/company/marginsService'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({
  profitMargin:'—', operatingMargin:'—', earningsYoY:'—', revenueYoY:'—'
})

async function refresh(){ data.value = await fetchMarginsGrowth(tRef.value) }
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
