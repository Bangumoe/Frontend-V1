<script setup lang="ts">
import { ref, onMounted, nextTick, reactive, onUnmounted, watch } from 'vue'
import Carousel from '@/components/Carousel.vue'
import HomePopular from '@/components/HomePopular.vue'
import { bangumiApi } from '@/api/bangumi'
import axios from 'axios'
import { authApi } from '@/api/auth'
import { useRouter } from 'vue-router'
import StatusHint from '@/components/StatusHint.vue'

// 轮播图数据
const carouselItems = ref<{
  id: number
  title: string
  subtitle: string
  image: string
  link: string
}[]>([])

// 获取轮播图数据
const fetchCarousels = async () => {
  try {
    const response = await axios.get('/api/v1/carousels')
    carouselItems.value = response.data.map((item: any) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      image: item.image_url.startsWith('http') 
        ? item.image_url  
        : `${import.meta.env.VITE_API_BASE_URL}${item.image_url}`,
      link: item.link,
      is_active: item.is_active
    }))
  } catch (error) {
    console.error('获取轮播图数据失败:', error)
  }
}

const years = ref<string[]>([])
const currentYear = new Date().getFullYear().toString()

// 获取年份列表
const fetchYears = async () => {
  try {
    const response = await bangumiApi.getBangumiYears()
    years.value = response.data
  } catch (error) {
    console.error('获取年份列表失败:', error)
  }
}

// 我追的番剧（收藏）
const myBangumis = ref<any[]>([])
const myLoading = ref(false)
const myError = ref('')
const router = useRouter()
// 用对象存储每个 bangumi.id 的 poster 容器 ref
const myPosterRefs = ref<{ [key: number]: HTMLElement | null }>({})
// 用 reactive 对象存储每个 bangumi.id 的动态图片 URL
const myPosterUrls = reactive<{ [key: number]: string }>({})

