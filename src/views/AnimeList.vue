<template>
  <div class="anime-list-container">
    <!-- 年份筛选器 -->
    <section class="years-filter">
      <div class="section-header">
        <h2 class="section-title">年份筛选</h2>
      </div>
      <div class="years-grid">
        <button
          v-for="year in years"
          :key="year"
          class="year-btn"
          :class="{ 'active': selectedYear === year }"
          @click="handleYearClick(year)"
        >
          <span class="year-text">{{ year }}</span>
          <font-awesome-icon 
            v-if="year === currentYear" 
            icon="star" 
            class="current-icon"
          />
        </button>
      </div>
    </section>

    <StatusHint v-if="loading" type="loading" title="少女祈祷中..." sub="正在加载番剧列表，请稍候" />
    <StatusHint v-else-if="error" type="error" :title="'加载失败'" :sub="error">
      <button @click="fetchAnimeList(undefined, true)">重试</button>
    </StatusHint>
    <StatusHint v-else-if="animeList.length === 0 && !loading && !error" type="empty" title="暂无番剧" sub="没有找到任何番剧~" />

    <!-- 番剧列表组件 -->
    <AnimeGrid
      :animeList="animeList"
      :loading="loading"
      :error="error"
      :hasMore="hasMore"
      :title="selectedYear ? `${selectedYear}年番剧` : '全部番剧'"
      :apiBaseUrl="apiBaseUrl"
      :total="total"
      @loadMore="fetchAnimeList(selectedYear)"
      @retry="fetchAnimeList(selectedYear, true)"
      @rendered="updateDynamicPosterUrls"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, reactive } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { bangumiApi } from '@/api/bangumi'
import { useRoute, useRouter } from 'vue-router'
import AnimeGrid from '@/components/AnimeGrid.vue'
import StatusHint from '@/components/StatusHint.vue'

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

const route = useRoute()
const router = useRouter()
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const loading = ref(false)
const error = ref<string | null>(null)
const animeList = ref<Bangumi[]>([])
const years = ref<string[]>([])
const selectedYear = ref<string>('')
const currentYear = new Date().getFullYear().toString()
const page = ref(1)
const pageSize = ref(24)
const hasMore = ref(true)
const total = ref(0) // 添加 total 状态

// Add refs and reactive for dynamic poster URLs
const posterRefs = ref<HTMLElement[]>([]);
const dynamicPosterUrls = reactive<{ [key: number]: string }>({});

const fetchYears = async () => {
  try {
    const response = await bangumiApi.getBangumiYears()
    years.value = response.data
  } catch (error) {
    console.error('获取年份列表失败:', error)
  }
}

const fetchAnimeList = async (year?: string, reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) return
  loading.value = true
  error.value = null
  try {
    const currentPage = reset ? 1 : page.value
    let response
    if (year) {
      response = await bangumiApi.getBangumiByYear(currentPage, pageSize.value, year)
    } else {
      response = await bangumiApi.getAllBangumi(currentPage, pageSize.value)
    }
    
    if (response.code === 200) {
      const list = response.data || []
      total.value = response.total || 0 // 更新 total 状态
      
      if (reset) {
        animeList.value = list
      } else {
        animeList.value = [...animeList.value, ...list]
      }
      
      if (typeof total === 'number') {
        hasMore.value = animeList.value.length < total
      } else {
        hasMore.value = list.length === pageSize.value
      }
      
      if (hasMore.value) {
        page.value = currentPage + 1
      }
      // Wait for DOM update before calculating sizes
      nextTick(() => {
        updateDynamicPosterUrls();
      });
    } else {
      throw new Error(response.message || '获取数据失败')
    }
  } catch (err) {
    console.error('获取番剧列表失败:', err)
    error.value = err instanceof Error ? err.message : '获取数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// Function to update dynamic poster URLs based on element size
const updateDynamicPosterUrls = () => {
  // This function will be called by AnimeGrid component after it renders
  // We need to get the poster elements from the AnimeGrid component
  // However, directly accessing child component refs is not ideal.
  // A better approach is to pass the animeList to AnimeGrid and let AnimeGrid handle its own refs and dynamic URLs.
  // The AnimeGrid component already has the necessary structure.
  // So, we just need to ensure AnimeGrid's internal logic for dynamic URLs is correct.
  // This function is actually not needed here if AnimeGrid handles it internally.
  console.log('updateDynamicPosterUrls called in AnimeList.vue - This should ideally be handled within AnimeGrid.');
};

const handleYearClick = async (year: string) => {
  selectedYear.value = year
  if (year) {
    await router.push(`/anime/year/${year}`)
  } else {
    await router.push('/anime')
  }
}

watch(() => route.params.year, async (newYear) => {
  page.value = 1
  hasMore.value = true
  await fetchAnimeList(newYear as string, true)
}, { immediate: true })

onMounted(async () => {
  await fetchYears()
  if (route.params.year) {
    selectedYear.value = route.params.year as string
    await fetchAnimeList(route.params.year as string) // Initial fetch for year
  } else {
    await fetchAnimeList() // Initial fetch for all
  }
})

// The getPosterUrl function is now handled within AnimeGrid.vue
// Remove the local getPosterUrl function
// const getPosterUrl = (posterLink: string) => {
//   if (!posterLink) return '/default-poster.png'
//   if (posterLink.startsWith('http')) 
//   return posterLink
//   return `${props.apiBaseUrl}/${posterLink.replace(/^\/+/,'')}`
// }

</script>

<style scoped>
.anime-list-container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px;
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

/* 年份筛选器样式 */
.years-filter {
  margin-bottom: 32px;
}

.years-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  padding: 0 16px;
}

.year-btn {
  background: white;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.year-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.year-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.year-text {
  font-size: 18px;
  font-weight: 500;
}

.current-icon {
  color: #ffb800;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .years-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }
}

@media (max-width: 768px) {
  .anime-list-container {
    padding: 16px;
  }

  .years-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 12px;
  }

  .section-title {
    font-size: 20px;
  }

  .year-text {
    font-size: 16px;
  }
}
</style>
