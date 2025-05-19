<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' // Removed

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')

const user = ref({
  username: '',
  email: '',
  avatar: '',
  role: '',
  created_at: ''
})

const handleLogout = async () => {
  await authApi.logout()
  router.push('/login')  
}

// 处理头像加载错误
const handleAvatarError = () => {
  if (user.value) {
    console.log('头像加载失败')
    user.value.avatar = ''
  }
}

const fetchUserProfile = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    
    const userInfo = await authApi.getUserInfo()
    if (userInfo) {
      // 处理头像URL
      const avatarUrl = userInfo.avatar?.startsWith('http')
        ? userInfo.avatar
        : userInfo.avatar
          ? `${import.meta.env.VITE_API_BASE_URL || ''}${userInfo.avatar.startsWith('/') ? '' : '/'}${userInfo.avatar}`
          : ''

      user.value = {
        ...userInfo,
        avatar: avatarUrl
      }
    } else {
      errorMsg.value = '获取用户信息失败'
    }
  } catch (error) {
    console.error('获取用户信息错误:', error)
    errorMsg.value = '获取用户信息失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<template>
  <div class="profile-container">
    <div class="profile-box">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      <template v-else>
        <div class="profile-header">
          <div class="avatar-wrapper">
            <img 
              v-if="user.avatar"
              :src="user.avatar" 
              :alt="user.username"
              class="avatar"
              @error="handleAvatarError"
            />
            <div v-else class="avatar no-avatar">
              {{ user.username ? user.username.charAt(0).toUpperCase() : '?' }}
            </div>
            <button class="change-avatar-btn">
              <Camera theme="outline" size="16" fill="white"/>
            </button>
          </div>
          <h2 class="username">{{ user.username }}</h2>
          <p class="email">{{ user.email }}</p>
          <p class="role">角色: {{ user.role }}</p>
          <p class="join-date">加入时间: {{ new Date(user.created_at).toLocaleDateString() }}</p>
        </div>

        <div class="profile-actions">
          <button class="edit-btn">
            <Edit theme="outline" size="16" /> 
            编辑资料
          </button>
          <button class="logout-btn" @click="handleLogout">
            <Logout theme="outline" size="16" />
            退出登录
          </button>
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">收藏番剧</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">观看历史</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">评论数</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px;
  background-color: var(--background-color);
}

.profile-box {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
}

.loading {
  text-align: center;
  color: var(--text-color);
  font-size: 16px;
  padding: 20px;
}

.error-message {
  color: #ff4d4f;
  text-align: center;
  padding: 20px;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f0f0f0; /* 添加背景色 */
}

.no-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  color: white;
  font-size: 36px;
  font-weight: bold;
}

.change-avatar-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white; /* This will be inherited by the icon if fill is currentColor */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.change-avatar-btn:hover {
  background-color: #ff86aa;
}

.username {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 8px;
}

.email {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.role {
  font-size: 14px;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.join-date {
  font-size: 12px;
  color: #999;
}

.profile-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.edit-btn,
.logout-btn {
  flex: 1;
  padding: 12px;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-btn {
  background-color: var(--primary-color);
  color: white; /* Icon fill will be white if using currentColor */
}

.edit-btn:hover {
  background-color: #ff86aa;
}

.logout-btn {
  background-color: #f5f5f5;
  color: #666; /* Icon fill will be #666 if using currentColor */
}

.logout-btn:hover {
  background-color: #e8e8e8;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: center;
}

.stat-item {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

@media (max-width: 480px) {
  .profile-container {
    padding: 20px 16px;
  }

  .profile-box {
    padding: 24px;
  }

  .avatar {
    width: 100px;
    height: 100px;
  }

  .username {
    font-size: 20px;
  }

  .profile-actions {
    flex-direction: column;
  }

  .profile-stats {
    grid-template-columns: repeat(2, 1fr); /* Adjusted for better display on small screens */
  }
}
</style>