import { createRouter, createWebHistory } from 'vue-router'
import { authApi } from '@/api/auth'
import { useBetaStore } from '@/stores/beta'

var title = '咪次元~Bangumoe！';
let shouldUpdateTitle = true;

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页' + '   |   ' + title }
  },
  {
    path: '/anime',
    name: 'anime',
    component: () => import('@/views/AnimeList.vue'),
    meta: { title: '番剧列表' + '   |   ' + title  }
  },
  {
    path: '/anime/year/:year',
    name: 'anime-detail',
    component: () => import('@/views/AnimeList.vue'),
    meta: { title: '番剧详情' + '   |   ' + title   }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' + '   |   ' + title }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册' + '   |   ' + title  }
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
    component: () => import('@/views/RankingView.vue'),
    meta: { title: '番剧排行榜' + '   |   ' + title }
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
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索结果   |   咪次元~Bangumoe！' }
  },
  {
    path: '/space',
    name: 'user-space',
    component: () => import('@/views/UserSpace.vue'),
    meta: { 
      title: '个人空间' + '   |   ' + title,
      requiresAuth: true 
    }
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicy',
    component: () => import('@/views/PrivacyPolicy.vue'),
    meta: { title: '隐私政策   |   咪次元~Bangumoe！' }
  },
  {
    path: '/terms-of-service',
    name: 'TermsOfService',
    component: () => import('@/views/TermsOfService.vue'),
    meta: { title: '服务条款   |   咪次元~Bangumoe！' }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  shouldUpdateTitle = true;
  console.log(`Navigating from ${from.path} to: ${to.path}`);

  const betaStore = useBetaStore();
  const { isBetaMode, isAllowed: userHasBetaAccess } = await betaStore.checkBetaStatus();
  console.log(`Beta Mode: ${isBetaMode}, User Beta Access: ${userHasBetaAccess}`);

  const tokenExists = authApi.getToken(); 
  let isTokenValid = false;
  if (tokenExists) {
      isTokenValid = await authApi.checkToken(); 
      console.log(`Token validation result: ${isTokenValid}`);
  }

  // 1. Beta Mode: Register page restriction (REMOVED/MODIFIED)
  // No longer redirecting from /register in beta mode, as invitation code will be used.
  // if (isBetaMode && to.path === '/register') {
  //   console.log('Router: Beta mode, /register access forbidden. Redirecting to /login.');
  //   return next({ path: '/login', query: { message: 'beta_register_forbidden' } });
  // }

  // 2. Beta Mode: Access to /no-beta-access page
  if (to.path === '/no-beta-access') {
    if (!isBetaMode || userHasBetaAccess) {
      console.log('Router: Not in beta or user has access. Redirecting from /no-beta-access to /.');
      return next('/');
    }
    console.log('Router: Beta mode, no access. Allowing navigation to /no-beta-access.');
    return next(); 
  }

  // 3. Beta Mode: General restriction for users without access (excluding /register now)
  const betaWhitelist = ['/login', '/register', '/privacy-policy', '/terms-of-service'];
  if (isBetaMode && !userHasBetaAccess && !betaWhitelist.includes(to.path)) { 
    console.log('Router: Beta mode, no access (and not in whitelist). Redirecting to /no-beta-access.');
    return next('/no-beta-access');
  }

  // 4. Authentication for routes that require it
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  if (requiresAuth) {
    if (isTokenValid) {
      console.log('Router: Route requires auth, token is valid. Proceeding.');
      return next();
    } else {
      console.log('Router: Route requires auth, token invalid or missing. Redirecting to /login via handleTokenExpiration.');
      authApi.handleTokenExpiration(); 
      return next(false); 
    }
  }

  // 5. Handling authenticated users trying to access /login or /register
  // If user is valid and on /register, let them be (they might be viewing it for other reasons, or beta mode logic handles it)
  if (to.path === '/login' && isTokenValid) { 
    console.log('Router: Authenticated user trying to access login page. Redirecting to /.');
    return next('/');
  }
  
  // 6. Default: If none of the above, allow navigation
  console.log('Router: No specific rules matched or auth not required. Proceeding.');
  next();
});

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