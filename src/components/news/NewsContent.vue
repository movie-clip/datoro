<!-- src/components/news/NewsContent.vue -->
<template>
  <div class="news-content-wrapper">
    <!-- Primary News Item (always visible - line 1) -->
    <article 
      v-if="firstNewsItem"
      class="news-card"
    >
      <!-- News Image -->
      <div class="news-image-wrapper">
        <img 
          v-if="firstNewsItem.image" 
          :src="firstNewsItem.image"
          :alt="firstNewsItem.title"
          class="news-image"
          loading="lazy"
          @error="handleImageError"
        >
        <div
          v-else
          class="news-image-placeholder"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM9 11H6V8H9V11ZM19 19H5V5H19V19Z"
              fill="currentColor"
              opacity="0.3"
            />
          </svg>
        </div>
      </div>

      <!-- News Content -->
      <div class="news-text">
        <h4 class="news-title">
          {{ firstNewsItem.title }}
        </h4>
        
        <div class="news-meta">
          <time 
            :datetime="firstNewsItem.publishedDate"
            :title="fullDate(firstNewsItem.publishedDate)"
            class="news-date"
          >
            {{ formattedDate(firstNewsItem.publishedDate) }}
          </time>
          <span class="news-separator">•</span>
          <span class="news-source-badge">{{ firstNewsItem.site }}</span>
        </div>

        <p class="news-excerpt">
          {{ truncateText(firstNewsItem.text, 100) }}
        </p>

        <a 
          v-if="firstNewsItem.url"
          :href="firstNewsItem.url" 
          target="_blank" 
          rel="noopener noreferrer"
          class="news-read-more"
        >
          Read full article →
        </a>
      </div>
    </article>

    <!-- Additional News Items (2-3, collapsible via parent) -->
    <div
      v-if="additionalNewsItems.length > 0"
      class="additional-news"
    >
      <article 
        v-for="(item, index) in additionalNewsItems" 
        :key="index"
        class="news-card"
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
          >
          <div
            v-else
            class="news-image-placeholder"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM9 11H6V8H9V11ZM19 19H5V5H19V19Z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>

        <!-- News Content -->
        <div class="news-text">
          <h4 class="news-title">
            {{ item.title }}
          </h4>
          
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

          <p class="news-excerpt">
            {{ truncateText(item.text, 100) }}
          </p>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNewsDate, truncateText } from '../../services/news/newsService'
import type { FMPNewsItem } from '../../types/fmp.types'

interface Props {
  newsItems: FMPNewsItem[]
}

const props = defineProps<Props>()

// First news item (always visible)
const firstNewsItem = computed(() => {
  return props.newsItems[0] || null
})

// Additional news items (2-3, collapsible)
const additionalNewsItems = computed(() => {
  return props.newsItems.slice(1, 3)
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
/* Additional News Container */
.additional-news {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
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

/* News Text Content */
.news-text {
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
  line-clamp: 2;
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
  line-clamp: 2;
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
