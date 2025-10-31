/**
 * Async localStorage utilities
 * 
 * Wraps localStorage operations in requestIdleCallback to prevent main thread blocking
 * during critical rendering/interaction periods.
 * 
 * Falls back to immediate execution if requestIdleCallback is not available.
 */

type IdleRequestCallback = (deadline: IdleDeadline) => void

/**
 * Request idle callback polyfill for browsers that don't support it
 */
const requestIdleCallbackPolyfill = (callback: IdleRequestCallback): number => {
  const start = Date.now()
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    })
  }, 1) as unknown as number
}

/**
 * Get requestIdleCallback function (with fallback)
 */
const getRequestIdleCallback = (): typeof requestIdleCallback => {
  return window.requestIdleCallback || requestIdleCallbackPolyfill
}

/**
 * Async wrapper for localStorage.setItem
 * Defers the write to idle time to prevent main thread blocking
 * 
 * @param key - Storage key
 * @param value - Value to store
 * @param immediate - If true, execute immediately (for critical data)
 */
export function setItemAsync(key: string, value: string, immediate = false): Promise<void> {
  if (immediate) {
    // Critical data - write immediately
    localStorage.setItem(key, value)
    return Promise.resolve()
  }
  
  return new Promise((resolve, reject) => {
    const ric = getRequestIdleCallback()
    
    ric(() => {
      try {
        localStorage.setItem(key, value)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * Async wrapper for localStorage.getItem
 * Uses requestIdleCallback for non-critical reads
 * 
 * @param key - Storage key
 * @param immediate - If true, read immediately (for critical data)
 */
export function getItemAsync(key: string, immediate = true): Promise<string | null> {
  if (immediate) {
    // Most reads are critical - return immediately
    return Promise.resolve(localStorage.getItem(key))
  }
  
  return new Promise((resolve, reject) => {
    const ric = getRequestIdleCallback()
    
    ric(() => {
      try {
        const value = localStorage.getItem(key)
        resolve(value)
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * Async wrapper for localStorage.removeItem
 * Defers the removal to idle time
 * 
 * @param key - Storage key
 * @param immediate - If true, remove immediately
 */
export function removeItemAsync(key: string, immediate = false): Promise<void> {
  if (immediate) {
    localStorage.removeItem(key)
    return Promise.resolve()
  }
  
  return new Promise((resolve, reject) => {
    const ric = getRequestIdleCallback()
    
    ric(() => {
      try {
        localStorage.removeItem(key)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * Batch set multiple items asynchronously
 * More efficient than calling setItemAsync multiple times
 * 
 * @param items - Array of [key, value] pairs
 * @param immediate - If true, execute immediately
 */
export function setItemsAsync(items: Array<[string, string]>, immediate = false): Promise<void> {
  if (immediate) {
    items.forEach(([key, value]) => localStorage.setItem(key, value))
    return Promise.resolve()
  }
  
  return new Promise((resolve, reject) => {
    const ric = getRequestIdleCallback()
    
    ric(() => {
      try {
        items.forEach(([key, value]) => localStorage.setItem(key, value))
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}
