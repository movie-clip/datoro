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
   */
  async function init() {
    // Token is automatically sent via HttpOnly cookie
    // We just need to verify the session is still valid
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include' // Send HttpOnly cookie
      })
      
      if (response.ok) {
        const data = await response.json()
        user.value = data.data.user
        token.value = 'cookie' // Placeholder - actual token is in cookie
      } else {
        // Session invalid or expired
        user.value = null
        token.value = null
      }
    } catch (err) {
      console.error('[Auth] Init error:', err)
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
        throw new Error(data.error || 'Registration failed')
      }
      
      // Save user (token is in HttpOnly cookie)
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token is in cookie
      
      // SECURITY: Do NOT store token in localStorage!
      // Token is automatically stored in HttpOnly cookie by server
      
      return { success: true }
      
    } catch (err) {
      error.value = err.message
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
        throw new Error(data.error || 'Login failed')
      }
      
      // Save user (token is in HttpOnly cookie)
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token is in cookie
      
      // SECURITY: Do NOT store token in localStorage!
      // Token is automatically stored in HttpOnly cookie by server
      
      return { success: true }
      
    } catch (err) {
      error.value = err.message
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
      
      // Save user (token is in HttpOnly cookie)
      user.value = data.data.user
      token.value = 'cookie' // Placeholder - actual token is in cookie
      
      // SECURITY: Do NOT store token in localStorage!
      // Token is automatically stored in HttpOnly cookie by server
      
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
      // No need to remove from localStorage - never stored there!
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
