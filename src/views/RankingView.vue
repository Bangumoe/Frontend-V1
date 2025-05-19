<template>
  <div class="ranking-view">
    <h1 class="page-title">番剧综合排行榜</h1>

    <div v-if="isLoading" class="loading-state">
      <p>正在加载排行榜数据...</p>
      <!-- 可以添加一个加载动画 -->
    </div>

    <div v-if="error" class="error-state">
      <p class="error-message">加载失败：{{ error }}</p>
      <button @click="fetchRankings">重试</button>
    </div>

    <div v-if="!isLoading && !error && rankings.length === 0" class="empty-state">
      <p>暂无番剧排名数据。</p>
    </div>

    <div v-if="!isLoading && !error && rankings.length > 0" class="ranking-list-container">
      <ul class="ranking-list">
        <li v-for="(bangumi, index) in rankings" :key="bangumi.ID" class="ranking-item">
          <div class="rank-number">#{{ index + 1 }}</div>
          <div class="poster" :ref="el => { if (el) posterRefs[index] = el as HTMLElement }">
            <img :src="dynamicPosterUrls[bangumi.ID] || getPosterUrl(bangumi.poster_link)" :alt="bangumi.official_title" />
          </div>
          <div class="info">
            <h2 class="title">{{ bangumi.official_title }}</h2>
            <p class="meta">{{ bangumi.year }} / {{ getSeasonText(bangumi.season) }}</p>
            <div class="stats">
              <span title="播放量" class="stat-item">
                <play theme="filled" fill="#333"/> {{ bangumi.view_count }}
              </span>
              <span title="收藏数" class="stat-item">
                <Like /> {{ bangumi.favorite_count }}
              </span>
              <span title="平均评分" class="stat-item">
                <Star /> {{ bangumi.rating_avg > 0 ? bangumi.rating_avg.toFixed(1) : '暂无评分' }}
                <span v-if="bangumi.rating_count > 0" class="rating-count">({{ bangumi.rating_count }}人评)</span>
              </span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue'
import { bangumiApi } from '@/api/bangumi'
import { Play, Like, Star } from '@icon-park/vue-next';

// 定义与API返回一致的番剧类型
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

