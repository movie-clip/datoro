// src/stores/authStore.ts
// Auth state management - handles user authentication, login, logout

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'
import { trackSignup, trackLogin, setUserId } from '../services/analytics/gaService'

interface Subscription {
  status: string
  isInTrial: boolean
  trialEndsAt: Date | null
  trialStartsAt: Date | null
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  currentPeriodEnd: Date | null
  currentPeriodStart: Date | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}

interface User {
  id: string
  email: string
  name?: string
  subscription?: Subscription | null
  avatarUrl?: string
  emailVerified?: boolean
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
  const hasActiveSubscription: ComputedRef<boolean> = computed(() => {
    if (!user.value?.subscription) return false
    const sub = user.value.subscription
    // Active if in trial (not expired) OR paid subscription is active
    if (sub.isInTrial && sub.trialEndsAt) {
      return new Date() < new Date(sub.trialEndsAt)
    }
    return sub.status === 'ACTIVE'
  })
  const isInTrial: ComputedRef<boolean> = computed(() => user.value?.subscription?.isInTrial || false)
  
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
      // Increased to 10s to handle cold database connections after server restart
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
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
    } catch (_err) {
      // Network errors or timeout
      if ((_err as Error).name === 'AbortError') {
        console.warn('[Auth] ⏱️ Auth check timeout (>10s) - server may be starting up. Retrying...')
        // Set user to null but don't show error - they can retry login
        user.value = null
        token.value = null
        
        // Retry once after a short delay (server might be warming up)
        setTimeout(async () => {
          try {
            const retryResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
              credentials: 'include'
            })
            if (retryResponse.ok) {
              const data: AuthResponse = await retryResponse.json()
              user.value = data.data?.user || null
              token.value = 'cookie'
              console.info('[Auth] Retry successful - user authenticated')
            }
          } catch (_retryErr) {
            // Silent fail on retry - user can manually login
            console.warn('[Auth] Retry failed, user needs to login manually')
          }
        }, 2000) // Wait 2s for server to warm up
      } else {
        console.error('[Auth] ❌ Init network error:', (_err as Error).message)
        user.value = null
        token.value = null
      }
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
      
      // Track successful signup in GA4
      trackSignup('email')
      setUserId(user.value?.id || null)
      
      console.info('[Auth] Registration successful:', user.value?.email)
      return { success: true }
      
    } catch (_err) {
      const errMessage = (_err as Error).message
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
      console.info('[Auth] Attempting login...')
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
        // Check for email not verified error (403)
        if (response.status === 403 && (data as any).code === 'EMAIL_NOT_VERIFIED') {
          const unverifiedError: any = new Error('Please verify your email address before logging in')
          unverifiedError.code = 'EMAIL_NOT_VERIFIED'
          unverifiedError.email = (data as any).email
          throw unverifiedError
        }
        
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
      
      // Track successful login in GA4
      trackLogin('email')
      setUserId(user.value?.id || null)
      
      console.info('[Auth] Login successful:', user.value?.email)
      
      // Check if cookie was set
      if (import.meta.env.DEV) {
        console.info('[Auth] Checking cookies after login...')
        console.info('[Auth] All cookies:', document.cookie || '(none visible - HttpOnly cookies won\'t show here)')
        console.info('[Auth] Note: authToken cookie is HttpOnly, so JavaScript cannot see it')
        console.info('[Auth] To verify: Open DevTools -> Application -> Cookies -> http://192.168.18.3:5173')
      }
      
      return { success: true }
      
    } catch (_err) {
      const errMessage = (_err as Error).message
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
      
    } catch (_err) {
      const errMessage = (_err as Error).message
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
    } catch (_err) {
      console.error('[Auth] Logout error:', _err)
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
  
  // ============================================
  // Check Auth (Refresh User Data)
  // ============================================
  
  async function checkAuth(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data: AuthResponse = await response.json()
        user.value = data.data?.user || null
        token.value = 'cookie'
      }
    } catch (_err) {
      console.error('[Auth] Check auth error:', _err)
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
    hasActiveSubscription,
    isInTrial,
    
    // Actions
    init,
    register,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    checkAuth
  }
})
