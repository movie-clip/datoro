<!-- src/components/common/TabNavigation.vue -->
<template>
  <div class="tab-navigation">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="['tab-btn', { active: modelValue === tab.id }]"
      @click="selectTab(tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const selectTab = (tabId: string) => {
  emit('update:modelValue', tabId)
}
</script>

<style scoped>
.tab-navigation {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  justify-content: flex-start;
}

.tab-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(42, 42, 42, 0.5);
  color: rgba(229, 229, 229, 0.7);
  cursor: pointer;
  font-size: 12px;
  font-weight: 400;
  transition: all 0.15s;
  min-width: fit-content;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(42, 42, 42, 0.8);
  color: rgba(229, 229, 229, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.tab-btn.active {
  border-color: rgba(0, 89, 76, 0.4);
  background: rgba(0, 89, 76, 0.2);
  color: #E5E5E5;
  font-weight: 500;
}

.tab-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 89, 76, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .tab-btn {
    padding: 5px 10px;
    font-size: 11px;
  }
}
</style>
