<template>
  <div
    v-if="shouldRender"
    :id="`panel-${id}`"
    class="tab-panel"
    :class="{ 'is-active': active }"
    role="tabpanel"
    :aria-labelledby="`tab-${id}`"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  id: string
  active?: boolean
  lazyLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  lazyLoad: true
})

const hasBeenActivated = ref(false)

watch(() => props.active, (newVal) => {
  if (newVal) {
    hasBeenActivated.value = true
  }
})

// Only render if active or if lazy load is disabled and has been activated
const shouldRender = computed(() => {
  if (props.lazyLoad) {
    return props.active || hasBeenActivated.value
  }
  return true
})
</script>

<style scoped>
.tab-panel {
  width: 100%;
  padding: 0 12px;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  min-height: 450px; /* Maintain height during transitions to prevent layout shift */
}

.tab-panel.is-active {
  opacity: 1;
  pointer-events: auto;
  position: relative;
}
</style>
