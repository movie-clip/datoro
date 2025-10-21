// src/stores/authStore.js
// Auth state management - handles user authentication, login, logout

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig.js'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  // Computed
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isPremium = computed(() => user.value?.subscriptionTier === 'premium' || user.value?.subscriptionTier === 'enterprise')
  const isEnterprise = computed(() => user.value?.subscriptionTier === 'enterprise')
  
  // ============================================
  // Initialization
  // ============================================
  
  /**
   * Initialize auth state - check if user is logged in via cookie
   * SECURITY: Token is in HttpOnly cookie, never in localStorage
   * 
   * Checks for auth cookie before making request to avoid unnecessary 401s.
   */
  async function init() {
    // SECURITY: Token is in HttpOnly cookie only (JavaScript cannot access)
    // This protects against XSS attacks
    
    // Check if authToken cookie exists before making request
    // This prevents unnecessary 401 errors in production analytics
    const hasAuthCookie = document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith('authToken=')
    )
    
    if (!hasAuthCookie) {
      // No cookie = not logged in, skip the request entirely
      user.value = null
      token.value = null
      return
    }
    
    // Cookie exists, verify it with the server
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (response.ok) {
        const data = await response.json()
        user.value = data.data.user
        token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
        console.log('[Auth] ✓ Session restored:', user.value.email)
      } else {
        // Cookie exists but invalid/expired - clear state silently
        user.value = null
        token.value = null
      }
    } catch (err) {
      // Network errors only - these are real errors worth logging
      console.error('[Auth] Init network error:', err.message)
      user.value = null
      token.value = null
    }
  }
  
  // ============================================
  // Register
  // ============================================
  
  async function register(email, password, name) {
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
      
      const data = await response.json()
      
      if (!response.ok) {
        // Extract detailed error message from validation errors or main error
        let errorMessage = data.error || 'Registration failed'
        
        // If there are validation errors, show the first one
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors[0].msg || data.errors[0].message || errorMessage
        }
        
        console.error('[Auth] Registration failed:', errorMessage, data)
        throw new Error(errorMessage)
      }
      
      // Save user data
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      console.log('[Auth] ✓ Registration successful:', user.value.email)
      return { success: true }
      
    } catch (err) {
      error.value = err.message
      console.error('[Auth] Registration error:', err.message)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Login
  // ============================================
  
  async function login(email, password) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Extract detailed error message
        let errorMessage = data.error || 'Login failed'
        
        // If there are validation errors, show the first one
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
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
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      console.log('[Auth] ✓ Login successful:', user.value.email)
      return { success: true }
      
    } catch (err) {
      error.value = err.message
      console.error('[Auth] Login error:', err.message)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Login with Google
  // ============================================
  
  async function loginWithGoogle(googleToken) {
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
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Google login failed')
      }
      
      // Save user data
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
      
      // SECURITY: Token is ONLY in HttpOnly cookie (server-side)
      // JavaScript never touches the token - XSS protection!
      
      return { success: true }
      
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }
  
  // ============================================
  // Logout
  // ============================================
  
  async function logout() {
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
  
  function updateUser(updates) {
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
