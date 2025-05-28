<script setup lang="ts">
import { ref, onMounted, watch, nextTick, reactive, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { API_BASE_URL } from '@/api/config';
import { authApi } from '@/api/auth';
import { Edit, Camera } from '@icon-park/vue-next';

interface UserInfo {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  created_at: string;
  following_count: number;
  followers_count: number;
  email?: string;
}

interface Bangumi {
  id: number;
  title: string;
  cover: string;
  description: string;
  year: number;
  season: string;
  status: string;
  favorite_at: string;
}

interface History extends Bangumi {
  episode: number;
  history_id: number;
  history_time: string;
}

interface ResultResponse<T> {
  data: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    list: T[];
  }
}

const userInfo = ref<UserInfo | null>(null);
const favoritesList = ref<Bangumi[]>([]);
const loading = ref(false);
const loadingD = ref(false)
const historyList = ref<History[]>([]);
const errorMsg = ref('');
const pagination = ref({
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0
});

const paginationD = ref({
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0
});
const route = useRoute();

// 添加动态海报URL的响应式对象
const posterUrls = reactive<{ [key: number]: string }>({});
const posterRefs = ref<{ [key: number]: HTMLElement | null }>({});

import type { ComponentPublicInstance } from 'vue';

// Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const setPosterRef = (el: Element | ComponentPublicInstance | null, bangumi: Bangumi) => {
  if (el && el instanceof HTMLElement) {
    posterRefs.value[bangumi.id] = el as HTMLElement;
    // Remove immediate update to prevent excessive processing during render
    // updatePosterUrl(bangumi);
  }
};

// 更新单个海报的 URL
const updatePosterUrl = (bangumi: Bangumi) => {
  const el = posterRefs.value[bangumi.id];
  if (el && el instanceof HTMLElement) {
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const baseUrl = getPosterUrl(bangumi.cover);
    if (baseUrl) {
      posterUrls[bangumi.id] = `${baseUrl}?width=${width}&height=${height}&format=webp`;
    }
  }
};

// 更新所有海报的 URL
const updatePosterUrls = () => {
  if (favoritesList.value.length === 0) return;
  
  nextTick(() => {
    favoritesList.value.forEach((bangumi) => {
      updatePosterUrl(bangumi);
    });
  });
};

/**
 * 更新历史记录中的海报URL
 * 
 * 如果历史记录列表为空则直接返回，否则在下一个tick中批量更新所有条目的海报URL。
 * 该函数主要处理用户空间页面的历史观看记录海报加载优化。
 */
const updatePosterUrlsD = () => {
  if (historyList.value.length === 0) return;

  /**
   * 在DOM更新后执行海报URL更新操作
   * 遍历历史记录列表并逐个更新海报URL
   */
  nextTick(() => {
    historyList.value.forEach((bangumi) => {
      updatePosterUrl(bangumi);
    });
  });
};

