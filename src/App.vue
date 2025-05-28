<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import { useBetaStore } from '@/stores/beta'
import BetaNotice from '@/components/BetaNotice.vue'
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' // REMOVED
import { Home, VideoOne, Ranking, Search, User, Logout } from '@icon-park/vue-next';


const router = useRouter()
const route = useRoute()
const showUserMenu = ref(false)
const isAuthenticated = computed(() => authApi.isAuthenticatedReactive.value)
const userInfo = ref<{ username: string; avatar: string } | null>(null)

const hideMenuTimer = ref<number | null>(null);
const menuHideDelay = 200; // ms, 延迟隐藏菜单的时间

const betaStore = useBetaStore()
const showBetaNotice = ref(false)

const openMenu = () => {
  if (hideMenuTimer.value) {
    clearTimeout(hideMenuTimer.value);
    hideMenuTimer.value = null;
  }
  showUserMenu.value = true;
};

const startHideMenuTimer = () => {
  if (hideMenuTimer.value) {
    clearTimeout(hideMenuTimer.value);
  }
  hideMenuTimer.value = window.setTimeout(() => {
    showUserMenu.value = false;
    hideMenuTimer.value = null;
  }, menuHideDelay);
};

// 判断导航项是否激活
const isNavActive = (path: string) => {
  if (path === '/') {
    return route.path === path
  }
  return route.path.startsWith(path)
}

// 监听认证状态变化
watch(isAuthenticated, async (newValue) => {
  console.log('认证状态变化 (App.vue):', newValue)
  if (newValue) {
    await fetchUserInfo()
  } else {
    userInfo.value = null
  }
})

const handleLogout = () => {
  showUserMenu.value = false // 可选：立即关闭菜单
  // userInfo.value = null // authApi.logout() -> isAuthenticated watch 会处理
  authApi.handleTokenExpiration() // 统一处理登出和重定向
}

