<template>
  <header class="header-bar">
    <div class="header-content">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-text">Factorly</span>
      </div>

      <!-- Search Field -->
      <div class="search-container">
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="Type a ticker…"
          @keyup.enter="handleSearch"
          maxlength="10"
        />
        <button 
          v-if="searchInput" 
          class="search-button"
          @click="handleSearch"
        >
          Search
        </button>
      </div>

      <!-- Selected Ticker Label -->
      <div v-if="ticker" class="ticker-label">
        <span class="ticker-symbol">{{ ticker }}</span>
        <span v-if="companyName" class="company-name">– {{ companyName }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  ticker: {
    type: String,
    default: ''
  },
  companyName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['search'])

const searchInput = ref('')

const handleSearch = () => {
  if (searchInput.value.trim()) {
    emit('search', searchInput.value.trim())
  }
}
</script>

<style scoped>
.header-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #121214;
  border-bottom: 1px solid #1E1E22;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  height: 70px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.logo {
  flex-shrink: 0;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.02em;
}

.search-container {
  flex: 1;
  max-width: 400px;
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  background: #1A1A1D;
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  padding: 0.625rem 1rem;
  color: #E5E5E5;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #38BDF8;
  background: #1E1E22;
}

.search-input::placeholder {
  color: #666;
}

.search-button {
  padding: 0.625rem 1.25rem;
  background: #38BDF8;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.search-button:hover {
  background: #5CC9FF;
  transform: translateY(-1px);
}

.search-button:active {
  transform: translateY(0);
}

.ticker-label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
}

.ticker-symbol {
  font-weight: 700;
  color: #00C27A;
  font-size: 1rem;
}

.company-name {
  color: #AAA;
  font-weight: 400;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 0 1rem;
    gap: 1rem;
  }

  .logo-text {
    font-size: 1.25rem;
  }

  .search-container {
    max-width: none;
  }

  .ticker-label {
    display: none;
  }
}

@media (max-width: 480px) {
  .search-input {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }

  .search-button {
    padding: 0.5rem 1rem;
  }
}
</style>
