<!-- src/components/common/CollapsibleContent.vue -->
<template>
  <div class="collapsible-content">
    <div 
      ref="contentRef"
      :class="{ 'content-collapsed': !isExpanded }"
      class="content-text"
    >
      <slot />
    </div>
    <button 
      v-if="shouldShowToggle"
      class="content-toggle"
      @click="toggleExpanded"
    >
      {{ isExpanded ? 'less' : 'more' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Props {
  minHeight?: number
  collapsedLines?: number
}

const props = withDefaults(defineProps<Props>(), {
  minHeight: 110,
  collapsedLines: 3
})

const isExpanded = ref(false)
const shouldShowToggle = ref(false)
const contentRef = ref<HTMLElement | null>(null)

// Check if content needs toggle button
const checkContentHeight = () => {
  if (!contentRef.value) return
  
  const element = contentRef.value
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 22.4 // fallback to 14px * 1.6
  const maxCollapsedHeight = lineHeight * props.collapsedLines
  
  // Check if scrollHeight exceeds collapsed height
  shouldShowToggle.value = element.scrollHeight > maxCollapsedHeight + 5 // 5px buffer
}

onMounted(async () => {
  await nextTick()
  // Multiple checks to ensure content is rendered
  setTimeout(checkContentHeight, 50)
  setTimeout(checkContentHeight, 200)
  setTimeout(checkContentHeight, 500)
})

const toggleExpanded = (): void => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.collapsible-content {
  position: relative;
  min-height: v-bind('`${minHeight}px`');
}

.content-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(229, 229, 229, 0.85);
  transition: max-height 0.3s ease;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: v-bind('collapsedLines');
  line-clamp: v-bind('collapsedLines');
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-toggle {
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

.content-toggle:hover {
  background: rgba(0, 89, 76, 0.1);
  border-color: #00594C;
  transform: translateY(-1px);
}

.content-toggle:active {
  transform: translateY(0);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .content-text {
    font-size: 13px;
  }

  .content-collapsed {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}
</style>
