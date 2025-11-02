<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="emit('close')"
        tabindex="0"
      >
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Account Settings</h2>
            <button class="close-button" @click="emit('close')" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-body">
            <!-- User Profile Section -->
            <section class="settings-section">
              <h3>Profile</h3>
              <div class="profile-info">
                <div v-if="user?.avatarUrl" class="avatar">
                  <img :src="user.avatarUrl" :alt="user.name || 'User'" />
                </div>
                <div v-else class="avatar avatar-placeholder">
                  {{ userInitials }}
                </div>
                <div class="user-details">
                  <p class="user-name">{{ user?.name || 'User' }}</p>
                  <p class="user-email">{{ user?.email }}</p>
                  <p v-if="user?.emailVerified" class="email-verified">
                    ✓ Email verified
                  </p>
                  <p v-else class="email-not-verified">
                    ⚠️ Email not verified
                  </p>
                </div>
              </div>
            </section>

            <!-- Subscription Section - DISABLED -->
            <!-- <section class="settings-section">
              <h3>Subscription</h3>
              <SubscriptionStatus />
            </section> -->

            <!-- Account Actions -->
            <section class="settings-section">
              <h3>Account</h3>
              <div class="action-buttons">
                <button @click="handleLogout" class="btn-logout" :disabled="loggingOut">
                  {{ loggingOut ? 'Signing out...' : 'Sign Out' }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'
// import SubscriptionStatus from '../subscription/SubscriptionStatus.vue' // Disabled - subscription UI hidden

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()
const loggingOut = ref(false)

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  const names = user.value.name.split(' ')
  if (names.length >= 2 && names[0] && names[1]) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase()
  }
  return user.value.name.slice(0, 2).toUpperCase()
})

async function handleLogout() {
  loggingOut.value = true
  try {
    await authStore.logout()
    emit('close')
    // Optionally reload page to reset state
    window.location.href = '/'
  } catch (error) {
    console.error('[AccountSettings] Logout error:', error)
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
/* Modal overlay and transitions - matching project style */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  outline: none;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 168, 142, 0.2); /* Project green */
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #00A88E; /* Project green */
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #00A88E 0%, #00594C 100%); /* Project green gradient */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
}

.user-email {
  font-size: 14px;
  color: #999;
  margin: 0 0 8px 0;
}

.email-verified {
  font-size: 13px;
  color: #00A88E; /* Project green */
  margin: 0;
  font-weight: 500;
}

.email-not-verified {
  font-size: 13px;
  color: #f59e0b;
  margin: 0;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-logout {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #999;
  font-size: 14px;
}

.btn-logout:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.btn-logout:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-header h2 {
    font-size: 20px;
  }

  .modal-body {
    padding: 16px;
  }

  .profile-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>
