import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface UsePlatformReturn {
  isMobile: Ref<boolean>
  isStandalone: Ref<boolean>
}

/**
 * Composable for detecting platform type (mobile vs desktop/standalone)
 * @returns Platform detection state
 */
export function usePlatform(): UsePlatformReturn {
  const isMobile = ref(false)
  const isStandalone = ref(true)

  const updatePlatform = (): void => {
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
