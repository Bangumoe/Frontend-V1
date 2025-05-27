<template>
  <section class="anime-section">
    <div class="section-header">
      <h2 class="section-title">
        {{ title }}
        <span class="total-count">(共{{ total }}部)</span>
      </h2>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && animeList.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="$emit('retry')">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="animeList.length === 0" class="empty-state">
      <font-awesome-icon icon="film" class="empty-icon" />
      <p>暂无番剧数据</p>
    </div>

    <!-- 番剧网格 -->
    <div v-else class="anime-grid">
      <RouterLink
        v-for="(anime, index) in animeList"
        :key="anime.ID"
        :to="`/v2/bangumi/${anime.ID}`"
        class="anime-card"
        target="_blank"
      >
        <div class="poster-container" :ref="el => { if (el) posterRefs[index] = el as HTMLElement }">
          <img
            :src="dynamicPosterUrls[anime.ID] || getPosterUrl(anime.poster_link)"
            :alt="anime.official_title"
            class="poster"
            @error="(e) => (e.target as HTMLImageElement).src = '/default-poster.png'"
          />
          <div class="hover-info">
            <button class="play-btn">
              <play-one theme="filled" size="30" fill="#333"/>
            </button>
          </div>
        </div>
        <div class="anime-info">
          <h3 class="title">{{ anime.official_title }}</h3>
          <div class="meta-info">
            <span class="year">{{ anime.year }}</span>
            <span class="season">第{{ anime.season }}季</span>
          </div>
          <div class="stats">
            <div class="stat-item rating" v-if="anime.rating_avg > 0">
              <Star />
              <span>{{ anime.rating_avg.toFixed(1) }}</span>
            </div>
            <div class="stat-item views">
              <play theme="filled" fill="#333"/>
              <span>{{ anime.view_count }}</span>
            </div>
            <div class="stat-item favorites">
              <Like />
              <span>{{ anime.favorite_count }}</span>
            </div>
          </div>
        </div>
        </RouterLink>
    </div>
    <div v-if="loading && animeList.length > 0" class="loading-state">加载中...</div>
    <!-- 滚动加载触发点 -->
    <div ref="sentinel" class="sentinel-element"></div>
    <div v-if="!hasMore && animeList.length > 0" class="end-state">没有更多了</div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, reactive, nextTick } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { faFilm } from '@fortawesome/free-solid-svg-icons'
import { Play, Like, Star, PlayOne } from '@icon-park/vue-next';

interface Bangumi {
  ID: number
  official_title: string
  year: string
  season: number
  poster_link: string
  view_count: number
  favorite_count: number
  rating_avg: number
  rating_count: number
}

const props = defineProps<{
  animeList: Bangumi[]
  loading: boolean
  error: string | null
  hasMore: boolean
  title: string
  apiBaseUrl: string
  total: number // 添加 total 属性
}>()
const emit = defineEmits(['loadMore', 'retry', 'rendered'])

// Add refs and reactive for dynamic poster URLs
const posterRefs = ref<HTMLElement[]>([]);
const dynamicPosterUrls = reactive<{ [key: number]: string }>({});

const getPosterUrl = (posterLink: string) => {
  if (!posterLink) return '/default-poster.png'
  if (posterLink.startsWith('http')) 
  return posterLink
  // Return the base URL + cleaned path, without size/format parameters
  return `${props.apiBaseUrl}/${posterLink.replace(/^\/+/,'')}`
}

// Function to update dynamic poster URLs based on element size
const updateDynamicPosterUrls = () => {
  // Clear previous refs
  posterRefs.value = [];
  nextTick(() => {
    props.animeList.forEach((anime, index) => {
      const posterElement = posterRefs.value[index];
      if (posterElement) {
        const width = posterElement.offsetWidth;
        const height = posterElement.offsetHeight;
        const baseUrl = getPosterUrl(anime.poster_link);
        if (baseUrl) {
          dynamicPosterUrls[anime.ID] = `${baseUrl}?width=${width}&height=${height}&format=webp`;
        }
      }
    });
    // Emit rendered event after updating URLs
    emit('rendered');
  });
};

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const options = {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  }
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && props.hasMore && !props.loading) {
      emit('loadMore')
    }
  }, options)
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  if (observer && sentinel.value) observer.unobserve(sentinel.value)
})

// Watch for changes in animeList prop to update dynamic URLs
watch(() => props.animeList, () => {
  updateDynamicPosterUrls();
}, { deep: true });

</script>

<style scoped>
/* 引入AnimeList.vue中与番剧网格相关的样式 */
.anime-section {
  margin-bottom: 32px;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  padding: 0 16px;
}

.anime-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: inherit;
  transform: translateZ(0);
  will-change: transform, box-shadow;
}

.anime-card:hover {
  transform: translateY(-4px) translateZ(0);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.poster-container {
  position: relative;
  padding-top: 140%;
  overflow: hidden;
  background-color: #f0f0f0;
}

.poster {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  backface-visibility: hidden;
  transform: translateZ(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.hover-info {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.anime-card:hover .hover-info {
  opacity: 1;
}

.anime-card:hover .poster {
  transform: scale(1.05) translateZ(0);
}

.play-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.anime-info {
  padding: 12px;
}

.title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  height: 2.8em;
}

.meta-info {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item.rating {
  color: #ffb800;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-color);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #ff4d4f;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #ff86aa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #ddd;
}

.sentinel-element {
  width: 100%;
  height: 20px;
  margin: 20px 0;
  visibility: hidden;
}

.end-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .anime-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .anime-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
  .section-title {
    font-size: 20px;
  }
  .title {
    font-size: 13px;
  }
  .meta-info,
  .stats {
    font-size: 11px;
  }
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 16px;
}
.section-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
  position: relative;
  padding-left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background-color: var(--primary-color);
  border-radius: 2px;
}
</style>
