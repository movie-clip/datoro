<template>
  <div class="main-menu-overlay" :class="{ 'is-open': isOpen }" @click="emit('close')">
    <div class="main-menu" :class="{ 'is-open': isOpen }" @click.stop>
      <!-- Header -->
      <div class="menu-header">
        <div class="menu-title-section">
          <img 
            src="/logo.png" 
            alt="Factorly Logo" 
            class="menu-logo"
          >
          <span class="menu-title">Menu</span>
        </div>
        <button class="close-button" @click="emit('close')" title="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Menu Content -->
      <div class="menu-content">
        <!-- Watchlist Button -->
        <button 
          v-if="isAuthenticated"
          class="menu-item" 
          @click="handleWatchlistClick"
        >
          <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Watchlist</span>
        </button>

        <!-- Placeholder for future menu items -->
        <div class="menu-section-divider"></div>
        
        <!-- Coming Soon items (examples) -->
        <div class="menu-item disabled">
          <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Dashboard</span>
          <span class="coming-soon-badge">Soon</span>
        </div>
        
        <div class="menu-item disabled">
          <svg class="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Analytics</span>
          <span class="coming-soon-badge">Soon</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'toggle-watchlist'])

function handleWatchlistClick() {
  emit('toggle-watchlist')
  emit('close')
}
</script>

<style scoped>
.main-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.main-menu-overlay.is-open {
  opacity: 1;
  pointer-events: all;
}

.main-menu {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 85%;
  background: #1A1A1D;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.4);
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-menu.is-open {
  transform: translateX(0);
}

/* Header */
.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 89, 76, 0.05);
}

.menu-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.menu-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: contain;
}

.menu-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #E5E5E5;
  letter-spacing: -0.02em;
}

.close-button {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #9E9E9E;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: #FF3B30;
}

/* Menu Content */
.menu-content {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: transparent;
  border: none;
  color: #E5E5E5;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.menu-item:hover:not(.disabled) {
  background: rgba(0, 89, 76, 0.1);
  color: #00A88E;
}

.menu-item.disabled {
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

.menu-item-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.coming-soon-badge {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  background: rgba(255, 184, 0, 0.15);
  border: 1px solid rgba(255, 184, 0, 0.3);
  border-radius: 4px;
  color: #FFB800;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0.75rem 0;
}

/* Scrollbar */
.menu-content::-webkit-scrollbar {
  width: 6px;
}

.menu-content::-webkit-scrollbar-track {
  background: transparent;
}

.menu-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .main-menu {
    width: 280px;
  }
}
</style>
