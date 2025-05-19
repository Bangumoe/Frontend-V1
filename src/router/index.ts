import { createRouter, createWebHistory } from 'vue-router'
import { authApi } from '@/api/auth'
import HomeView from '../views/HomeView.vue'
import AboutView from "@/views/AboutView.vue";
import AnimeList from "@/views/AnimeList.vue";
import LoginView from "@/views/LoginView.vue";
import RegisterView from "@/views/RegisterView.vue";
import UserProfile from "@/views/UserProfile.vue";
import RankingView from "@/views/RankingView.vue";
import BangumiPlayer from "@/views/BangumiPlayer.vue";
import PlayerViewV2 from "@/views/PlayerView-V2.vue";
import { useBetaStore } from '@/stores/beta'
import SearchView from "@/views/SearchView.vue";

var title = '咪次元~Bangumoe！';
let shouldUpdateTitle = true;

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '首页' + '   |   ' + title }
  },
  {
    path: '/about',
    name: 'about',
    component: AboutView,
    meta: { title: '关于我们' + '   |   ' + title }
  },
  {
    path: '/anime',
    name: 'anime',
    component: AnimeList,
    meta: { title: '番剧列表' + '   |   ' + title  }
  },
  {
    path: '/anime/year/:year',
    name: 'anime-detail',
    component: AnimeList,
    meta: { title: '番剧详情' + '   |   ' + title   }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: '登录' + '   |   ' + title }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { title: '注册' + '   |   ' + title  }
  },
  {
    path: '/user/profile',
    name: 'user-profile',
    component: UserProfile,
    meta: { title: '用户中心' + '   |   ' + title  }
  },
  {
    path: '/torrent-test',
    name: 'TorrentTest',
    component: () => import('@/views/TorrentTest.vue'),
    meta: { title: 'BT测试' + '   |   ' + title }
  },
  {
    path: '/rankings',
    name: 'rankings',
    component: RankingView,
    meta: { title: '番剧排行榜' + '   |   ' + title }
  },
  {
    path: '/bangumi/:id', // :id 将是番剧的ID
    name: 'BangumiPlayer',
    component: () => import('@/views/BangumiPlayer.vue'),
    meta: { title: '番剧播放' + '   |   ' + title }
  },
  {
    path: '/v2/bangumi/:id',
    name: 'PlayerView-V2',
    component: () => import('@/views/PlayerView-V2.vue'),
    meta: { title: '番剧播放V2' + '   |   ' + title  }
  },
  {
    path: '/no-beta-access',
    name: 'NoBetaAccess',
    component: () => import('@/views/NoBetaAccess.vue')
  },
  {
    path: '/search',
    name: 'search',
    component: SearchView,
    meta: { title: '搜索结果   |   咪次元~Bangumoe！' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  // 检查是否是直接访问（不是通过点击链接）
  const isDirectAccess = !from.name;
  
  // 如果不是直接访问，则在新标签页中打开
  if (!isDirectAccess) {
    shouldUpdateTitle = false; // 阻止标题更新
    window.open(to.fullPath, '_blank');
    next(false); // 阻止当前导航
    return;
  } else {
    shouldUpdateTitle = true; // 允许标题更新
  }

  console.log(`Navigating to: ${to.path}`)
  const betaStore = useBetaStore()
  const { isBetaMode, isAllowed } = await betaStore.checkBetaStatus()
  console.log(`Beta Mode (from checkStatus return): ${isBetaMode}, Is Allowed (from checkStatus return): ${isAllowed}`)

  // **优先处理内测模式下对注册页的访问**
  if (isBetaMode && to.path === '/register') {
    console.log('Beta mode active, restricting register access.')
    next({ path: '/login', query: { message: 'beta_register_forbidden' } })
    return
  }

  // 内测模式且无资格，且目标不是无资格页面或登录页，则重定向
  if (isBetaMode && !isAllowed && to.path !== '/no-beta-access' && to.path !== '/login') {
     console.log('Beta mode active and not allowed, redirecting to no-beta-access.')
    next('/no-beta-access')
    return
  }

  // 如果目标是无资格页面，但内测模式关闭或用户有资格，则跳回首页
  if (to.path === '/no-beta-access' && (!isBetaMode || isAllowed)) {
     console.log('Beta mode inactive or allowed, redirecting from no-beta-access.')
    next('/')
    return
  }

  // 现有的认证逻辑
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const tokenExists = authApi.isAuthenticated(); // 快速检查 token 是否存在

  if (requiresAuth) {
    if (tokenExists) {
      const isTokenValid = await authApi.checkToken(); // 验证 token 有效性
      if (isTokenValid) {
        next(); // Token 有效，继续导航
      } else {
        // Token 无效或已过期.
        // authApi.checkToken() 内部的 handleTokenExpiration 应该已经开始处理重定向。
        // 我们需要取消当前的导航，以允许 handleTokenExpiration 中的 router.replace 生效。
        console.log('Router guard: Token invalid after check, cancelling navigation.');
        next(false); 
      }
    } else {
      // Token 不存在，按统一逻辑处理，它会重定向到登录页
      console.log('Router guard: Token does not exist, handling expiration.');
      authApi.handleTokenExpiration(); 
      next(false); // 取消当前导航，让 handleTokenExpiration 中的重定先生效
    }
  } else {
    // 对于不需要认证的路由 (e.g., /login, /register, /about)
    // 如果用户已认证 (token 存在且有效) 且尝试访问登录/注册页，则重定向到首页
    // 注意：内测模式下注册页访问已在前面处理
    if ((to.name === 'login' || to.name === 'register') && tokenExists) {
        const isTokenValid = await authApi.checkToken();
        if (isTokenValid) {
            console.log('Router guard: Authenticated user trying to access login/register, redirecting to home.');
            next({ path: '/' });
        } else {
            // Token 存在但无效，允许访问登录/注册页 (因为 handleTokenExpiration 应该已被 checkToken 调用)
            console.log('Router guard: User with invalid token trying to access login/register, allowing.');
            next();
        }
    } else {
      next(); //不需要认证，或者已认证用户访问非登录/注册的公开页面
    }
  }
});

// 恢复 afterEach 守卫，确保标题只在 afterEach 里更新
router.afterEach((to) => {
  if (shouldUpdateTitle) {
    if (to.meta && to.meta.title) {
      document.title = `${to.meta.title}`;
    } else {
      document.title = title;
    }
  }
});

export default router