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

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  lazyLoad: {
    type: Boolean,
    default: true
  }
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
}

.tab-panel.is-active {
  opacity: 1;
  pointer-events: auto;
  position: relative;
}
</style>
