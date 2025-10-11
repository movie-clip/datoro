<template>
  <div v-if="ticker && !loading" class="company-header">
    <img 
      v-if="profile.image" 
      :src="profile.image" 
      :alt="profile.companyName"
      class="company-logo"
      @error="handleImageError"
    />
    <div v-else class="company-logo-placeholder">
      {{ ticker.substring(0, 2).toUpperCase() }}
    </div>
    
    <div class="company-info">
      <div class="company-name">{{ profile.companyName || ticker }}</div>
      <div class="price-info">
        <span class="current-price">${{ formatPrice(quote.price) }}</span>
        <span 
          class="price-change" 
          :class="{ positive: quote.change >= 0, negative: quote.change < 0 }"
        >
          {{ quote.change >= 0 ? '+' : '' }}${{ formatPrice(Math.abs(quote.change)) }} 
          ({{ quote.change >= 0 ? '+' : '' }}{{ quote.changesPercentage?.toFixed(2) }}%)
        </span>
      </div>
      <div v-if="earningsDate" class="earnings-date">
        Next Earnings: {{ formatEarningsDate(earningsDate) }}
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="company-header loading-placeholder">
    Loading company info...
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  ticker: { type: String, required: true }
})

const loading = ref(false)
const profile = ref({})
const quote = ref({})
const earningsDate = ref(null)
const imageError = ref(false)

const handleImageError = () => {
  imageError.value = true
}

const formatPrice = (price) => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}

const formatEarningsDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

async function fetchCompanyData() {
  const t = props.ticker?.trim().toUpperCase()
  if (!t) {
    profile.value = {}
    quote.value = {}
    earningsDate.value = null
    return
  }

  loading.value = true
  try {
    // Fetch profile, quote, and earnings calendar in parallel
    const [profileRes, quoteRes, earningsRes] = await Promise.all([
      fetch(`/api/fmp/api/v3/profile/${t}`),
      fetch(`/api/fmp/api/v3/quote/${t}`),
      fetch(`/api/fmp/api/v3/earnings-calendar/${t}`)
    ])

    if (profileRes.ok) {
      const profileData = await profileRes.json()
      profile.value = Array.isArray(profileData) && profileData.length > 0 
        ? profileData[0] 
        : {}
    }

    if (quoteRes.ok) {
      const quoteData = await quoteRes.json()
      quote.value = Array.isArray(quoteData) && quoteData.length > 0 
        ? quoteData[0] 
        : {}
    }

    if (earningsRes.ok) {
      const earningsData = await earningsRes.json()
      // Find next earnings date (future date)
      const now = new Date()
      const upcoming = earningsData
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      earningsDate.value = upcoming.length > 0 ? upcoming[0].date : null
    }
  } catch (error) {
    console.error('[CompanyHeader] Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.ticker, () => {
  fetchCompanyData()
}, { immediate: true })
</script>

<style scoped>
.company-header {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid #444;
  flex: 1;
  min-width: 0;
}

.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  background: #fff;
  padding: 4px;
}

.company-logo-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #3a7bd5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.company-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.price-info {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.current-price {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.price-change {
  font-size: 14px;
  font-weight: 600;
}

.price-change.positive {
  color: #4caf50;
}

.price-change.negative {
  color: #f44336;
}

.earnings-date {
  font-size: 12px;
  color: #aaa;
}

.loading-placeholder {
  justify-content: center;
  color: #888;
  font-size: 14px;
}
</style>
