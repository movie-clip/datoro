import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable for detecting platform type (mobile vs desktop/standalone)
 * @returns {Object} Platform detection state
 */
export function usePlatform() {
  const isMobile = ref(false)
  const isStandalone = ref(true)

  const updatePlatform = () => {
    isMobile.value = window.innerWidth <= 768
    isStandalone.value = window.innerWidth > 768
    // comment to enalbe history bar on standalone
    isStandalone.value = false
  }

  onMounted(() => {
    updatePlatform()
    window.addEventListener('resize', updatePlatform)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updatePlatform)
  })

  return {
    isMobile,
    isStandalone
  }
}
