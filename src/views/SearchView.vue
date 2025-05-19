<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { bangumiApi } from '@/api/bangumi'
import AnimeGrid from '@/components/AnimeGrid.vue'

const route = useRoute()
const searchTitle = ref<string>(route.query.title as string || '')
const animeList = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = 24
const hasMore = ref(true)
const total = ref(0)

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const fetchSearch = async (reset = false) => {
  if (!searchTitle.value) return
  loading.value = true
  error.value = null
  try {
    const res = await bangumiApi.searchBangumi(searchTitle.value, page.value, pageSize)
    if (reset) {
      animeList.value = res.data
    } else {
      animeList.value = [...animeList.value, ...res.data]
    }
    total.value = res.total || 0
    hasMore.value = animeList.value.length < (res.total || 0)
  } catch (e: any) {
    error.value = e.message || '搜索失败'
  } finally {
    loading.value = false
  }
}

const handleLoadMore = () => {
  if (loading.value || !hasMore.value) return
  page.value++
  fetchSearch()
}

const handleRetry = () => {
  fetchSearch(true)
}

// 监听路由变化（如从其他页面跳转带title参数）
watch(() => route.query.title, (newTitle) => {
  searchTitle.value = newTitle as string || ''
  page.value = 1
  fetchSearch(true)
})

onMounted(() => {
  if (searchTitle.value) {
    fetchSearch(true)
  }
})
</script>

<template>
  <div class="search-container">
    <section class="search-header">
      <h2 class="search-title">搜索结果：<span class="keyword">{{ searchTitle }}</span></h2>
    </section>
    <AnimeGrid
      :animeList="animeList"
      :loading="loading"
      :error="error"
      :hasMore="hasMore"
      :title="`搜索结果`"
      :apiBaseUrl="apiBaseUrl"
      :total="total"
      @loadMore="handleLoadMore"
      @retry="handleRetry"
    />
  </div>
</template>

<style scoped>
.search-container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px;
  width: 100%;
}
.search-header {
  margin-bottom: 24px;
}
.search-title {
  font-size: 22px;
  font-weight: bold;
  color: var(--text-color);
}
.keyword {
  color: var(--primary-color);
  margin-left: 8px;
}
</style> 