const fetchUserInfo = async () => {
  try {
    const tokenStillExists = authApi.getToken()
    if (!tokenStillExists) {
      console.warn("fetchUserInfo (App.vue): Token disappeared before fetching. Aborting.")
      userInfo.value = null
      return
    }

    // 如果已经有用户信息且 token 存在，则不需要重新获取
    if (userInfo.value && tokenStillExists) {
      return
    }

    const info = await authApi.getUserInfo()
    if (info) {
      userInfo.value = {
        username: info.username,
        avatar: info.avatar && info.avatar.startsWith('http')
          ? info.avatar
          : info.avatar ? `${import.meta.env.VITE_API_BASE_URL || ''}${info.avatar.startsWith('/') ? '' : '/'}${info.avatar}` : ''
      }
    } else {
      userInfo.value = null
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    userInfo.value = null
  }
}

onMounted(async () => {
  // 只在有 token 时获取用户信息
  if (isAuthenticated.value) {
    await fetchUserInfo()
  }
  const { isBetaMode, isAllowed } = await betaStore.checkBetaStatus()
  if (isBetaMode) {
    showBetaNotice.value = true
  }
})

const searchInput = ref('')
const handleSearchEnter = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && searchInput.value.trim()) {
    router.push({ path: '/search', query: { title: searchInput.value.trim() } })
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-content">
        <div class="left-section">
          <div class="logo">
            <img src="@/assets/logo-1000x1000.png" alt="Bangumoe Logo" />
          </div>
          <nav class="main-nav">
            <RouterLink to="/" :class="['nav-item', { active: isNavActive('/') }]" target="_blank">
              <Home class="nav-icon-park" theme="outline" size="20" :strokeColor="'var(--nav-text-color)'"/>
              <span>首页</span>
            </RouterLink>
            <!--<RouterLink to="/torrent-test" :class="['nav-item', { active: isNavActive('/torrent-test') }]">
              <PlayTwo class="nav-icon-park" theme="outline" size="20" :strokeColor="'var(--nav-text-color)'"/>
              <span>BT播放器</span>
            </RouterLink>-->
            <RouterLink to="/anime" :class="['nav-item', { active: isNavActive('/anime') }]" target="_blank">
              <VideoOne class="nav-icon-park" theme="outline" size="20" :strokeColor="'var(--nav-text-color)'"/>
              <span>番剧</span>
            </RouterLink>
            <RouterLink to="/rankings" :class="['nav-item', { active: isNavActive('/rankings') }]" target="_blank">
              <Ranking class="nav-icon-park" theme="outline" size="20" :strokeColor="'var(--nav-text-color)'"/>
              <span>排行榜</span>
            </RouterLink>
          </nav>
        </div>

        <div class="right-section">
          <div class="search-box">
            <Search theme="outline" size="14" fill="#999" class="search-icon-park"/>
            <input type="text" placeholder="输入以搜索..." class="search-input" v-model="searchInput" @keydown="handleSearchEnter"/>
          </div>
          <template v-if="isAuthenticated">
            <div class="user-menu" @mouseenter="openMenu" @mouseleave="startHideMenuTimer">
              <div class="avatar">
                <img
                  v-if="userInfo?.avatar"
                  :src="userInfo.avatar"
                  :alt="userInfo?.username"
                  class="avatar-img"
                  @error="userInfo && (userInfo.avatar = '')"
                />
                <User v-else theme="outline" size="20" fill="#666"/> 
              </div>
              <div v-show="showUserMenu" class="dropdown-menu" @mouseenter="openMenu" @mouseleave="startHideMenuTimer">
                <RouterLink to="/space" class="menu-item" target="_blank">
                  <User theme="outline" size="16" class="menu-icon-park"/>
                  <span>个人空间</span>
                </RouterLink>
                <button class="menu-item" @click="handleLogout">
                  <Logout theme="outline" size="16" class="menu-icon-park"/>
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <RouterLink to="/login" class="login-btn" target="_blank">登录</RouterLink>
          </template>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <RouterView />
      <BetaNotice v-if="showBetaNotice" />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2024 Bangumoe. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'); */ /* REMOVED */

:root {
  --primary-color: #fb7299;
  --secondary-color: #23ade5;
  --background-color: #f6f7f8;
  --text-color: #333;
  --header-height: 64px;
  --nav-text-color: #505050;
  --border-color: #e5e5e5;
  --max-width: 1200px;
  box-sizing: border-box;
}

html {
  height: 100%; /* Ensure html takes full viewport height */
  overflow-x: hidden; /* Prevent horizontal scroll on html */
  /* Optionally, ensure html also takes full height if body relies on it with height: 100% */
  /* height: 100%; */ 
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  min-height: 100%; /* Change from 100vh to 100% to fill html */
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden; /* Prevent horizontal scroll on body */
  display: flex; /* Make body a flex container */
  flex-direction: column; /* Stack children vertically */
}

.app-container {
  flex: 1; /* Allow .app-container to grow and fill body */
  min-height: 100vh; /* This might be redundant if flex:1 works, but can be kept as a fallback */
  display: flex;
  flex-direction: column;
  width: 100%;
}

.header {
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: var(--header-height);
  width: 100%;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-content {
  /* max-width: var(--max-width); */ /* Removed for full width */
  /* margin: 0 auto; */ /* Removed for full width */
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 50px; /* Retain padding for content spacing */
}

.left-section {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  height: 40px;
  display: flex;
  align-items: center;
}

.logo img {
  height: 100%;
  border-radius: 8px; /* 添加圆角 */
}

.main-nav {
  display: flex;
  gap: 24px;
}

.nav-item {
  color: var(--nav-text-color);
  text-decoration: none;
  font-size: 15px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-icon-park { /* New class for consistent styling if needed, or style directly */
  /* font-size: 14px; */ /* Size is now controlled by prop */
  /* Add any other shared styles for nav icons here, like vertical alignment */
  display: inline-block; /* Helps with alignment */
  vertical-align: middle;
}

.nav-item:hover {
  color: var(--primary-color);
  background-color: rgba(251, 114, 153, 0.05);
}

.nav-item.active {
  color: var(--nav-text-color);
  background-color: rgba(251, 114, 153, 0.15); /* Slightly more opaque light pink */
  font-weight: 500;
  border-radius: 20px; /* More rounded, pill-like */
}

.right-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  width: 240px;
}

.search-icon-park { /* Style for positioning IconPark search icon */
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none; /* So it doesn't interfere with input click */
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  font-size: 14px;
  transition: all 0.3s;
  background-color: #f8f8f8;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background-color: white;
  box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.1);
}

.search-input::placeholder {
  color: #999;
}

.user-menu {
  position: relative;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  border: 2px solid transparent;
}

.avatar:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: var(--text-color);
  text-decoration: none;
  font-size: 14px;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;
}

.menu-icon-park { /* New class for consistent styling if needed */
 /* font-size: 14px; */ /* Size is now controlled by prop */
 /* color: #666; */ /* Fill/strokeColor is now controlled by prop */
  display: inline-block;
  vertical-align: middle;
}

.menu-item:hover {
  background-color: rgba(251, 114, 153, 0.05);
  color: var(--primary-color);
}

.menu-item:hover .menu-icon-park {
  color: var(--primary-color);
}

.login-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-weight: 500;
}

.login-btn:hover {
  background-color: #ff86aa;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(251, 114, 153, 0.2);
}

.main-content {
  flex: 1;
  margin-top: var(--header-height);
  width: 100%;
}

.footer {
  background-color: white;
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-color);
  width: 100%;
}

.footer-content {
  max-width: var(--max-width);
  margin: 0 auto;
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }

  .left-section {
    gap: 16px;
  }

  .main-nav {
    gap: 8px;
  }

  .nav-item {
    padding: 6px 8px;
    font-size: 14px;
  }

  .search-box {
    width: 160px;
  }

  .login-btn {
    padding: 6px 16px;
  }
}
</style>