// 修改 getPosterUrl 方法
const getPosterUrl = (cover: string) => {
  if (!cover) return '/default-poster.png';
  if (/^https?:\/\//.test(cover)) return cover;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const cleanPath = cover.replace(/^\/+/, '');
  return `${baseUrl}/api/v1/images/${cleanPath}`;
};

// 监听窗口大小变化
const debouncedUpdatePosterUrls = debounce(updatePosterUrls, 300); // 300ms debounce
const handleResize = () => {
  // updatePosterUrls(); // 直接调用改为调用debounce后的版本
  debouncedUpdatePosterUrls();
};

const fetchUserInfo = async () => {
  try {
    const userInfoData = await authApi.getUserInfo();
    if (userInfoData) {
      userInfo.value = {
        id: userInfoData.id,
        username: userInfoData.username,
        avatar: userInfoData.avatar && userInfoData.avatar.startsWith('http')
          ? userInfoData.avatar
          : userInfoData.avatar ? `${import.meta.env.VITE_API_BASE_URL || ''}${userInfoData.avatar.startsWith('/') ? '' : '/'}${userInfoData.avatar}` : '',
        bio: '',
        created_at: userInfoData.created_at,
        following_count: 0,
        followers_count: 0,
        email: userInfoData.email || ''
      };
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
};

const fetchFavorites = async () => {
  loading.value = true;
  try {
    const token = authApi.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/user/favorites?page=${pagination.value.page}&page_size=${pagination.value.pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const result: ResultResponse<Bangumi> = await response.json();
    
    if (result.data) {
      favoritesList.value = result.data.list;
      pagination.value.total = result.data.total;
      pagination.value.page = result.data.page;
      pagination.value.pageSize = result.data.page_size;
      pagination.value.totalPages = result.data.total_pages;
    }
  } catch (error) {
    errorMsg.value = '获取收藏列表失败';
    console.error('获取收藏列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  pagination.value.page = page;
  fetchFavorites();
};
const handlePageChangeD = (page: number) => {
  paginationD.value.page = page;
  fetchPlayHistory();
};

const fetchPlayHistory = async () => {
  loadingD.value = true;
  try {
    const token = authApi.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/history/play_history?page=${paginationD.value.page}&page_size=${paginationD.value.pageSize}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const result : ResultResponse<History> = await response.json();

    if (result.data) {
      historyList.value = result.data.list;
      paginationD.value.total = result.data.total;
      paginationD.value.page = result.data.page;
      paginationD.value.pageSize = result.data.page_size;
      paginationD.value.totalPages = result.data.total_pages;
    }
  } catch (error) {
    errorMsg.value = '获取历史记录失败';
    console.error('获取历史记录失败:', error);
  } finally {
    loadingD.value = false;
  }
};
const formatDateToYYYYMMDD = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const inputDate = new Date(date);
  const inputDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());

  const hours = String(inputDate.getHours()).padStart(2, '0');
  const minutes = String(inputDate.getMinutes()).padStart(2, '0');
  const timePart = `${hours}:${minutes}`;

  if (inputDay.getTime() === today.getTime()) {
    return `今天 ${timePart}`;
  } else if (inputDay.getTime() === yesterday.getTime()) {
    return `昨天 ${timePart}`;
  } else if (inputDate.getFullYear() === now.getFullYear()) {
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    return `${month}-${day} ${timePart}`;
  } else {
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} ${timePart}`;
  }
}

onMounted(() => {
  fetchUserInfo();
  fetchFavorites();
  fetchPlayHistory();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  // 清理对象以防止内存泄漏
  Object.keys(posterUrls).forEach((key) => {
    delete posterUrls[parseInt(key)];
  });
  posterRefs.value = {};
});

// 监听收藏列表变化
watch(favoritesList, () => {
  // 使用防抖动来防止多次快速更新
  debouncedUpdatePosterUrls();
}, { deep: false }); // 只观察数组本身，而不观察其内容

watch(historyList, () => {
  // 创建updatePosterUrlsD的防抖动版本
  const debouncedUpdatePosterUrlsD = debounce(updatePosterUrlsD, 300);
  debouncedUpdatePosterUrlsD();
}, { deep: false }); // 只观察数组本身，而不观察其内容

// 添加编辑相关的状态
const isEditing = ref(false);
const avatarFile = ref<File | null>(null);
const avatarPreview = ref('');

const editForm = ref({
  email: '',
  old_password: '',
  new_password: '',
  confirm_password: ''
});

// 处理头像加载错误
const handleAvatarError = () => {
  if (userInfo.value) {
    userInfo.value.avatar = '/default-avatar.png';
  }
};

const handleAvatarChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    avatarFile.value = input.files[0];
    avatarPreview.value = URL.createObjectURL(input.files[0]);
  }
};

const startEditing = () => {
  editForm.value.email = userInfo.value?.email || '';
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  editForm.value = {
    email: '',
    old_password: '',
    new_password: '',
    confirm_password: ''
  };
  avatarFile.value = null;
  avatarPreview.value = '';
};

const handleEditSubmit = async () => {
  try {
    loading.value = true;
    errorMsg.value = '';

    // 验证新密码
    if (editForm.value.new_password) {
      if (!editForm.value.old_password) {
        errorMsg.value = '请输入旧密码';
        return;
      }
      if (editForm.value.new_password !== editForm.value.confirm_password) {
        errorMsg.value = '两次输入的新密码不一致';
        return;
      }
    }

    const response = await authApi.updateUserInfo({
      email: editForm.value.email,
      avatar: avatarFile.value || undefined,
      old_password: editForm.value.old_password || undefined,
      new_password: editForm.value.new_password || undefined
    });

    if (response.success) {
      await fetchUserInfo();
      isEditing.value = false;
      cancelEditing();
    } else {
      errorMsg.value = response.message || '更新失败';
    }
  } catch (error) {
    console.error('更新用户信息错误:', error);
    errorMsg.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="user-space">
    <!-- 个人信息卡片 -->
    <div class="user-info-card user-info-flex">
      <div class="user-avatar">
        <img 
          :src="avatarPreview || userInfo?.avatar" 
          :alt="userInfo?.username" 
          @error="handleAvatarError"
        >
      </div>
      <div class="user-info-main">
        <div class="user-header-row">
          <h1 class="username">{{ userInfo?.username }}</h1>
          <button class="edit-profile-btn" @click="startEditing">
            <Edit theme="outline" size="16" />
            <span>编辑资料</span>
          </button>
        </div>
        <p class="user-email">{{ userInfo?.email }}</p>
        <p class="bio">{{ userInfo?.bio || '这个人很懒，什么都没写~' }}</p>
        <div class="user-stats-flex">
          <div class="stat-item">
            <span class="stat-value">{{ userInfo?.following_count || 0 }}</span>
            <span class="stat-label">关注</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ pagination.total }}</span>
            <span class="stat-label">收藏</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏番剧列表 -->
    <div class="favorites-section">
      <h2 class="section-title">我的收藏</h2>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="page-status">
        <div class="loading-spinner"></div>
        <p>少女祈祷中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errorMsg" class="page-status error">
        <p>{{ errorMsg }}</p>
        <button class="retry-btn" @click="fetchFavorites">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="favoritesList.length === 0" class="page-status empty">
        <p>Σ( ° △ °|||)︴ 还没有收藏任何番剧哦~</p>
      </div>

      <!-- 正常状态 -->
      <div v-else class="favorites-grid">
        <div v-for="bangumi in favoritesList" :key="bangumi.id" class="bangumi-card">
          <router-link :to="`/v2/bangumi/${bangumi.id}`" class="bangumi-link" target="_blank">
            <div class="bangumi-cover" :ref="el => setPosterRef(el, bangumi)">
              <img
                :src="posterUrls[bangumi.id] || '/default-poster.png'"
                :alt="bangumi.title"
                @error="(e: Event) => (e.target as HTMLImageElement).src = '/default-poster.png'"
              />
              <div class="bangumi-hover-info">
                <div class="hover-content">
                  <span class="hover-title">{{ bangumi.title }}</span>
                  <span class="hover-meta">{{ bangumi.year }}年 {{ bangumi.season }}</span>
                </div>
              </div>
            </div>
            <div class="bangumi-info">
              <h3 class="bangumi-title">{{ bangumi.title }}</h3>
              <p class="bangumi-meta">
                {{ bangumi.year }}年 {{ bangumi.season }}
              </p>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 分页控件 -->
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button 
          :disabled="pagination.page <= 1"
          @click="handlePageChange(pagination.page - 1)"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">
          {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <button 
          :disabled="pagination.page >= pagination.totalPages"
          @click="handlePageChange(pagination.page + 1)"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 历史记录列表 -->
    <div class="favorites-section margin-top-16">
      <h2 class="section-title">历史记录</h2>

      <!-- 加载状态 -->
      <div v-if="loadingD" class="page-status">
        <div class="loading-spinner"></div>
        <p>少女祈祷中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errorMsg" class="page-status error">
        <p>{{ errorMsg }}</p>
        <button class="retry-btn" @click="fetchPlayHistory">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="historyList.length === 0" class="page-status empty">
        <p>Σ( ° △ °|||)︴ 还没有播放过任何番剧哦~</p>
      </div>

      <!-- 正常状态 -->
      <div v-else class="favorites-grid">
        <div v-for="bangumi in historyList" :key="bangumi.id" class="bangumi-card">
          <router-link :to="`/v2/bangumi/${bangumi.id}?episode=${bangumi.episode}`" target="_blank" class="bangumi-link">
            <div class="bangumi-cover" :ref="el => setPosterRef(el, bangumi)">
              <img :src="posterUrls[bangumi.id] || '/default-poster.png'" :alt="bangumi.title"
                @error="(e: Event) => (e.target as HTMLImageElement).src = '/default-poster.png'" />
              <div class="bangumi-hover-info">
                <div class="hover-content">
                  <span class="hover-title">{{ bangumi.title }}</span>
                  <span class="hover-meta">第 {{ bangumi.episode }} 集</span>
                  <span class="hover-meta"> 上次观看时间 </span>
                  <span class="hover-meta"> {{ formatDateToYYYYMMDD(bangumi.history_time) }} </span>
                </div>
              </div>
            </div>
            <div class="bangumi-info">
              <h3 class="bangumi-title">{{ bangumi.title }}</h3>
              <p class="bangumi-meta">
                {{ bangumi.year }}年 {{ bangumi.season }}
              </p>
              <p class="bangumi-meta">
                第 {{ bangumi.episode }} 集
              </p>
              <p class="bangumi-meta">
                上次观看时间 {{ formatDateToYYYYMMDD(bangumi.history_time) }}
              </p>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 分页控件 -->
      <div v-if="paginationD.totalPages > 1" class="pagination">
        <button :disabled="paginationD.page <= 1" @click="handlePageChangeD(paginationD.page - 1)" class="page-btn">
          上一页
        </button>
        <span class="page-info">
          {{ paginationD.page }} / {{ paginationD.totalPages }}
        </span>
        <button :disabled="paginationD.page >= paginationD.totalPages" @click="handlePageChangeD(paginationD.page + 1)"
          class="page-btn">
          下一页
        </button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Transition name="modal">
      <div v-if="isEditing" class="modal-overlay" @click="cancelEditing">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>编辑个人资料</h3>
            <button class="close-btn" @click="cancelEditing">×</button>
          </div>
          <form @submit.prevent="handleEditSubmit" class="edit-form">
            <div class="avatar-edit-section">
              <div class="avatar-preview avatar-hover-upload" @click="() => $refs.avatarInput && ($refs.avatarInput as HTMLInputElement).click()">
                <img 
                  v-if="avatarPreview || userInfo?.avatar"
                  :src="avatarPreview || userInfo?.avatar" 
                  :alt="userInfo?.username"
                  class="preview-image"
                  @error="handleAvatarError"
                />
                <div v-else class="preview-image no-avatar">
                  {{ userInfo?.username ? userInfo.username.charAt(0).toUpperCase() : '?' }}
                </div>
                <div class="avatar-hover-mask">
                  <Camera theme="outline" size="20" fill="#fff" style="margin-bottom:4px;"/>
                  <span>更换头像</span>
                </div>
              </div>
              <input
                ref="avatarInput"
                id="avatar-input"
                type="file"
                accept="image/*"
                class="avatar-input"
                @change="handleAvatarChange"
                style="display:none;"
              />
              <div class="avatar-file-info">
                <span class="file-label">{{ avatarFile?.name || '未选择文件' }}</span>
              </div>
            </div>
            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model="editForm.email"
                type="email"
                required
              />
            </div>
            <div class="form-group">
              <label for="old-password">旧密码</label>
              <input
                id="old-password"
                v-model="editForm.old_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-group">
              <label for="new-password">新密码</label>
              <input
                id="new-password"
                v-model="editForm.new_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-group">
              <label for="confirm-password">确认新密码</label>
              <input
                id="confirm-password"
                v-model="editForm.confirm_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-actions">
              <button type="submit" class="save-btn">保存</button>
              <button type="button" class="cancel-btn" @click="cancelEditing">取消</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.margin-top-16 {
  margin-top: 16px;
}
.user-space {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.user-info-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 32px;
  margin-bottom: 32px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.user-info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.user-info-flex {
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 40px 48px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.08);
  margin-bottom: 32px;
}

.user-avatar {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.10);
  border: 4px solid #fff;
  flex-shrink: 0;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.user-info-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.user-header-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 6px;
}

.username {
  font-size: 28px;
  font-weight: bold;
  color: #18191c;
  margin: 0;
  letter-spacing: 0.5px;
}

.edit-profile-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(251, 114, 153, 0.12);
  border: none;
  border-radius: 6px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}
.edit-profile-btn:hover {
  background: var(--primary-color);
  color: #fff;
  transform: translateY(-1px);
}

.user-email {
  color: #888;
  font-size: 14px;
  margin-bottom: 2px;
  word-break: break-all;
}

.bio {
  color: #61666d;
  margin: 0 0 18px 0;
  font-size: 15px;
  line-height: 1.6;
}

.user-stats-flex {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f7f7fa;
  border-radius: 12px;
  min-width: 70px;
  padding: 16px 18px 10px 18px;
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.06);
  transition: box-shadow 0.2s;
}
.stat-item:hover {
  box-shadow: 0 4px 16px rgba(251, 114, 153, 0.13);
}
.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #18191c;
  margin-bottom: 2px;
}
.stat-label {
  font-size: 13px;
  color: #888;
}

.favorites-section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 24px;
  color: #18191c;
  position: relative;
  padding-left: 16px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: var(--primary-color, #fb7299);
  border-radius: 2px;
}

.page-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #61666d;
  font-size: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-color, #fb7299);
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

.page-status.error {
  color: #f25d8e;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: var(--primary-color, #fb7299);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #ff86aa;
  transform: translateY(-1px);
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.bangumi-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.bangumi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.bangumi-link {
  text-decoration: none;
  color: inherit;
}

.bangumi-cover {
  position: relative;
  padding-top: 140%;
  width: 100%;
  overflow: hidden;
}

.bangumi-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.bangumi-hover-info {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.bangumi-card:hover .bangumi-hover-info {
  opacity: 1;
}

.hover-content {
  text-align: center;
  color: white;
  padding: 16px;
}

.hover-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.hover-meta {
  display: block;
  font-size: 14px;
  opacity: 0.8;
}

.bangumi-info {
  padding: 12px;
}

.bangumi-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 4px;
  color: #18191c;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.bangumi-meta {
  font-size: 12px;
  color: #61666d;
  margin: 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.page-btn {
  padding: 8px 20px;
  border: 1px solid #e3e5e7;
  border-radius: 6px;
  background: #fff;
  color: #18191c;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  background: #f4f4f5;
  border-color: #d4d6d9;
  transform: translateY(-1px);
}

.page-info {
  color: #61666d;
  font-size: 14px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: var(--text-color);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #666;
}

.edit-form {
  padding: 24px;
}

.avatar-edit-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 12px;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #f0f0f0;
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.avatar-hover-upload:hover,
.avatar-hover-upload:focus {
  box-shadow: 0 8px 24px rgba(251, 114, 153, 0.15);
}

.avatar-hover-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.45);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  transition: opacity 0.2s;
  border-radius: 50%;
}

.avatar-hover-upload:hover .avatar-hover-mask,
.avatar-hover-upload:focus .avatar-hover-mask {
  opacity: 1;
  pointer-events: auto;
}

.avatar-file-info {
  margin-top: 2px;
  font-size: 13px;
  color: #999;
  text-align: center;
  min-height: 18px;
}

.file-label {
  font-size: 13px;
  color: #999;
  font-style: italic;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
}

.save-btn:hover {
  background-color: #ff86aa;
  transform: translateY(-1px);
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e8e8e8;
  transform: translateY(-1px);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
  transform: scale(1);
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .edit-form {
    padding: 20px;
  }

  .avatar-preview {
    width: 100px;
    height: 100px;
  }
}

@media (max-width: 768px) {
  .user-info-flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 24px 12px;
  }
  .user-avatar {
    width: 90px;
    height: 90px;
  }
  .username {
    font-size: 22px;
  }
  .user-info-main {
    width: 100%;
  }
  .user-stats-flex {
    gap: 14px;
  }
  .stat-item {
    min-width: 60px;
    padding: 12px 10px 8px 10px;
  }
}
</style>