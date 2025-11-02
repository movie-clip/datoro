<template>
  <div class="tab-navigation">
    <div class="tab-list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: modelValue === tab.id, disabled: tab.disabled }]"
        :aria-selected="modelValue === tab.id"
        :aria-controls="`panel-${tab.id}`"
        :disabled="tab.disabled"
        role="tab"
        @click="!tab.disabled && $emit('update:modelValue', tab.id)"
      >
        <span class="tab-icon">
          <!-- Support component, image path, or emoji/string icons -->
          <component v-if="typeof tab.icon === 'object'" :is="tab.icon" />
          <img 
            v-else-if="typeof tab.icon === 'string' && (tab.icon.endsWith('.png') || tab.icon.endsWith('.jpg') || tab.icon.endsWith('.svg'))" 
            :src="tab.icon" 
            :alt="`${tab.label} icon`"
            class="tab-icon-img"
            loading="lazy"
            decoding="async"
            width="28"
            height="28"
          />
          <template v-else>{{ tab.icon }}</template>
        </span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Tab {
  id: string
  label: string
  icon?: string | Component
  badge?: string | number | null
  disabled?: boolean
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: string): void
}

defineEmits<Emits>()
</script>

<style scoped>
.tab-navigation {
  width: 100%;
}

.tab-list {
  display: flex;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #2A2A2E transparent;
}

.tab-list::-webkit-scrollbar {
  height: 6px;
}

.tab-list::-webkit-scrollbar-track {
  background: #151518;
  border-radius: 3px;
}

.tab-list::-webkit-scrollbar-thumb {
  background: #2A2A2E;
  border-radius: 3px;
}

.tab-list::-webkit-scrollbar-thumb:hover {
  background: #3A3A3E;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #9E9E9E;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  position: relative;
  outline: none;
}

.tab-button:hover {
  background: rgba(0, 89, 76, 0.1);
  color: #E5E5E5;
  border-color: rgba(0, 89, 76, 0.3);
}

.tab-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.tab-button.disabled:hover {
  background: transparent;
  color: #9E9E9E;
  border-color: transparent;
}

.tab-button.active {
  background: linear-gradient(135deg, rgba(0, 89, 76, 0.2) 0%, rgba(0, 89, 76, 0.15) 100%);
  border-color: #00594C;
  color: #00A88E;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.2);
}

.tab-button:focus-visible {
  outline: 2px solid #00594C;
  outline-offset: 2px;
}

.tab-icon {
  font-size: 1.25rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  /* Fixed size container for consistent icon dimensions */
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.tab-icon svg {
  width: 28px;
  height: 28px;
  display: block;
  transition: all 0.3s ease;
}

/* PNG/JPG/SVG image icons - force exact size regardless of source dimensions */
.tab-icon-img {
  width: 28px !important;
  height: 28px !important;
  max-width: 35px;
  max-height: 35px;
  min-width: 35px;
  min-height: 35px;
  display: block;
  object-fit: cover; /* Fill the entire 28x28 space, may crop if aspect ratio differs */
  object-position: center; /* Center the image */
  /* Optimize rendering performance */
  will-change: transform, opacity;
  transition: transform 0.2s ease, opacity 0.2s ease;
  /* Dimmed state for inactive tabs - use opacity instead of expensive filters */
  opacity: 0.5;
}

/* Hover effect for icons */
.tab-button:hover .tab-icon {
  transform: translateY(-2px);
}

/* Hover effect for image icons - increase opacity */
.tab-button:hover .tab-icon-img {
  opacity: 0.85;
}

/* Active tab icon color matches accent */
.tab-button.active .tab-icon svg {
  stroke: #00A88E;
  filter: drop-shadow(0 0 4px rgba(0, 168, 142, 0.4));
}

/* Active tab image icon - full opacity */
.tab-button.active .tab-icon-img {
  opacity: 1;
  filter: drop-shadow(0 0 4px rgba(0, 168, 142, 0.4));
}

/* Default icon color */
.tab-button .tab-icon svg {
  stroke: #9E9E9E;
}

/* Hover icon color */
.tab-button:hover .tab-icon svg {
  stroke: #E5E5E5;
}

.tab-label {
  font-weight: 500;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #FF4976;
  border-radius: 10px;
  color: #FFF;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

/* Mobile optimization */
@media (max-width: 768px) {
  .tab-navigation {
    margin: 16px auto;
  }

  .tab-list {
    gap: 4px;
    padding: 4px;
  }

  .tab-button {
    padding: 10px 16px;
    font-size: 0.9rem;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  /* Hide labels on very small screens, show icons only */
  @media (max-width: 480px) {
    .tab-label {
      display: none;
    }

    .tab-button {
      padding: 10px 12px;
    }
  }
}

/* Smooth scroll for tab navigation */
.tab-list {
  scroll-behavior: smooth;
}

/* Animation for active tab indicator */
.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: #00A88E;
  border-radius: 2px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    width: 0%;
    opacity: 0;
  }
  to {
    width: 60%;
    opacity: 1;
  }
}
</style>
