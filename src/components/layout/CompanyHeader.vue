<template>
  <!-- Loading State with Skeleton -->
  <div
    v-if="loading"
    class="company-header company-header-skeleton"
  >
    <div class="company-logo-skeleton">
      <SkeletonLoader variant="card" :style="{ width: '48px', height: '48px', borderRadius: '8px' }" />
    </div>
    <div class="company-info">
      <div class="company-identity">
        <SkeletonLoader variant="text" :style="{ width: '150px', height: '16px' }" />
        <SkeletonLoader variant="text" :style="{ width: '60px', height: '14px', marginLeft: '8px' }" />
      </div>
      <div class="price-info">
        <SkeletonLoader variant="text" :style="{ width: '80px', height: '20px' }" />
        <SkeletonLoader variant="text" :style="{ width: '100px', height: '14px', marginLeft: '8px' }" />
      </div>
    </div>
  </div>
  
  <!-- Loaded State -->
  <div
    v-else-if="ticker"
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
        <StarIcon 
          :ticker="ticker"
          :is-watchlisted="isWatchlisted(ticker)"
          @toggle="handleToggleWatchlist"
        />
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore, type FMPProfile } from '../../stores/tickerStore'
import { useWatchlists } from '../../composables/useWatchlists'
import StarIcon from '../common/StarIcon.vue'
import SkeletonLoader from '../common/SkeletonLoader.vue'

interface Props {
  ticker: string
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:companyName', name: string): void
  (e: 'update:companyProfile', profile: FMPProfile | null): void
}

const emit = defineEmits<Emits>()

// Watchlist composable (multi-watchlist support)
const { isWatchlisted, toggleWatchlist } = useWatchlists()

const imageError = ref(false)

// Use shared Pinia store (same data source as all other components)
const tickerStore = useTickerStore()
const { batchData, loading, profile, quote } = storeToRefs(tickerStore)

// Extract earnings date from batch data
const earningsDate = computed(() => {
  if (!batchData.value?.data?.earningsCalendar) return null
  const earningsData = batchData.value.data.earningsCalendar
  if (!Array.isArray(earningsData) || earningsData.length === 0) return null
  
  // Find next earnings date (future date)
  const now = new Date()
  const upcoming = earningsData
    .filter(e => e.date && new Date(e.date) >= now)
    .sort((_a, _b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return upcoming.length > 0 ? upcoming[0].date : null
})

// Emit company name and profile when data changes
watch(profile, (newProfile) => {
  if (newProfile?.companyName) {
    emit('update:companyName', newProfile.companyName)
  }
  // Always emit profile to parent so description can be shown
  emit('update:companyProfile', newProfile)
}, { immediate: true })

const handleImageError = (): void => {
  imageError.value = true
}

const handleToggleWatchlist = async (ticker: string): Promise<void> => {
  try {
    await toggleWatchlist(ticker)
  } catch (_error) {
    console.error('Error toggling watchlist:', error)
    alert((error as Error).message || 'Failed to update watchlist')
  }
}

const formatPrice = (price: number | null | undefined): string => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}

const formatEarningsDate = (date: string | null): string => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatMarketCap = (mktCap: number | null | undefined): string => {
  if (!mktCap) return 'N/A'
  const num = Number(mktCap)
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return `$${num.toLocaleString()}`
}
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
  width: calc((100% - 20px) / 2.5);
  margin-left: auto;
  min-width: 0;
  transition: all 0.2s;
  min-height: 72px; /* Fixed minimum height to prevent layout shift */
}

.company-header:hover {
  border-color: #00594C;
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.2);
}

/* Skeleton Loading State */
.company-header-skeleton {
  pointer-events: none;
}

.company-header-skeleton:hover {
  border-color: #2A2A2E; /* No hover effect while loading */
  box-shadow: none;
  transform: none;
}

.company-logo-skeleton {
  flex-shrink: 0;
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
    width: 100%;
    margin-left: 0;
    padding: 8px 12px;
    gap: 10px;
    min-height: 56px; /* Smaller but still fixed on mobile */
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
