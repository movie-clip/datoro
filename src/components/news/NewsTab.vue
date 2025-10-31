<!-- src/components/news/NewsTab.vue -->
<template>
  <div class="news-tab">
    <!-- Loading State -->
    <div v-if="loading" class="news-loading">
      <SkeletonLoader 
        variant="text" 
        :style="{ marginBottom: '8px', height: '14px' }" 
      />
      <SkeletonLoader 
        variant="text" 
        :style="{ marginBottom: '8px', height: '14px' }" 
      />
      <SkeletonLoader 
        variant="text" 
        :style="{ height: '14px' }" 
      />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="news-error">
      <p>Unable to load news for {{ ticker }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasNews" class="news-empty">
      <p>No recent news available for {{ ticker }}</p>
    </div>

    <!-- News Content -->
    <CollapsibleContent v-else-if="latestNews" :min-height="110" :collapsed-lines="3">
      <div class="news-header">
        <strong class="news-title">{{ latestNews?.title }}</strong>
        <div class="news-meta">
          <span class="news-date">{{ latestNews?.publishedDate ? formattedDate(latestNews.publishedDate) : '' }}</span>
          <span class="news-separator">•</span>
          <a 
            v-if="latestNews?.url"
            :href="latestNews.url" 
            target="_blank" 
            rel="noopener noreferrer"
            class="news-source-link"
          >
            {{ latestNews.site }}
          </a>
        </div>
      </div>
      <div class="news-body">
        {{ latestNews?.text }}
      </div>
    </CollapsibleContent>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNewsDate } from '../../services/news/newsService'
import type { FMPNewsItem } from '../../types/fmp.types'
import SkeletonLoader from '../common/SkeletonLoader.vue'
import CollapsibleContent from '../common/CollapsibleContent.vue'

interface Props {
  newsItems: FMPNewsItem[]
  loading: boolean
  error: string | null
  ticker: string
}

const props = defineProps<Props>()

const hasNews = computed(() => props.newsItems.length > 0)

// Get the most recent/important news item
const latestNews = computed(() => {
  if (props.newsItems.length === 0) {
    return null
  }
  return props.newsItems[0]
})

const formattedDate = (dateString: string): string => {
  return formatNewsDate(dateString)
}
</script>

<style scoped>
.news-tab {
  min-height: 110px;
}

/* Loading State */
.news-loading {
  padding: 8px 0;
}

/* Error State */
.news-error {
  padding: 16px 0;
  color: rgba(229, 114, 115, 0.9);
  font-size: 14px;
}

.news-error p {
  margin: 0;
}

/* Empty State */
.news-empty {
  padding: 16px 0;
  color: rgba(158, 158, 158, 0.8);
  font-size: 14px;
}

.news-empty p {
  margin: 0;
}

/* News Header */
.news-header {
  margin-bottom: 8px;
}

.news-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: rgba(229, 229, 229, 0.95);
  line-height: 1.4;
  margin-bottom: 6px;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 8px;
}

.news-date {
  color: rgba(117, 117, 117, 0.9);
}

.news-separator {
  color: rgba(117, 117, 117, 0.5);
}

.news-source-link {
  color: #00A88E;
  text-decoration: none;
  transition: color 0.2s ease;
}

.news-source-link:hover {
  color: #00FF87;
}

/* News Body */
.news-body {
  color: rgba(229, 229, 229, 0.85);
}

/* Responsive */
@media (max-width: 768px) {
  .news-title {
    font-size: 13px;
  }

  .news-meta {
    font-size: 11px;
  }
}
</style>
