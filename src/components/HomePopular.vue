<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch, reactive, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { bangumiApi } from '@/api/bangumi'
import { Play, Like, Star, Right, Left, PlayOne } from '@icon-park/vue-next';

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

const popularBangumis = ref<Bangumi[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const total = ref(0)

// Add refs and reactive for dynamic poster URLs
const posterRefs = ref<HTMLElement[]>([]);
const dynamicPosterUrls = reactive<{ [key: number]: string }>({});

const getPosterUrl = (posterLink: string) => {
  if (!posterLink) return '/default-poster.png'
  // Check if the posterLink is already a full URL
  if (posterLink.startsWith('http://') || posterLink.startsWith('https://')) {
    // Return the URL as is, without adding size/format parameters here
    return posterLink;
  }
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (viteApiBaseUrl) {
    const base = viteApiBaseUrl.endsWith('/') ? viteApiBaseUrl.slice(0, -1) : viteApiBaseUrl;
    // Return the base URL + cleaned path, without size/format parameters
    return `${base}/${posterLink.replace(/^\/+/g, '')}`;
  } else {
    console.warn('VITE_API_BASE_URL is not defined or is empty. Using root-relative path.');
    // Return the root-relative path, without size/format parameters
    return `/${posterLink.replace(/^\/+/g, '')}`;
  }
}

const fetchPopularBangumis = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) return
  loading.value = true
  error.value = null
  try {
    const currentPage = reset ? 1 : page.value
    const response = await bangumiApi.getBangumiRankings(currentPage, pageSize.value)
    const data = response
    if (data.code === 200) {
      const list = data.data || []
      total.value = typeof data.total === 'number' ? data.total : 0
      if (reset) {
        popularBangumis.value = list
      } else {
        popularBangumis.value = [...popularBangumis.value, ...list]
      }
      // 优先用total判断是否还有更多
      if (total.value > 0) {
        hasMore.value = popularBangumis.value.length < total.value
      } else {
        hasMore.value = list.length === pageSize.value
      }
      if (hasMore.value) page.value = currentPage + 1
      else page.value = currentPage

      // Wait for DOM update before calculating sizes
      nextTick(() => {
        updateDynamicPosterUrls();
      });

    } else {
      throw new Error(data.message || '获取数据失败')
    }
  } catch (err) {
    console.error('获取热门番剧失败:', err)
    error.value = err instanceof Error ? err.message : '获取数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// Function to update dynamic poster URLs based on element size
const updateDynamicPosterUrls = () => {
  popularBangumis.value.forEach((bangumi, index) => {
    const posterElement = posterRefs.value[index];
    if (posterElement) {
      const width = posterElement.offsetWidth;
      const height = posterElement.offsetHeight;
      const baseUrl = getPosterUrl(bangumi.poster_link);
      if (baseUrl) {
        dynamicPosterUrls[bangumi.ID] = `${baseUrl}?width=${width}&height=${height}&format=webp`;
      }
    }
  });
};

let observer: IntersectionObserver | null = null
onMounted(() => {
  fetchPopularBangumis(true)
})

watch(sentinel, (newSentinel) => {
  if (newSentinel) {
    // Intersection Observer for infinite scrolling
    const options = {
      root: scrollContainer.value, // Observe within the scroll container
      rootMargin: '0px 500px 0px 0px', // Trigger when 500px from the right edge
      threshold: 0.1
    };
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loading.value) {
        console.log('HomePopular: 触发加载更多', { page: page.value, hasMore: hasMore.value });
        fetchPopularBangumis();
      }
    }, options);
    // Observe the sentinel element
    observer.observe(newSentinel);
  }
});

onUnmounted(() => {
  if (observer && sentinel.value) observer.unobserve(sentinel.value);
  if (observer) observer.disconnect();
});

// Scrolling logic
const scrollLeft = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -1000, behavior: 'smooth' }); // Adjust scroll distance as needed
  }
}

const scrollRight = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 1000, behavior: 'smooth' }); // Adjust scroll distance as needed
  }
}
</script>

