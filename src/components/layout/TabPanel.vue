<template>
  <Transition 
    :name="transitionName"
    mode="out-in"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
  >
    <div
      v-show="active"
      :id="`panel-${id}`"
      class="tab-panel"
      role="tabpanel"
      :aria-labelledby="`tab-${id}`"
    >
      <slot />
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

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

const transitionName = ref('fade-slide')
const hasBeenActivated = ref(false)

watch(() => props.active, (newVal) => {
  if (newVal) {
    hasBeenActivated.value = true
  }
})

// Animation hooks
const onBeforeEnter = (el) => {
  el.style.opacity = '0'
  el.style.transform = 'translateY(20px)'
}

const onEnter = (el, done) => {
  el.offsetHeight // Trigger reflow
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  setTimeout(done, 300)
}
</script>

<style scoped>
.tab-panel {
  width: 100%;
  padding: 0 12px;
  animation: fadeIn 0.3s ease;
}

/* Fade slide transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Prevent layout shift during transitions */
.tab-panel {
  min-height: 200px;
}
</style>