const fetchMyBangumis = async () => {
  myLoading.value = true
  myError.value = ''
  myBangumis.value = []
  try {
    const token = authApi.getToken && authApi.getToken()
    if (!token) {
      myError.value = '请先登录后查看';
      return
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
    const res = await fetch(`${API_BASE_URL}/api/v1/user/favorites?page=1&page_size=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    const list = data.data?.list
    if (Array.isArray(list)) {
      myBangumis.value = list
      myError.value = ''
      nextTick(() => updateAllMyPosterUrls())
    } else {
      myError.value = data.message || '获取收藏失败'
    }
  } catch (e) {
    myError.value = '网络错误，请稍后重试'
  } finally {
    myLoading.value = false
  }
}

const getMyPosterUrl = (cover: string) => {
  if (!cover) return '/default-poster.png';
  if (/^https?:\/\//.test(cover)) return cover;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const cleanPath = cover.replace(/^\/+/, '');
  return `${baseUrl}/api/v1/images/${cleanPath}`;
}

import type { ComponentPublicInstance } from 'vue';

const setMyPosterRef = (el: Element | ComponentPublicInstance | null, bangumi: any) => {
  if (el && el instanceof HTMLElement) {
    myPosterRefs.value[bangumi.id] = el as HTMLElement;
    updateMyPosterUrl(bangumi)
  }
}

const updateMyPosterUrl = (bangumi: any) => {
  const el = myPosterRefs.value[bangumi.id]
  if (el && el instanceof HTMLElement) {
    const width = el.offsetWidth
    const height = el.offsetHeight
    const baseUrl = getMyPosterUrl(bangumi.cover)
    if (baseUrl) {
      myPosterUrls[bangumi.id] = `${baseUrl}?width=${width}&height=${height}&format=webp`
    }
  }
}

const updateAllMyPosterUrls = () => {
  nextTick(() => {
    myBangumis.value.forEach(bangumi => {
      updateMyPosterUrl(bangumi)
    })
  })
}

onMounted(() => {
  fetchCarousels()
  fetchYears()
  fetchMyBangumis()
  window.addEventListener('resize', updateAllMyPosterUrls)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateAllMyPosterUrls)
})

watch(myBangumis, () => {
  nextTick(updateAllMyPosterUrls)
})
</script>

<template>
  <div class="home-container">
    <!-- 轮播图区域 -->
    <section class="carousel-section">
      <Carousel :items="carouselItems" />
    </section>

    <!-- 我追的番剧 -->
    <section class="my-bangumi-section">
      <div class="section-header">
        <h2 class="section-title">我追的番剧</h2>
        <router-link to="/space" class="view-more">全部
          <Right />
        </router-link>
      </div>
      <div v-if="myLoading" class="my-bangumi-status"><StatusHint type="loading" title="加载中..." sub="正在加载我的收藏" /></div>
      <div v-else-if="myError" class="my-bangumi-status"><StatusHint type="empty" :title="myError" /></div>
      <div v-else-if="myBangumis.length === 0" class="my-bangumi-status"><StatusHint type="empty" title="暂无收藏" sub="你还没有追番，快去收藏喜欢的番剧吧~" /></div>
      <div v-else class="my-bangumi-scroll">
        <div class="my-bangumi-list">
          <router-link v-for="bangumi in myBangumis" :key="bangumi.id" :to="`/v2/bangumi/${bangumi.id}`" class="my-bangumi-card bangumi-card">
            <div class="my-bangumi-poster-container bangumi-cover" :ref="el => setMyPosterRef(el, bangumi)">
              <img
                :src="myPosterUrls[bangumi.id] || '/default-poster.png'"
                :alt="bangumi.title"
                class="my-bangumi-poster"
                @error="(e) => { (e.target as HTMLImageElement).src = '/default-poster.png' }"
              />
              <div class="hover-info">
                <button class="play-btn">
                  <play-one theme="filled" size="30" fill="#333"/>
                </button>
              </div>
            </div>
            <div class="bangumi-info">
              <h3 class="title">{{ bangumi.title }}</h3>
              <div class="meta-info">
                <span class="year">{{ bangumi.year }}</span>
                <span class="season">第{{ bangumi.season }}季</span>
              </div>
              <div class="stats">
                <div class="stat-item rating" v-if="bangumi.rating_avg > 0">
                  <Star />
                  <span>{{ bangumi.rating_avg?.toFixed(1) }}</span>
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
          </router-link>
        </div>
      </div>
    </section>

    <!-- 年份浏览 -->
    <section class="years-section">
      <div class="section-header">
        <h2 class="section-title">年份浏览</h2>
        <router-link to="/anime" class="view-more">
          查看更多
          <Right />
        </router-link>
      </div>
      <div class="years-grid">
        <router-link
          v-for="year in years"
          :key="year"
          :to="`/anime/year/${year}`"
          class="year-item"
          :class="{ 'current-year': year === currentYear }"
        >
          <div class="year-content">
            <span class="year-number">{{ year }}</span>
            <Star 
              v-if="year === currentYear" 
              theme="filled" 
              size="16" 
              class="current-icon" 
            />
          </div>
        </router-link>
      </div>
    </section>

    <!-- 热门推荐 -->
    <HomePopular />
  </div>
</template>

<style scoped>
.home-container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 24px;
  width: 100%;
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
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.2);
}

/* 轮播图样式 */
.carousel-section {
  margin: 0 0 32px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

/* 年份浏览样式 */
.years-section {
  margin-bottom: 48px;
  width: 100%;
}

.years-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  width: 100%;
}

.year-item {
  text-decoration: none;
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.year-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.year-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.year-number {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
}

.current-year {
  border-color: var(--primary-color);
  background-color: rgba(251, 114, 153, 0.05);
}

.current-icon {
  color: var(--primary-color);
  font-size: 16px;
}

/* 热门推荐样式 */
.popular-section {
  margin-bottom: 48px;
  width: 100%;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  width: 100%;
}

.anime-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  width: 100%;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.anime-cover-wrapper {
  position: relative;
  padding-top: 140%;
  overflow: hidden;
  width: 100%;
}

.anime-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.anime-hover {
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

.anime-card:hover .anime-hover {
  opacity: 1;
}

.anime-card:hover .anime-cover {
  transform: scale(1.05);
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
  width: 100%;
}

.anime-title {
  font-size: 14px;
  font-weight: normal;
  margin-bottom: 8px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.anime-score {
  color: #ffb800;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.anime-score i {
  font-size: 12px;
}

@media (max-width: 1200px) {
  .home-container {
    padding: 24px 16px;
  }

  .anime-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .home-container {
    padding: 16px;
  }

  .anime-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .section-title {
    font-size: 20px;
  }

  .year-item {
    padding: 16px 8px;
  }

  .year-number {
    font-size: 20px;
  }
}

.my-bangumi-section {
  margin-bottom: 48px;
  width: 100%;
}

.my-bangumi-status {
  min-height: 120px;
}

.my-bangumi-scroll {
  overflow-x: auto;
  width: 100%;
  padding-bottom: 8px;
}

.my-bangumi-list {
  display: flex;
  gap: 24px;
  min-width: 100%;
  padding: 8px 0;
}

.my-bangumi-card.bangumi-card {
  flex: 0 0 200px;
  width: 200px;
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

.my-bangumi-card.bangumi-card:hover {
  transform: translateY(-4px) translateZ(0);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.my-bangumi-poster-container.bangumi-cover {
  position: relative;
  padding-top: 140%;
  overflow: hidden;
  background-color: #f0f0f0;
}

.my-bangumi-poster {
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

.my-bangumi-card.bangumi-card:hover .hover-info {
  opacity: 1;
}

.my-bangumi-card.bangumi-card:hover .my-bangumi-poster {
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

@media (max-width: 768px) {
  .my-bangumi-card.bangumi-card {
    flex: 0 0 140px;
    width: 140px;
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
