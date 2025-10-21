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
   * Load user from localStorage and verify session
   */
  async function init() {
    // Check localStorage for saved token
    const savedToken = localStorage.getItem('authToken')
    if (!savedToken) return
    
    token.value = savedToken
    
    // Verify token is still valid
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        user.value = data.data.user
      } else {
        // Token invalid, clear it
        logout()
      }
    } catch (err) {
      console.error('[Auth] Init error:', err)
      logout()
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
      
      // Save user and token
      user.value = data.data.user
      token.value = data.data.token
      
      // Save to localStorage for persistence
      localStorage.setItem('authToken', data.data.token)
      
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
      
      // Save user and token
      user.value = data.data.user
      token.value = data.data.token
      
      // Save to localStorage
      localStorage.setItem('authToken', data.data.token)
      
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
      
      // Save user and token
      user.value = data.data.user
      token.value = data.data.token
      
      // Save to localStorage
      localStorage.setItem('authToken', data.data.token)
      
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
      // Call logout endpoint if we have a token
      if (token.value) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.value}`
          },
          credentials: 'include'
        })
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      // Clear local state regardless of API call success
      user.value = null
      token.value = null
      localStorage.removeItem('authToken')
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