<template>
  <section class="popular-section">
    <div class="section-header">
      <h2 class="section-title">热门推荐</h2>
      <RouterLink to="/rankings" class="view-more">
        查看更多
        <Right />
      </RouterLink>
    </div>

    <!-- 滚动按钮 -->
    <div class="scroll-buttons">
      <button class="scroll-btn left" @click="scrollLeft">
        <Left />
      </button>
      <button class="scroll-btn right" @click="scrollRight">
        <Right />
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && popularBangumis.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="() => fetchPopularBangumis(true)">重试</button>
    </div>

    <!-- 正常状态 -->
    <div v-else class="bangumi-scroll-container" ref="scrollContainer">
      <div class="bangumi-list">
        <RouterLink
          v-for="(bangumi, index) in popularBangumis"
          :key="bangumi.ID"
          :to="`/v2/bangumi/${bangumi.ID}`"
          class="bangumi-card"
        >
          <div class="poster-container" :ref="el => { if (el) posterRefs[index] = el as HTMLElement }">
            <img
              :src="dynamicPosterUrls[bangumi.ID]"
              :alt="bangumi.official_title"
              class="poster"
              @error="(e: Event) => (e.target as HTMLImageElement).src = '/default-poster.png'"
            />
            <div class="hover-info">
              <button class="play-btn">
                <play-one theme="filled" size="30" fill="#333"/>
              </button>
            </div>
          </div>
          <div class="bangumi-info">
            <h3 class="title">{{ bangumi.official_title }}</h3>
            <div class="meta-info">
              <span class="year">{{ bangumi.year }}</span>
              <span class="season">第{{ bangumi.season }}季</span>
            </div>
            <div class="stats">
              <div class="stat-item rating" v-if="bangumi.rating_avg > 0">
                <Star />
                <span>{{ bangumi.rating_avg.toFixed(1) }}</span>
              </div>
              <div class="stat-item views">
                <play theme="filled" fill="#333"/>
                <span>{{ bangumi.view_count }}</span>
              </div>
              <div class="stat-item favorites">
                <Like />
                <span>{{ bangumi.favorite_count }}</span>
              </div>
            </div>
          </div>
        </RouterLink>
        <!-- 滚动加载触发点 -->
      <div ref="sentinel" class="sentinel-element"></div>
      </div>
    </div>
  </section>
  <div v-if="!hasMore && popularBangumis.length > 0" class="end-state">没有更多了</div>
  <div v-if="loading && popularBangumis.length > 0" class="loading-state">加载中...</div> <!-- Display loading only if list is not empty -->
  <hr />
</template>

<style scoped>
.popular-section {
  margin-bottom: 48px;
  width: 100%;
  position: relative; /* Add position relative to contain absolute buttons */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
  position: relative;
  padding-left: 12px;
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

.view-more {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border-radius: 16px;
  background-color: rgba(251, 114, 153, 0.1);
  color: var(--primary-color);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
}

.view-more:hover {
  background-color: var(--primary-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.2);;
}

.bangumi-scroll-container {
  width: 100%;
  overflow-x: auto;
  padding: 0 16px;
  height: 400px; /* Set a fixed height to stabilize layout */
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.bangumi-list {
  display: flex;
  gap: 24px;
  padding-bottom: 16px; /* Add some padding at the bottom for the scrollbar area */
}

.bangumi-card {
  flex: 0 0 200px; /* Prevent shrinking, set base width */
  width: 200px; /* Explicit width */
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

.bangumi-card {
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

.bangumi-card:hover {
  transform: translateY(-4px) translateZ(0);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.poster-container {
  position: relative;
  padding-top: 140%; /* Creates a 10:14 aspect ratio, adjust as needed */
  overflow: hidden;
  background-color: #f0f0f0; /* Placeholder color */
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
  backface-visibility: hidden; /* Improves rendering performance */
  transform: translateZ(0); /* Promotes to a hardware layer */
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform; /* Hint for browser optimization */
  animation: imageFadeIn 0.3s ease-in-out;
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

.bangumi-card:hover .hover-info {
  opacity: 1;
}

.bangumi-card:hover .poster {
  transform: scale(1.05) translateZ(0);
}

.play-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white;
  font-size: 20px; /* Adjust if IconPark icon size differs */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.bangumi-info {
  padding: 12px;
}

.title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  height: 2.8em; /* 1.4 * 2 lines */
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
  color: #ffb800; /* Gold color for ratings */
}

/* Loading and Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px; /* Ensure it takes some space */
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-color);
  border-top-color: transparent; /* Makes it a spinner */
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
  color: #ff4d4f; /* A common error color */
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
  background-color: #ff86aa; /* Lighter shade of primary for hover */
}

/* Keyframe for image fade-in */
@keyframes imageFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 滚动加载触发点样式 */
.sentinel-element {
  width: 100px !important; /* Adjust width for horizontal scrolling */
  min-width: 100px !important; /* Ensure minimum width */
  box-sizing: border-box; /* Include padding and border in the element's total width and height */
  margin: 0 50px; /* Adjust margin for horizontal scrolling */
  /* visibility: hidden; /* 仿照 AnimeList.vue */ 
  flex: 0 0 100px !important; /* Ensure it behaves correctly as a flex item */
  flex-shrink: 0 !important; /* Prevent shrinking */
  /*border: 1px solid red;   Temporary border for debugging */
  display: block !important; /* Force display block for debugging */
  /*background-color: rgba(0, 255, 0, 0.5);*/ /* Temporary background for debugging */
}

.end-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.scroll-buttons {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 8px; /* Add some padding to keep buttons off the edge */
  pointer-events: none; /* Allow clicks to pass through */
  z-index: 1; /* Ensure buttons are above content */
}

.scroll-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s, transform 0.3s;
  pointer-events: auto; /* Re-enable pointer events for the buttons themselves */
}

.scroll-btn:hover {
  background-color: #ff86aa;
  transform: scale(1.1);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .bangumi-list {
    gap: 20px;
  }
  .bangumi-card {
    flex: 0 0 180px;
    width: 180px;
  }
}

@media (max-width: 768px) {
  .bangumi-list {
    gap: 16px;
  }
  .bangumi-card {
    flex: 0 0 140px;
    width: 140px;
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
</style>