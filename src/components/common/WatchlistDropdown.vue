<template>
  <div class="watchlist-dropdown">
    <!-- Dropdown Trigger -->
    <button 
      class="dropdown-trigger"
      :disabled="loading"
      @click="toggleDropdown"
    >
      <div class="trigger-content">
        <svg
          class="watchlist-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span class="watchlist-name">{{ currentWatchlistName }}</span>
        <svg 
          class="chevron-icon" 
          :class="{ 'is-open': isOpen }"
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown-menu"
        @click.stop
      >
        <!-- Watchlist List -->
        <div class="watchlist-section">
          <div class="section-header">
            <span>Your Watchlists</span>
          </div>
          
          <div class="watchlist-list">
            <button
              v-for="watchlist in watchlists"
              :key="watchlist.id"
              class="watchlist-option"
              :class="{ 'is-active': watchlist.id === activeWatchlistId }"
              @click="selectWatchlist(watchlist.id)"
            >
              <div class="watchlist-info">
                <span class="watchlist-option-name">{{ watchlist.name }}</span>
              </div>
              
              <div class="watchlist-actions">
                <button 
                  class="action-btn rename-btn"
                  title="Rename watchlist"
                  @click.stop="startRename(watchlist)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button 
                  class="action-btn delete-btn"
                  title="Delete watchlist"
                  @click.stop="confirmDelete(watchlist)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </button>
          </div>
        </div>

        <div class="dropdown-divider" />

        <!-- Create New Watchlist -->
        <button 
          class="create-new-btn" 
          :class="{ 'is-disabled': watchlists.length >= 5 }"
          :disabled="watchlists.length >= 5"
          :title="watchlists.length >= 5 ? 'Maximum of 5 watchlists reached' : 'Create a new watchlist'"
          @click="startCreate"
        >
          <svg
            class="plus-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            />
            <line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
          <span>Create New Watchlist{{ watchlists.length >= 5 ? ' (Max 5)' : '' }}</span>
        </button>
      </div>
    </Transition>

    <!-- Create/Rename Modal -->
    <Transition name="modal">
      <div
        v-if="showModal"
        class="modal-overlay"
        @click="cancelModal"
      >
        <div
          class="modal-content"
          @click.stop
        >
          <h3 class="modal-title">
            {{ modalMode === 'create' ? 'Create New Watchlist' : 'Rename Watchlist' }}
          </h3>
          
          <input
            ref="modalInput"
            v-model="modalInputValue"
            type="text"
            class="modal-input"
            :placeholder="modalMode === 'create' ? 'My Watchlist' : 'Enter new name'"
            maxlength="50"
            @keyup.enter="confirmModal"
            @keyup.esc="cancelModal"
          >
          
          <div class="modal-actions">
            <button
              class="modal-btn cancel-btn"
              @click="cancelModal"
            >
              Cancel
            </button>
            <button 
              class="modal-btn confirm-btn" 
              :disabled="!modalInputValue.trim()"
              @click="confirmModal"
            >
              {{ modalMode === 'create' ? 'Create' : 'Rename' }}
            </button>
          </div>

          <p
            v-if="modalError"
            class="modal-error"
          >
            {{ modalError }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation Modal -->
    <Transition name="modal">
      <div
        v-if="showDeleteConfirm"
        class="modal-overlay"
        @click="cancelDelete"
      >
        <div
          class="modal-content delete-modal"
          @click.stop
        >
          <h3 class="modal-title">
            Delete Watchlist?
          </h3>
          
          <p class="delete-warning">
            Are you sure you want to delete "<strong>{{ watchlistToDelete?.name }}</strong>"?
            <br>All tickers in this watchlist will be removed.
          </p>
          
          <div class="modal-actions">
            <button
              class="modal-btn cancel-btn"
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button
              class="modal-btn delete-btn"
              @click="executeDelete"
            >
              Delete
            </button>
          </div>

          <p
            v-if="deleteError"
            class="modal-error"
          >
            {{ deleteError }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useWatchlists, type Watchlist } from '../../composables/useWatchlists'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

const {
  watchlists,
  activeWatchlistId,
  activeWatchlist,
  loading,
  initializeWatchlists,
  selectWatchlist: selectWatchlistAction,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist
} = useWatchlists()

// Dropdown state
const isOpen = ref(false)

// Modal state
const showModal = ref(false)
const modalMode = ref<'create' | 'rename'>('create')
const modalInputValue = ref('')
const modalError = ref('')
const modalInput = ref<HTMLInputElement | null>(null)
const watchlistToEdit = ref<Watchlist | null>(null)

// Delete confirmation state
const showDeleteConfirm = ref(false)
const watchlistToDelete = ref<Watchlist | null>(null)
const deleteError = ref('')

// Computed
const currentWatchlistName = computed(() => {
  if (loading.value) return 'Loading...'
  return activeWatchlist.value?.name || 'My Watchlist'
})

// Initialize on mount
onMounted(async () => {
  await initializeWatchlists()
})

// Click outside to close dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value && !(event.target as Element).closest('.watchlist-dropdown')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Dropdown actions
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectWatchlist = async (id: string) => {
  await selectWatchlistAction(id)
  isOpen.value = false
}

// Create watchlist
const startCreate = () => {
  // Check watchlist limit (max 5)
  if (watchlists.value.length >= 5) {
    modalError.value = 'Maximum of 5 watchlists allowed'
    setTimeout(() => {
      modalError.value = ''
    }, 3000)
    return
  }
  
  modalMode.value = 'create'
  modalInputValue.value = ''
  modalError.value = ''
  showModal.value = true
  isOpen.value = false
  
  nextTick(() => {
    modalInput.value?.focus()
  })
}

// Rename watchlist
const startRename = (watchlist: Watchlist) => {
  modalMode.value = 'rename'
  modalInputValue.value = watchlist.name
  modalError.value = ''
  watchlistToEdit.value = watchlist
  showModal.value = true
  isOpen.value = false
  
  nextTick(() => {
    modalInput.value?.select()
  })
}

// Modal actions
const confirmModal = async () => {
  const name = modalInputValue.value.trim()
  if (!name) return
  
  try {
    modalError.value = ''
    
    if (modalMode.value === 'create') {
      await createWatchlist(name)
    } else if (modalMode.value === 'rename' && watchlistToEdit.value) {
      await renameWatchlist(watchlistToEdit.value.id, name)
    }
    
    showModal.value = false
    modalInputValue.value = ''
    watchlistToEdit.value = null
  } catch (_error: unknown) {
    modalError.value = getErrorMessage(_error, 'Operation failed')
  }
}

const cancelModal = () => {
  showModal.value = false
  modalInputValue.value = ''
  modalError.value = ''
  watchlistToEdit.value = null
}

// Delete watchlist
const confirmDelete = (watchlist: Watchlist) => {
  watchlistToDelete.value = watchlist
  deleteError.value = ''
  showDeleteConfirm.value = true
  isOpen.value = false
}

const executeDelete = async () => {
  if (!watchlistToDelete.value) return
  
  try {
    deleteError.value = ''
    await deleteWatchlist(watchlistToDelete.value.id)
    showDeleteConfirm.value = false
    watchlistToDelete.value = null
  } catch (_error: unknown) {
    deleteError.value = getErrorMessage(_error, 'Failed to delete watchlist')
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  watchlistToDelete.value = null
  deleteError.value = ''
}
</script>

<style scoped>
.watchlist-dropdown {
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
}

/* Dropdown Trigger */
.dropdown-trigger {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.watchlist-icon {
  width: 18px;
  height: 18px;
  color: #FFD700;
  flex-shrink: 0;
}

.watchlist-name {
  flex: 1;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #9E9E9E;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: #1E1E1E;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}

.watchlist-section {
  padding: 0.5rem;
}

.section-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9E9E9E;
}

.watchlist-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.watchlist-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.watchlist-option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.watchlist-option.is-active {
  background: rgba(0, 122, 255, 0.15);
  color: #007AFF;
}

.watchlist-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  overflow: hidden;
}

.default-icon {
  width: 14px;
  height: 14px;
  color: #FFD700;
  flex-shrink: 0;
}

.watchlist-option-name {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watchlist-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.watchlist-option:hover .watchlist-actions {
  opacity: 1;
}

.action-btn {
  padding: 0.25rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.rename-btn {
  color: #9E9E9E;
}

.rename-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #007AFF;
}

.delete-btn {
  color: #9E9E9E;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
}

.create-new-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #007AFF;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.create-new-btn:hover {
  background: rgba(0, 122, 255, 0.1);
}

.create-new-btn.is-disabled,
.create-new-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9E9E9E;
}

.create-new-btn.is-disabled:hover,
.create-new-btn:disabled:hover {
  background: transparent;
}

.plus-icon {
  width: 18px;
  height: 18px;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.modal-content {
  background: #1E1E1E;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #E5E5E5;
  margin: 0 0 1rem 0;
}

.modal-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #E5E5E5;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.modal-input:focus {
  outline: none;
  border-color: #007AFF;
  background: rgba(255, 255, 255, 0.08);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #E5E5E5;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.confirm-btn {
  background: #007AFF;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: #0051D5;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.delete-btn {
  background: #FF3B30;
  color: white;
}

.modal-btn.delete-btn:hover {
  background: #D32F2F;
}

.modal-error {
  margin: 0.75rem 0 0 0;
  color: #FF3B30;
  font-size: 0.875rem;
}

.delete-warning {
  color: #9E9E9E;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.delete-warning strong {
  color: #E5E5E5;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Scrollbar */
.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
