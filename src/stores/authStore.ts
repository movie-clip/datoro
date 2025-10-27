// src/stores/authStore.ts
// Auth state management - handles user authentication, login, logout

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'

interface User {
  id: string
  email: string
  name?: string
  subscriptionTier: 'free' | 'premium' | 'enterprise'
  avatarUrl?: string
}

interface AuthResponse {
  success: boolean
  data?: {
    user: User
  }
  error?: string
  errors?: Array<{ msg?: string; message?: string }>
}

interface AuthResult {
  success: boolean
  error?: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user: Ref<User | null> = ref(null)
  const token: Ref<string | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  
  // Computed
  const isAuthenticated: ComputedRef<boolean> = computed(() => !!user.value && !!token.value)
  const isPremium: ComputedRef<boolean> = computed(() => user.value?.subscriptionTier === 'premium' || user.value?.subscriptionTier === 'enterprise')
  const isEnterprise: ComputedRef<boolean> = computed(() => user.value?.subscriptionTier === 'enterprise')
  
  // ============================================
  // Initialization
  // ============================================
  
  /**
   * Initialize auth state - check if user is logged in via cookie
   * SECURITY: Token is in HttpOnly cookie, never in localStorage
   * 
   * Always checks with server since HttpOnly cookies can't be read by JavaScript.
   * Note: You may see a 401 error in the Network tab - this is normal when not logged in.
   */
  async function init(): Promise<void> {
    // SECURITY: Token is in HttpOnly cookie only (JavaScript cannot access)
    // This protects against XSS attacks
    
    // Note: We can't check if the cookie exists because it's HttpOnly
    // (JavaScript can't read it). So we just try to verify with the server.
    // The server will return 401 if no valid cookie exists.
    
    try {
      // Add timeout to prevent auth from blocking too long
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include', // Send HttpOnly cookie
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data: AuthResponse = await response.json()
        user.value = data.data?.user || null
        token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      } else if (response.status === 401) {
        // Not logged in - this is expected, not an error
        user.value = null
        token.value = null
      } else {
        // Other errors (500, etc.) - these are real errors worth logging
        console.error('[Auth] Unexpected init error:', response.status)
        user.value = null
        token.value = null
      }
    } catch (err) {
      // Network errors or timeout - these are real errors worth logging
      if ((err as Error).name === 'AbortError') {
        console.warn('[Auth] ⏱️ Init timeout (auth check took >3s)')
      } else {
        console.error('[Auth] ❌ Init network error:', (err as Error).message)
      }
      user.value = null
      token.value = null
    }
  }
  
  // ============================================
  // Register
  // ============================================
  
  async function register(email: string, password: string, name: string): Promise<AuthResult> {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      })
      
      const data: AuthResponse = await response.json()
      
      if (!response.ok) {
        // Extract detailed error message from validation errors or main error
        let errorMessage = data.error || 'Registration failed'
        
        // If there are validation errors, show the first one
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0 && data.errors[0]) {
          errorMessage = data.errors[0].msg || data.errors[0].message || errorMessage
        }
        
        console.error('[Auth] Registration failed:', errorMessage, data)
        throw new Error(errorMessage)
      }
      
      // Save user data
      user.value = data.data?.user || null
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      console.log('[Auth] ✓ Registration successful:', user.value?.email)
      return { success: true }
      
    } catch (err) {
      const errMessage = (err as Error).message
      error.value = errMessage
      console.error('[Auth] Registration error:', errMessage)
      return { success: false, error: errMessage }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Login
  // ============================================
  
  async function login(email: string, password: string): Promise<AuthResult> {
    loading.value = true
    error.value = null
    
    try {
      console.log('[Auth] 🔐 Attempting login...')
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      
      const data: AuthResponse = await response.json()
      
      if (!response.ok) {
        // Extract detailed error message
        let errorMessage = data.error || 'Login failed'
        
        // If there are validation errors, show the first one
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0 && data.errors[0]) {
          errorMessage = data.errors[0].msg || data.errors[0].message || errorMessage
        }
        
        // Log detailed error for debugging
        console.error('[Auth] ❌ Login failed')
        console.error('[Auth] Error message:', errorMessage)
        console.error('[Auth] Status:', response.status)
        console.error('[Auth] Full response:', data)
        
        // Add helpful hint for common issues
        if (response.status === 401 && errorMessage.includes('Invalid email or password')) {
          console.error('[Auth] 💡 Hint: If you just deployed to production, you need to register a new account.')
          console.error('[Auth] 💡 Your local development database is separate from production.')
        }
        
        throw new Error(errorMessage)
      }
      
      // Save user data
      user.value = data.data?.user || null
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      console.log('[Auth] ✓ Login successful:', user.value?.email)
      
      // Check if cookie was set
      console.log('[Auth] 🍪 Checking cookies after login...')
      console.log('[Auth] 🍪 All cookies:', document.cookie || '(none visible - HttpOnly cookies won\'t show here)')
      console.log('[Auth] 🍪 Note: authToken cookie is HttpOnly, so JavaScript cannot see it')
      console.log('[Auth] 🍪 To verify: Open DevTools → Application → Cookies → http://192.168.18.3:5173')
      
      return { success: true }
      
    } catch (err) {
      const errMessage = (err as Error).message
      error.value = errMessage
      console.error('[Auth] Login error:', errMessage)
      return { success: false, error: errMessage }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Login with Google
  // ============================================
  
  async function loginWithGoogle(googleToken: string): Promise<AuthResult> {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: googleToken })
      })
      
      const data: AuthResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Google login failed')
      }
      
      // Save user data
      user.value = data.data?.user || null
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      return { success: true }
      
    } catch (err) {
      const errMessage = (err as Error).message
      error.value = errMessage
      return { success: false, error: errMessage }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Logout
  // ============================================
  
  async function logout(): Promise<void> {
    loading.value = true
    
    try {
      // Call logout endpoint - token is sent automatically via HttpOnly cookie
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include' // Send HttpOnly cookie
      })
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      // Clear local state regardless of API call success
      user.value = null
      token.value = null
      // Token is in HttpOnly cookie - server clears it
      loading.value = false
    }
  }
  
  // ============================================
  // Update User Profile
  // ============================================
  
  function updateUser(updates: Partial<User>): void {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }
  
  return {
    // State
    user,
    token,
    loading,
    error,
    
    // Computed
    isAuthenticated,
    isPremium,
    isEnterprise,
    
    // Actions
    init,
    register,
    login,
    loginWithGoogle,
    logout,
    updateUser
  }
})
