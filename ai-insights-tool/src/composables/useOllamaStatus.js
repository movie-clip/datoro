import { ref, onMounted, onUnmounted } from 'vue'

export function useOllamaStatus() {
  const ollamaStatus = ref('checking')
  let intervalId = null

  async function checkOllamaStatus() {
    try {
      const res = await fetch('/api/ollama/status')
      const data = await res.json()
      ollamaStatus.value = data.running ? 'connected' : 'offline'
    } catch (error) {
      ollamaStatus.value = 'offline'
    }
  }

  onMounted(() => {
    checkOllamaStatus()
    intervalId = setInterval(checkOllamaStatus, 5000)
  })

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  return {
    ollamaStatus,
    checkOllamaStatus
  }
}
