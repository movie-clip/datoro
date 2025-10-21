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
   * NOTE: You may see "401 (Unauthorized)" in the browser console - this is NORMAL!
   * It just means you're not logged in. The browser shows all HTTP requests,
   * including expected 401 responses. This is not an error.
   */
  async function init() {
    // SECURITY: Token is in HttpOnly cookie only (JavaScript cannot access)
    // This protects against XSS attacks
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (response.ok) {
        const data = await response.json()
        user.value = data.data.user
        token.value = 'cookie' // Placeholder - actual token in HttpOnly cookie
        console.log('[Auth] ✓ Session restored:', user.value.email)
      } else if (response.status === 401) {
        // 401 = Not logged in (this is expected, not an error!)
        user.value = null
        token.value = null
        console.log('[Auth] ℹ No active session (not logged in)')
      } else {
        // Other errors (500, etc.)
        console.error('[Auth] ✗ Unexpected error during init:', response.status)
        user.value = null
        token.value = null
      }
    } catch (err) {
      // Network errors, etc.
      console.error('[Auth] ✗ Init error:', err)
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
        
        console.error('[Auth] Login failed:', errorMessage, data)
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
