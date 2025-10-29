<template>
  <div class="feedback-form">
    <!-- Success Message -->
    <div v-if="submitted" class="success-message">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <h3>Thank you!</h3>
      <p>Your feedback has been submitted successfully.</p>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="submitFeedback" class="form">
      <!-- Name -->
      <div class="form-group">
        <label for="name">Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          placeholder="Your name"
          :disabled="loading"
          required
        />
      </div>

      <!-- Email -->
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="your.email@example.com"
          :disabled="loading"
          required
        />
      </div>

      <!-- Category -->
      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" v-model="formData.category" :disabled="loading">
          <option value="general">General Feedback</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="other">Other</option>
        </select>
      </div>

      <!-- Message -->
      <div class="form-group">
        <label for="message">Message</label>
        <textarea
          id="message"
          v-model="formData.message"
          placeholder="Tell us what you think..."
          rows="6"
          :disabled="loading"
          required
        />
        <div class="char-count">{{ formData.message.length }} / 2000</div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Submit Button -->
      <button type="submit" class="btn-primary" :disabled="loading || !isFormValid">
        <span v-if="loading" class="spinner"></span>
        <span v-else>Send Feedback</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { API_BASE_URL } from '../utils/apiConfig'

const emit = defineEmits(['submitted'])

interface FeedbackData {
  name: string
  email: string
  category: 'bug' | 'feature' | 'general' | 'other'
  message: string
  url?: string
}

const loading = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

const formData = ref<FeedbackData>({
  name: '',
  email: '',
  category: 'general',
  message: ''
})

const isFormValid = computed(() => {
  return (
    formData.value.name.trim().length > 0 &&
    formData.value.email.trim().length > 0 &&
    formData.value.message.trim().length >= 10 &&
    formData.value.message.trim().length <= 2000
  )
})

const submitFeedback = async () => {
  if (!isFormValid.value) return

  try {
    loading.value = true
    error.value = null

    // Add current URL as context
    const data = {
      ...formData.value,
      url: window.location.href
    }

    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Feedback] Validation error:', errorData)
      throw new Error(errorData.error || 'Failed to submit feedback')
    }

    submitted.value = true
    emit('submitted')
    console.log('[Feedback] Submitted successfully')
  } catch (err: any) {
    console.error('[Feedback] Submission failed:', err)
    error.value = err.message || 'Failed to submit feedback. Please try again.'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formData.value = {
    name: '',
    email: '',
    category: 'general',
    message: ''
  }
  submitted.value = false
  error.value = null
}
</script>

<style scoped>
.feedback-form {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 24px;
}

h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.subtitle {
  margin: 0 0 32px 0;
  color: #999;
  font-size: 14px;
}

/* Success Message */
.success-message {
  text-align: center;
  padding: 48px 24px;
}

.success-message .icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #00A88E;
}

.success-message h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.success-message p {
  margin: 0;
  color: #999;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 14px;
  font-weight: 500;
  color: #E5E5E5;
}

input,
textarea {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #E5E5E5;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

select {
  padding: 12px 16px;
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  color: #E5E5E5;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  cursor: pointer;
  /* Custom arrow */
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

select:hover {
  border-color: rgba(0, 168, 142, 0.5);
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #00A88E;
  background: rgba(255, 255, 255, 0.08);
}

select:focus {
  outline: none;
  border-color: #00A88E;
  box-shadow: 0 0 0 2px rgba(0, 168, 142, 0.1);
}

input:disabled,
select:disabled,
textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Style select options */
select option {
  background: #1E1E22;
  color: #E5E5E5;
  padding: 12px;
}

textarea {
  resize: vertical;
  min-height: 120px;
}

.char-count {
  font-size: 12px;
  color: #666;
  text-align: right;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #00A88E;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #00755F;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: #00A88E;
  border: 1px solid #00A88E;
}

.btn-secondary:hover {
  background: rgba(0, 168, 142, 0.1);
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error Message */
.error-message {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #EF4444;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .feedback-form {
    padding: 24px 16px;
  }

  h2 {
    font-size: 20px;
  }
}
</style>
