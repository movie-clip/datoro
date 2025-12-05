<template>
  <div class="styled-select-wrapper">
    <div class="select-inner">
      <slot name="icon" />
      <select 
        :value="modelValue"
        class="styled-select"
        :class="{ 'has-icon': $slots.icon }"
        :disabled="disabled"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <slot />
      </select>
      <svg 
        class="chevron-icon"
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  disabled?: boolean
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.styled-select-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.select-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-inner :deep(svg:not(.chevron-icon)) {
  width: 18px;
  height: 18px;
  color: #FFD700;
  flex-shrink: 0;
  position: absolute;
  left: 0.75rem;
  pointer-events: none;
  z-index: 1;
}

.styled-select {
  flex: 1;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #E5E5E5;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  min-width: 100px;
  width: 100%;
}

.styled-select.has-icon {
  padding-left: 2.75rem;
}

.styled-select:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.styled-select:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.styled-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.styled-select option {
  background: #1E1E1E;
  color: #E5E5E5;
  padding: 0.75rem;
}

.chevron-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9E9E9E;
  pointer-events: none;
  transition: transform 0.2s, color 0.2s;
}

.styled-select:focus ~ .chevron-icon {
  color: #E5E5E5;
}

/* Hover effect on wrapper */
.select-inner:hover .chevron-icon {
  color: #E5E5E5;
}
</style>
