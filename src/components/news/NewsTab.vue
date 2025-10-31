<!-- src/components/news/NewsTab.vue -->
<template>
  <div class="news-tab">
    <!-- Loading State -->
    <div v-if="loading" class="news-loading">
      <div class="news-card-skeleton" v-for="i in 3" :key="i">
        <SkeletonLoader 
          variant="text" 
          :style="{ width: '80px', height: '80px', borderRadius: '8px', marginRight: '12px' }" 
        />
        <div style="flex: 1;">
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '14px', width: '100%' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ marginBottom: '8px', height: '12px', width: '60%' }" 
          />
          <SkeletonLoader 
            variant="text" 
            :style="{ height: '12px', width: '80%' }" 
          />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="news-error">
      <p>Unable to load news for {{ ticker }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasNews" class="news-empty">
      <p>No recent news available for {{ ticker }}</p>
    </div>

    <!-- News Content - Show 1 card, expand to 3 -->
    <div v-else class="news-grid">
      <article 
        v-for="(item, index) in displayedNews" 
        :key="index"
        class="news-card"
        :class="{ 'is-hidden': !isExpanded && index > 0 }"
      >
        <!-- News Image -->
        <div class="news-image-wrapper">
          <img 
            v-if="item.image" 
            :src="item.image"
            :alt="item.title"
            class="news-image"
            loading="lazy"
            @error="handleImageError"
          />
          <div v-else class="news-image-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM9 11H6V8H9V11ZM19 19H5V5H19V19Z" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
        </div>

        <!-- News Content -->
        <div class="news-content">
          <h4 class="news-title">{{ item.title }}</h4>
          
          <div class="news-meta">
            <time 
              :datetime="item.publishedDate"
              :title="fullDate(item.publishedDate)"
              class="news-date"
            >
              {{ formattedDate(item.publishedDate) }}
            </time>
            <span class="news-separator">•</span>
            <span class="news-source-badge">{{ item.site }}</span>
          </div>

          <p class="news-excerpt">{{ truncateText(item.text, 100) }}</p>

          <a 
            v-if="item.url"
            :href="item.url" 
            target="_blank" 
            rel="noopener noreferrer"
            class="news-read-more"
          >
            Read full article →
          </a>
        </div>
      </article>

      <!-- Show More/Less Button -->
      <button 
        v-if="props.newsItems.length > 1"
        @click="isExpanded = !isExpanded"
        class="news-toggle-btn"
      >
        {{ isExpanded ? 'Show less' : `Show ${props.newsItems.length - 1} more news` }}
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          :style="{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }"
        >
          <path d="M7 10l5 5 5-5z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNewsDate, truncateText } from '../../services/news/newsService'
import type { FMPNewsItem } from '../../types/fmp.types'
import SkeletonLoader from '../common/SkeletonLoader.vue'

interface Props {
  newsItems: FMPNewsItem[]
  loading: boolean
  error: string | null
  ticker: string
}

const props = defineProps<Props>()

const hasNews = computed(() => props.newsItems.length > 0)
const isExpanded = ref(false)

// Show up to 3 news items
const displayedNews = computed(() => {
  return props.newsItems.slice(0, 3)
})

const formattedDate = (dateString: string): string => {
  return formatNewsDate(dateString)
}

// Full date for tooltip
const fullDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Handle image load errors
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
.news-tab {
  min-height: 110px;
}

/* Loading State */
.news-loading {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-card-skeleton {
  display: flex;
  align-items: flex-start;
  gap: 12px;
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

/* News Grid */
.news-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

/* News Card */
.news-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.news-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(0, 168, 142, 0.3);
  transform: translateY(-2px);
}

.news-card.is-hidden {
  display: none;
}

/* News Image */
.news-image-wrapper {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.news-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-image-placeholder {
  color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* News Content */
.news-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.news-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(229, 229, 229, 0.95);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  flex-wrap: wrap;
}

.news-date {
  color: rgba(117, 117, 117, 0.9);
}

.news-separator {
  color: rgba(117, 117, 117, 0.5);
}

.news-source-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(0, 168, 142, 0.15);
  color: #00FF87;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: capitalize;
}

.news-excerpt {
  color: rgba(229, 229, 229, 0.7);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-read-more {
  color: #00A88E;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
}

.news-read-more:hover {
  color: #00FF87;
}

/* Toggle Button */
.news-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #00A88E;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.news-toggle-btn:hover {
  background: rgba(0, 168, 142, 0.1);
  border-color: rgba(0, 168, 142, 0.3);
  color: #00FF87;
}

.news-toggle-btn svg {
  flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .news-card {
    flex-direction: column;
  }

  .news-image-wrapper {
    width: 100%;
    height: 160px;
  }
}
</style>
