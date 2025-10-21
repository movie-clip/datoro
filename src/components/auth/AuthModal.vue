<template>
  <div v-if="isOpen" class="auth-modal-overlay" @click.self="closeModal">
    <div class="auth-modal" role="dialog" aria-modal="true">
      <button class="close-button" @click="closeModal" aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      
      <div class="auth-tabs">
        <button 
          :class="['tab', { active: activeTab === 'signin' }]"
          @click="activeTab = 'signin'"
        >
          Sign In
        </button>
        <button 
          :class="['tab', { active: activeTab === 'signup' }]"
          @click="activeTab = 'signup'"
        >
          Sign Up
        </button>
      </div>
      
      <!-- Sign In Form -->
      <form v-if="activeTab === 'signin'" @submit.prevent="handleSignIn" class="auth-form">
        <h2>Welcome Back</h2>
        <p class="subtitle">Sign in to access premium features</p>
        
        <div class="form-group">
          <label for="signin-email">Email</label>
          <input 
            id="signin-email"
            v-model="signInForm.email"
            type="email" 
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label for="signin-password">Password</label>
          <input 
            id="signin-password"
            v-model="signInForm.password"
            type="password" 
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <button type="submit" class="submit-button" :disabled="loading">
          <span v-if="!loading">Sign In</span>
          <span v-else>Signing in...</span>
        </button>
        
        <div class="divider">
          <span>or</span>
        </div>
        
        <button type="button" class="google-button" @click="handleGoogleSignIn" :disabled="loading">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.183l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </form>
      
      <!-- Sign Up Form -->
      <form v-else @submit.prevent="handleSignUp" class="auth-form">
        <h2>Create Account</h2>
        <p class="subtitle">Start your free trial today</p>
        
        <div class="form-group">
          <label for="signup-name">Name (optional)</label>
          <input 
            id="signup-name"
            v-model="signUpForm.name"
            type="text" 
            placeholder="John Doe"
            autocomplete="name"
          />
        </div>
        
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input 
            id="signup-email"
            v-model="signUpForm.email"
            type="email" 
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label for="signup-password">Password</label>
          <input 
            id="signup-password"
            v-model="signUpForm.password"
            type="password" 
            placeholder="••••••••"
            required
            autocomplete="new-password"
          />
          <small class="hint">Min 8 characters, 1 uppercase, 1 lowercase, 1 number</small>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <button type="submit" class="submit-button" :disabled="loading">
          <span v-if="!loading">Create Account</span>
          <span v-else">Creating account...</span>
        </button>
        
        <div class="divider">
          <span>or</span>
        </div>
        
        <button type="button" class="google-button" @click="handleGoogleSignIn" :disabled="loading">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.183l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        
        <p class="terms">
          By creating an account, you agree to our 
          <a href="/terms" target="_blank">Terms of Service</a> and 
          <a href="/privacy" target="_blank">Privacy Policy</a>.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  defaultTab: {
    type: String,
    default: 'signin' // 'signin' or 'signup'
  }
})

const emit = defineEmits(['close', 'success'])

const authStore = useAuthStore()

const activeTab = ref(props.defaultTab)
const loading = ref(false)
const error = ref(null)

const signInForm = ref({
  email: '',
  password: ''
})

const signUpForm = ref({
  name: '',
  email: '',
  password: ''
})

// Reset forms when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    error.value = null
    activeTab.value = props.defaultTab
  } else {
    signInForm.value = { email: '', password: '' }
    signUpForm.value = { name: '', email: '', password: '' }
  }
})

function closeModal() {
  emit('close')
}

async function handleSignIn() {
  loading.value = true
  error.value = null
  
  const result = await authStore.login(signInForm.value.email, signInForm.value.password)
  
  loading.value = false
  
  if (result.success) {
    emit('success', { type: 'signin' })
    closeModal()
  } else {
    error.value = result.error
  }
}

async function handleSignUp() {
  loading.value = true
  error.value = null
  
  const result = await authStore.register(
    signUpForm.value.email, 
    signUpForm.value.password,
    signUpForm.value.name
  )
  
  loading.value = false
  
  if (result.success) {
    emit('success', { type: 'signup' })
    closeModal()
  } else {
    error.value = result.error
  }
}

async function handleGoogleSignIn() {
  // Google OAuth will be implemented next
  error.value = 'Google Sign-In coming soon! For now, use email/password.'
}

// Close modal on Escape key
function handleKeydown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    closeModal()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.auth-modal {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  padding: 2rem;
  max-width: 440px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 89, 76, 0.2), 0 0 0 1px rgba(0, 89, 76, 0.1);
  animation: slideUp 0.3s ease-out;
  transition: border-color 0.3s ease;
}

.auth-modal:hover {
  border-color: rgba(0, 89, 76, 0.4);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 1px solid transparent;
  color: #888;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: rgba(0, 89, 76, 0.3);
  color: #00A88E;
}

.auth-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.25rem;
}

.auth-tabs .tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #888;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.auth-tabs .tab:hover:not(.active) {
  background: rgba(0, 168, 142, 0.05);
  color: #00A88E;
}

.auth-tabs .tab.active {
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.3);
}

.auth-form h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  color: #fff;
}

.subtitle {
  color: #888;
  margin: 0 0 2rem 0;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #00A88E;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(0, 168, 142, 0.1);
}

.hint {
  display: block;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.8rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #00594C 0%, #00755F 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 89, 76, 0.2);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 89, 76, 0.4);
  background: linear-gradient(135deg, #00755F 0%, #00A88E 100%);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.divider span {
  position: relative;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  padding: 0 1rem;
  color: #666;
  font-size: 0.85rem;
}

.google-button {
  width: 100%;
  padding: 0.875rem;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #333;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.2s;
}

.google-button:hover:not(:disabled) {
  background: #f9f9f9;
  border-color: rgba(0, 168, 142, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.google-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.terms {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.8rem;
  line-height: 1.5;
}

.terms a {
  color: #00A88E;
  text-decoration: none;
  transition: color 0.2s;
}

.terms a:hover {
  color: #00C9A7;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .auth-modal {
    padding: 1.5rem;
  }
  
  .auth-form h2 {
    font-size: 1.5rem;
  }
}
</style>
