import { ref } from 'vue'

export function useBundleStats() {
  const bundleStats = ref(null)

  async function loadBundleStats() {
    try {
      const res = await fetch('/api/bundle/stats')
      bundleStats.value = await res.json()
    } catch (error) {
      console.error('Failed to load bundle stats:', error)
    }
  }

  return {
    bundleStats,
    loadBundleStats
  }
}
