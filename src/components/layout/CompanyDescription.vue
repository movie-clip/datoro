<template>
  <div 
    v-if="description" 
    class="company-description"
  >
    <h4 class="description-title">About</h4>
    <div class="description-content">
      <p 
        :class="{ 'description-collapsed': !isExpanded }"
        class="description-text"
      >
        {{ description }}
      </p>
      <button 
        v-if="shouldShowToggle"
        class="description-toggle"
        @click="toggleExpanded"
      >
        {{ isExpanded ? 'less' : 'more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  description?: string
  collapsedLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  collapsedLength: 150 // Characters to show when collapsed
})

const isExpanded = ref(false)

const shouldShowToggle = computed(() => {
  return props.description && props.description.length > props.collapsedLength
})

const toggleExpanded = (): void => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.company-description {
  padding: 16px 0;
  border-bottom: 1px solid #2A2A2E;
  margin-bottom: 16px;
  min-height: 110px; /* Fixed minimum height to prevent layout shift */
}

.description-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(229, 229, 229, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px 0;
}

.description-content {
  position: relative;
}

.description-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(229, 229, 229, 0.85);
  transition: max-height 0.3s ease;
}

.description-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-toggle {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  color: #00A88E;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.description-toggle:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: #00594C;
  transform: translateY(-1px);
}

.description-toggle:active {
  transform: translateY(0);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .company-description {
    padding: 12px 0;
    margin-bottom: 12px;
  }

  .description-title {
    font-size: 13px;
  }

  .description-text {
    font-size: 13px;
  }

  .description-collapsed {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}
</style>
