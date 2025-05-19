<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Carousel from '@/components/Carousel.vue'
import HomePopular from '@/components/HomePopular.vue'
import { bangumiApi } from '@/api/bangumi'
import axios from 'axios'

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

onMounted(() => {
  fetchCarousels()
  fetchYears()
})
</script>

<template>
  <div class="home-container">
    <!-- 轮播图区域 -->
    <section class="carousel-section">
      <Carousel :items="carouselItems" />
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
</style>
