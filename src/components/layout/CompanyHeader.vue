<template>
  <div
    v-if="ticker && !loading"
    class="company-header"
  >
    <img 
      v-if="profile.image" 
      :src="profile.image" 
      :alt="profile.companyName"
      class="company-logo"
      @error="handleImageError"
    >
    <div
      v-else
      class="company-logo-placeholder"
    >
      {{ ticker.substring(0, 1).toUpperCase() }}
    </div>
    
    <div class="company-info">
      <div class="company-identity">
        <span class="company-name">{{ profile.companyName || ticker }}</span>
        <span class="company-ticker">({{ ticker }})</span>
      </div>
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
    </div>
  </div>
  <div
    v-else-if="loading"
    class="company-header loading-placeholder"
  >
    Loading company info...
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const props = defineProps({
  ticker: { type: String, required: true }
})

const emit = defineEmits(['update:companyName', 'update:companyProfile'])

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

const formatMarketCap = (mktCap) => {
  if (!mktCap) return 'N/A'
  const num = Number(mktCap)
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return `$${num.toLocaleString()}`
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
      fetch(`${API_BASE_URL}/api/fmp/api/v3/profile/${t}`),
      fetch(`${API_BASE_URL}/api/fmp/api/v3/quote/${t}`),
      fetch(`${API_BASE_URL}/api/fmp/api/v3/historical/earning_calendar/${t}`)
    ])

    if (profileRes.ok) {
      const profileData = await profileRes.json()
      profile.value = Array.isArray(profileData) && profileData.length > 0 
        ? profileData[0] 
        : {}
      // Emit company name to parent
      if (profile.value.companyName) {
        emit('update:companyName', profile.value.companyName)
      }
      // Always emit profile to parent so description can be shown
      emit('update:companyProfile', profile.value)
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
        .filter(e => e.date && new Date(e.date) >= now)
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
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border-radius: 10px;
  border: 1px solid #2A2A2E;
  flex: 1;
  min-width: 0;
  transition: all 0.2s;
}

.company-header:hover {
  border-color: #00594C;
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.2);
}

.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  padding: 4px;
  background: rgba(229, 229, 229, 0.05);
  border: 1px solid #2A2A2E;
}

.company-logo-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #E5E5E5;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.3);
  transition: transform 0.2s ease;
}

.company-logo-placeholder:hover {
  transform: scale(1.05);
}

.company-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.company-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #E5E5E5;
}

.company-ticker {
  font-size: 14px;
  font-weight: 500;
  color: rgba(229, 229, 229, 0.6);
}

.price-info {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.current-price {
  font-size: 20px;
  font-weight: bold;
  color: #E5E5E5;
}

.price-change {
  font-size: 14px;
  font-weight: 600;
}

.price-change.positive {
  color: #00A88E;
}

.price-change.negative {
  color: #ef4444;
}

.loading-placeholder {
  justify-content: center;
  color: rgba(229, 229, 229, 0.5);
  font-size: 14px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .company-header {
    padding: 8px 12px;
    gap: 10px;
  }

  .company-logo,
  .company-logo-placeholder {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .company-name {
    font-size: 14px;
  }

  .company-ticker {
    font-size: 12px;
  }

  .current-price {
    font-size: 18px;
  }

  .price-change {
    font-size: 13px;
  }
}

@media (max-width: 400px) {
  .company-header {
    padding: 6px 10px;
    gap: 8px;
  }

  .company-logo,
  .company-logo-placeholder {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .company-name {
    font-size: 13px;
  }

  .current-price {
    font-size: 16px;
  }

  .price-change {
    font-size: 12px;
  }

  .earnings-section {
    display: none; /* Hide earnings on very small screens to save space */
  }
}

/* Landscape mode - show earnings again, more horizontal space */
@media (max-width: 768px) and (orientation: landscape) {
  .company-header {
    padding: 6px 12px;
  }

  .earnings-section {
    display: flex; /* Show earnings in landscape */
  }

  .company-name {
    font-size: 13px;
  }

  .current-price {
    font-size: 17px;
  }
}
</style>