const rankings = ref<Bangumi[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const posterRefs = ref<HTMLElement[]>([]);
const dynamicPosterUrls = reactive<{ [key: number]: string }>({});

const fetchRankings = async () => {
  isLoading.value = true
  error.value = null
  try {
    // 传递较大 pageSize，确保获取全部数据
    const response = await bangumiApi.getBangumiRankings(1, 1000)
    if (response.code === 200 && response.data) {
      rankings.value = response.data
      // Wait for DOM update before calculating sizes
      nextTick(() => {
        updateDynamicPosterUrls();
      });
    } else {
      throw new Error(response.message || '获取排名数据失败')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    isLoading.value = false
  }
}

const getPosterUrl = (posterLink: string) => {
  if (!posterLink) return '';

  // Check if the posterLink is already a full URL
  if (posterLink.startsWith('http://') || posterLink.startsWith('https://')) {
    // Return the URL as is, without adding size/format parameters here
    return posterLink;
  }

  // 移除可能存在的前导反斜杠或斜杠，并确保路径分隔符为 '/'
  const cleanedPosterLink = posterLink.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
  
  // 使用 Vite 环境变量 VITE_API_BASE_URL
  // 用户需要在 .env 文件中定义此变量, e.g., VITE_API_BASE_URL=http://localhost:8081
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (viteApiBaseUrl) {
    // 确保基础URL和相对路径之间只有一个斜杠
    const base = viteApiBaseUrl.endsWith('/') ? viteApiBaseUrl.slice(0, -1) : viteApiBaseUrl;
    // Return the base URL + cleaned path, without size/format parameters
    return `${base}/${cleanedPosterLink}`;
  } else {
    // 如果 VITE_API_BASE_URL 未定义或为空，则记录警告并回退到根相对路径。
    // 这可能导致图片在开发中无法加载，除非 /uploads/* 路径也被代理。
    console.warn(
      'VITE_API_BASE_URL is not defined or is empty. Image URLs are being constructed as root-relative paths (e.g., "/uploads/..."). ' +
      'Please ensure VITE_API_BASE_URL is set in your .env file (e.g., VITE_API_BASE_URL=http://your-api-domain.com) ' +
      'for images to load correctly, especially if the API and images are on a different domain/port than the frontend.'
    );
    // Return the root-relative path, without size/format parameters
    return `/${cleanedPosterLink}`;
  }
};

const updateDynamicPosterUrls = () => {
  rankings.value.forEach((bangumi, index) => {
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

const getSeasonText = (season: number) => {
  switch (season) {
    case 1: return '第1季'
    case 2: return '第2季'
    case 3: return '第3季'
    case 4: return '第4季'
    default: return `第${season}季`
  }
}

onMounted(() => {
  fetchRankings()
})
</script>

<style lang="scss" scoped>
.ranking-view {
  padding: 2rem;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;

  .page-title {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #2c3e50;
  }

  .loading-state, .error-state, .empty-state {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: #7f8c8d;

    .error-message {
      color: #e74c3c;
      margin-bottom: 1rem;
    }

    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      color: white;
      background-color: #3498db;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s ease;

      &:hover {
        background-color: #2980b9;
      }
    }
  }

  .ranking-list-container {
    max-width: 900px;
    margin: 0 auto;
  }

  .ranking-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .ranking-item {
    display: flex;
    align-items: flex-start; // 改为flex-start以处理不同高度内容
    background-color: #fff;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    padding: 1.5rem;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }

    .rank-number {
      font-size: 1.8rem;
      font-weight: bold;
      color: #3498db;
      margin-right: 1.5rem;
      min-width: 50px; // 保证排名数字宽度
      text-align: center;
      align-self: center; // 让排名数字垂直居中
    }

    .poster {
      width: 100px;
      height: 150px; // 固定高度，保持图片比例
      margin-right: 1.5rem;
      flex-shrink: 0; // 防止图片被压缩

      img {
        width: 100%;
        height: 100%;
        object-fit: cover; // 裁剪以适应容器，保持比例
        border-radius: 4px;
        background-color: #ecf0f1; // 图片加载时的占位背景色
      }
    }

    .info {
      display: flex;
      flex-direction: column;
      flex-grow: 1; // 占据剩余空间

      .title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
        line-height: 1.3;
      }

      .meta {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 0.8rem;
      }

      .stats {
        display: flex;
        flex-wrap: wrap; // 允许换行
        gap: 0.5rem 1rem; // 行间距和列间距
        font-size: 0.9rem;
        color: #555;

        .stat-item {
          display: flex;
          align-items: center;
          
          .rating-count {
            margin-left: 0.3rem;
            font-size: 0.8rem;
            color: #95a5a6;
          }
        }
      }
    }
  }
}

// Font Awesome Icons (确保已在项目中全局引入或按需引入)
// 如果没有全局引入，可能需要在这里 @import 或在 main.ts 中配置
// @import '@fortawesome/fontawesome-free/css/all.min.css'; // 示例：如果通过css引入

// 响应式调整
@media (max-width: 768px) {
  .ranking-view {
    padding: 1rem;
  }
  .page-title {
    font-size: 2rem;
  }
  .ranking-item {
    padding: 1rem;
    flex-direction: column; // 在小屏幕上垂直排列
    align-items: center; // 居中对齐

    .rank-number {
      margin-right: 0;
      margin-bottom: 0.5rem; // 和图片间距
      align-self: center;
    }
    .poster {
      width: 120px; // 可以适当增大
      height: 180px;
      margin-right: 0;
      margin-bottom: 1rem;
    }
    .info {
      align-items: center; // 文本信息也居中
      text-align: center;

      .title {
        font-size: 1.3rem;
      }
      .stats {
        justify-content: center; // 统计数据居中
      }
    }
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.8rem;
  }
  .info {
    .title {
      font-size: 1.2rem;
    }
    .stats {
      font-size: 0.8rem;
      .stat-item {
        // In the original code, there was a nested i tag selector here.
        // Since FontAwesomeIcon component is used, direct i tag styling is not applicable.
        // Styling for FontAwesomeIcon itself can be done via its class or direct props.
      }
    }
  }
}
</style>