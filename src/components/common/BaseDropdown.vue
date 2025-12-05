<template>
  <div
    ref="dropdownRef"
    class="base-dropdown"
  >
    <!-- Dropdown Trigger -->
    <button 
      class="dropdown-trigger"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <div class="trigger-content">
        <!-- Icon Slot (optional) -->
        <slot name="icon">
          <svg
            v-if="showDefaultIcon"
            class="default-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </slot>
        
        <!-- Selected Text -->
        <span class="selected-text">{{ selectedLabel }}</span>
        
        <!-- Chevron Icon -->
        <svg 
          class="chevron-icon" 
          :class="{ 'is-open': isOpen }"
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown-menu"
        @click.stop
      >
        <div class="dropdown-list">
          <button
            v-for="option in options"
            :key="option.value"
            class="dropdown-option"
            :class="{ 'is-active': option.value === modelValue }"
            @click="selectOption(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface DropdownOption {
  label: string
  value: string
}

interface Props {
  modelValue: string
  options: DropdownOption[]
  disabled?: boolean
  showDefaultIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showDefaultIcon: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected?.label || 'Select...'
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectOption = (value: string) => {
  emit('update:modelValue', value)
  isOpen.value = false
}

// Click outside to close dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.base-dropdown {
  position: relative;
  width: 100%;
}

/* Dropdown Trigger */
.dropdown-trigger {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-trigger.compact {
  padding: 0.5rem 0.75rem;
  min-width: 100px;
}

.dropdown-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.dropdown-trigger.compact .trigger-content {
  gap: 0.5rem;
}

.default-icon {
  width: 18px;
  height: 18px;
  color: #FFD700;
  flex-shrink: 0;
}

.selected-text {
  flex: 1;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-trigger.compact .selected-text {
  font-size: 0.875rem;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #9E9E9E;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: #1E1E1E;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
  font-size: 0.9rem;
}

.dropdown-option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-option.is-active {
  background: rgba(0, 122, 255, 0.15);
  color: #007AFF;
}

/* Scrollbar */
.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
