<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { API_BASE_URL } from '@/api/config'; // 假设 API_BASE_URL 在这里
import { authApi } from '@/api/auth'; // 假设 authApi 有 getToken 方法
// import type { UserInfo } from '@/api/auth'; // 引入 UserInfo 类型
import { useRoute, useRouter } from 'vue-router'; // 用于处理路由参数和跳转
import StatusHint from '@/components/StatusHint.vue'; // 假设 StatusHint 组件存在

// 定义番剧和收藏列表的类型
interface Bangumi {
  id: number;
  title: string;
  cover: string;
  description: string;
  year: number;
  season: string;
  status: string;
  favorite_at: string; // 收藏时间
}

interface FavoritesApiResponse {
  code: number;
  message: string;
  data: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    list: Bangumi[];
  };
}

const favoritesList = ref<Bangumi[]>([]);
const loading = ref(false);
const errorMsg = ref('');
const pagination = ref({
  total: 0,
  page: 1,
  pageSize: 10, // 默认每页数量
  totalPages: 0,
});

const route = useRoute();
const router = useRouter();

// 从路由查询参数中获取当前页码
watch(() => route.query.page, (newPage) => {
  const page = parseInt(newPage as string || '1', 10);
  if (!isNaN(page) && page > 0 && page !== pagination.value.page) {
    pagination.value.page = page;
    fetchFavorites();
  } else if (isNaN(page) || page <= 0) {
    // 如果页码无效，重定向到第一页
     router.replace({ query: { ...route.query, page: '1' } });
  }
}, { immediate: true }); // 立即执行一次以读取初始页码


const fetchFavorites = async () => {
  loading.value = true;
  errorMsg.value = '';
  favoritesList.value = []; // 清空列表

  const token = authApi.getToken();
  if (!token) {
    errorMsg.value = '用户未登录';
    loading.value = false;
    // 可以选择重定向到登录页
    // router.push('/login');
    return;
  }

  try {
    const apiUrl = `${API_BASE_URL}/api/v1/user/favorites?page=${pagination.value.page}&page_size=${pagination.value.pageSize}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result: FavoritesApiResponse = await response.json();

    if (response.ok && result.code === 0) { // 假设 code 0 表示成功
      favoritesList.value = result.data.list;
      pagination.value.total = result.data.total;
      pagination.value.page = result.data.page;
      pagination.value.pageSize = result.data.page_size;
      pagination.value.totalPages = result.data.total_pages;
    } else {
      errorMsg.value = result.message || '获取收藏列表失败';
    }
  } catch (error: any) {
    console.error('获取收藏列表错误:', error);
    errorMsg.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 分页控制
const goToPage = (page: number) => {
  if (page > 0 && page <= pagination.value.totalPages && page !== pagination.value.page) {
    // 通过更新路由查询参数来改变页码，watch 会触发 fetchFavorites
    router.push({ query: { ...route.query, page: page.toString() } });
  }
};

const prevPage = () => {
  goToPage(pagination.value.page - 1);
};

const nextPage = () => {
  goToPage(pagination.value.page + 1);
};

// 组件挂载时获取第一页数据 (如果路由没有指定页码)
// watch immediate: true 已经处理了初始加载

// 处理封面图片加载错误
const handleCoverError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = 'path/to/default-cover.png'; // 替换为您的默认封面图路径
  target.onerror = null; // 防止无限循环
};

</script>

<template>
  <div class="user-favorites-container">
    <StatusHint v-if="loading" type="loading" title="少女祈祷中..." sub="正在加载收藏列表，请稍候" />
    <StatusHint v-else-if="errorMsg" type="error" :title="'加载失败'" :sub="errorMsg">
      <button @click="fetchFavorites">重试</button>
    </StatusHint>
    <StatusHint v-else-if="favoritesList.length === 0" type="empty" title="暂无收藏" sub="您还没有收藏任何番剧。" />
    <div v-else>
      <ul class="favorites-list">
        <li v-for="bangumi in favoritesList" :key="bangumi.id" class="favorite-item">
          <RouterLink :to="`/bangumi/${bangumi.id}`" class="item-link">
            <img :src="bangumi.cover" :alt="bangumi.title" class="bangumi-cover" @error="handleCoverError"/>
            <div class="item-details">
              <h4 class="bangumi-title">{{ bangumi.title }}</h4>
              <p class="bangumi-description">{{ bangumi.description }}</p>
              <p class="bangumi-meta">
                <span class="year-season">{{ bangumi.year }} {{ bangumi.season }}</span>
                <span class="status">{{ bangumi.status }}</span>
              </p>
              <p class="favorite-date">收藏于: {{ new Date(bangumi.favorite_at).toLocaleDateString() }}</p>
            </div>
          </RouterLink>
        </li>
      </ul>
      <!-- 分页控制 -->
      <div v-if="pagination.totalPages > 1" class="pagination-controls">
        <button :disabled="pagination.page <= 1" @click="prevPage">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
        <button :disabled="pagination.page >= pagination.totalPages" @click="nextPage">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-favorites-container {
  padding: 20px;
}

.loading, .error-message, .empty-message {
  text-align: center;
  padding: 20px;
}

.error-message {
  color: #ff4d4f;
}

.favorites-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* 响应式列 */
}

.favorite-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s ease;
}

.favorite-item:hover {
  transform: translateY(-5px);
}

.item-link {
  display: flex;
  text-decoration: none;
  color: inherit;
}

.bangumi-cover {
  width: 100px; /* 根据需要调整 */
  height: 150px; /* 根据需要调整 */
  object-fit: cover;
  flex-shrink: 0;
}

.item-details {
  padding: 16px;
  flex-grow: 1;
}

.bangumi-title {
  font-size: 18px;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 8px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.bangumi-description {
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* 限制描述行数 */
  -webkit-box-orient: vertical;
}

.bangumi-meta {
  font-size: 12px;
  color: #777;
  margin-bottom: 8px;
}

.year-season {
  margin-right: 10px;
}

.status {
  font-weight: bold;
}

.favorite-date {
  font-size: 12px;
  color: #777;
}

.pagination-controls {
  margin-top: 20px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.pagination-controls button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-controls button:not(:disabled):hover {
  background-color: #f0f0f0;
}

@media (max-width: 768px) {
  .favorites-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .item-link {
    flex-direction: column;
    align-items: center;
  }

  .bangumi-cover {
    width: 100%;
    height: auto;
    max-height: 200px;
  }

  .item-details {
    padding: 12px;
    text-align: center;
  }

  .bangumi-title {
    font-size: 16px;
  }

  .bangumi-description {
     -webkit-line-clamp: 3; /* 移动端可以显示更多行描述 */
  }

  .bangumi-meta, .favorite-date {
    font-size: 11px;
  }

  .pagination-controls {
    flex-wrap: wrap;
  }
}
</style> 