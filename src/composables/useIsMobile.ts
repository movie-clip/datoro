import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface UseIsMobileReturn {
  isMobile: Ref<boolean>
}

export function useIsMobile(): UseIsMobileReturn {
  const isMobile = ref(false)

  const checkMobile = (): void => {
    isMobile.value = window.innerWidth <= 768
  }

  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })

  return { isMobile }
}
