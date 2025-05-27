import { API_BASE_URL } from './config'
import router from '@/router'
import { ref, readonly } from 'vue'

// 内部响应式状态，从 localStorage 初始化
const _isAuthenticated = ref(!!localStorage.getItem('token'))
// 用户信息缓存
const _userInfoCache = ref<UserInfo | null>(null);
// 进行中的 getUserInfo 请求的 Promise
let _userInfoRequestPromise: Promise<UserInfo | null> | null = null;

interface LoginData {
  username: string
  password: string
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  role: string;
  invitation_code?: string;
  avatar?: File;
}

interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: {
    id: number
    username: string
    email: string
  }
}

interface UserInfo {
  id: number
  username: string
  email: string
  avatar: string
  role: string
  created_at: string
  updated_at: string
  favorite_count: number
  comment_count: number
  is_allowed?: boolean;
}

interface UpdateUserInfoData {
  email?: string
  avatar?: File
  old_password?: string
  new_password?: string
}

interface UpdateUserInfoResponse {
  success: boolean
  message?: string
  data?: UserInfo
}

export const authApi = {
  // 提供一个响应式的只读状态供外部使用
  isAuthenticatedReactive: readonly(_isAuthenticated),
  // 提供一个响应式的只读用户缓存信息供外部使用
  userInfoReactive: readonly(_userInfoCache),

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      console.log('[AuthAPI] Attempting login with:', data.username);
      const response = await fetch(`${API_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      console.log('[AuthAPI] Login response from server:', result);

      if (!response.ok) {
        console.error('[AuthAPI] Login failed. Server response not OK:', response.status, result.message);
        throw new Error(result.message || '登录失败')
      }

      if (result.token) {
        console.log('[AuthAPI] Token received from server:', result.token);
        localStorage.setItem('token', result.token);
        // 验证 token 是否真的存入了 localStorage
        const storedToken = localStorage.getItem('token');
        if (storedToken === result.token) {
          console.log('[AuthAPI] Token successfully stored in localStorage.');
          _isAuthenticated.value = true;
          _userInfoCache.value = result.user || null;
          _userInfoRequestPromise = null; // 清除旧的 promise，新的用户会话
          console.log('[AuthAPI] _isAuthenticated set to true, userInfoCache updated, requestPromise cleared.');
        } else {
          console.error('[AuthAPI] CRITICAL: Failed to store token in localStorage or token mismatch!');
          _isAuthenticated.value = false; // 确保状态正确
          _userInfoCache.value = null;
          _userInfoRequestPromise = null; // 登录失败也清除
          // 可以考虑抛出错误，因为这是一个严重问题
          throw new Error('无法在localStorage中存储认证token');
        }
      } else {
        console.error('[AuthAPI] Login successful but no token received from server.');
        _isAuthenticated.value = false; // 确保状态正确
        _userInfoCache.value = null;
        _userInfoRequestPromise = null; // 登录失败也清除
        throw new Error('登录成功但未收到Token');
      }

      return {
        success: true,
        token: result.token,
        user: result.user,
        message: '登录成功'
      }
    } catch (error) {
      console.error('[AuthAPI] Login error (catch block):', error);
      _isAuthenticated.value = false // 登录失败，确保状态为 false
      _userInfoCache.value = null;
      _userInfoRequestPromise = null; // 登录失败也清除
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误'
      }
    }
  },
  
  register: async (data: FormData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/register`, {
        method: 'POST',
        body: data
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '注册失败')
      }

      return {
        success: true,
        message: '注册成功',
        user: result.user
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误'
      }
    }
  },

  getUserInfo: async (): Promise<UserInfo | null> => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (_isAuthenticated.value) _isAuthenticated.value = false;
      if (_userInfoCache.value) _userInfoCache.value = null;
      _userInfoRequestPromise = null; // Token 不存在，清除 promise
      return null;
    }

    if (_isAuthenticated.value && _userInfoCache.value) {
      console.log('[AuthAPI] getUserInfo: Returning from direct cache.');
      return _userInfoCache.value;
    }

    if (_userInfoRequestPromise) {
      console.log('[AuthAPI] getUserInfo: Waiting for existing in-flight request.');
      return _userInfoRequestPromise;
    }

    console.log('[AuthAPI] getUserInfo: Initiating new user info request.');
    _userInfoRequestPromise = (async () => {
      try {
        const currentToken = localStorage.getItem('token'); // 再次检查 token
        if (!currentToken) {
            console.warn('[AuthAPI] getUserInfo (in-flight): Token disappeared before fetch.');
            if (_isAuthenticated.value) _isAuthenticated.value = false;
            if (_userInfoCache.value) _userInfoCache.value = null;
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
          console.warn(`[AuthAPI] getUserInfo (in-flight): Request failed with status ${response.status}`);
          if (response.status === 401) { // Token 无效
            if (_isAuthenticated.value) _isAuthenticated.value = false;
          }
          _userInfoCache.value = null; 
          return null;
        }

        const result = await response.json();
        if (!result.data) {
          console.warn('[AuthAPI] getUserInfo (in-flight): No data in response, though request was OK.');
          _userInfoCache.value = null; 
          return null;
        }
        
        console.log('[AuthAPI] getUserInfo (in-flight): Fetched and cached user info.');
        if (!_isAuthenticated.value) _isAuthenticated.value = true;
        _userInfoCache.value = result.data;
        return result.data;
      } catch (error) {
        console.error('[AuthAPI] getUserInfo (in-flight) CATCH block error:', error);
        if (_isAuthenticated.value) _isAuthenticated.value = false; 
        _userInfoCache.value = null;
        return null;
      } finally {
        _userInfoRequestPromise = null; // 请求结束后清除 promise
      }
    })();
    return _userInfoRequestPromise;
  },

  logout: () => {
    console.trace('[AuthAPI] logout() called');
    localStorage.removeItem('token');
    _isAuthenticated.value = false;
    _userInfoCache.value = null;
    _userInfoRequestPromise = null; // 登出时清除 promise
  },

  getToken: () => {
    return localStorage.getItem('token')
  },

  isAuthenticated: () => {
    // 这个方法可以保留，用于非响应式上下文的检查，或者作为 _isAuthenticated 的一个备份检查
    // 但主要依赖应该是 _isAuthenticated
    return !!localStorage.getItem('token') // 或者 return _isAuthenticated.value
  },

  checkToken: async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (_isAuthenticated.value) _isAuthenticated.value = false;
      if (_userInfoCache.value) _userInfoCache.value = null;
      return false;
    }

    try {
      console.log('[AuthAPI] checkToken: Performing validation request.');
      const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.warn(`[AuthAPI] checkToken: Validation failed with status ${response.status}`);
        if (response.status === 401) {
          if (_isAuthenticated.value) _isAuthenticated.value = false;
        }
        if (_userInfoCache.value) _userInfoCache.value = null;
        return false;
      }
      
      const result = await response.json();
      console.log('[AuthAPI] checkToken: Validation successful.');
      if (!_isAuthenticated.value) _isAuthenticated.value = true;
      
      if (result.data) {
        _userInfoCache.value = result.data;
        console.log('[AuthAPI] checkToken: User info cache updated from validation.');
      } else {
        console.warn('[AuthAPI] checkToken: Token valid, but no user data in response.');
        _userInfoCache.value = null;
      }
      return true;
    } catch (error) {
      console.error('[AuthAPI] checkToken CATCH block error:', error);
      if (_isAuthenticated.value) _isAuthenticated.value = false;
      if (_userInfoCache.value) _userInfoCache.value = null;
      return false;
    }
  },

  handleTokenExpiration: () => {
    console.trace('[AuthAPI] handleTokenExpiration() called');
    const currentPath = router.currentRoute.value.fullPath
    const currentRouteName = router.currentRoute.value.name

    console.log('Handling token expiration. Current path:', currentPath)
    authApi.logout() // logout 内部会清除 token 和 _userInfoCache

    if (currentRouteName !== 'login' && currentRouteName !== 'register') {
      router.replace({
        path: '/login',
        query: (currentPath && currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register') 
               ? { redirect: currentPath } 
               : undefined
      })
    } else if (currentRouteName === 'register') {
      console.log('Token expired while on register page. No auto-redirect to login.')
    }
  },

  updateUserInfo: async (data: UpdateUserInfoData): Promise<UpdateUserInfoResponse> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未登录')
      }

      const formData = new FormData()
      if (data.email) formData.append('email', data.email)
      if (data.avatar) formData.append('avatar', data.avatar)
      if (data.old_password) formData.append('old_password', data.old_password)
      if (data.new_password) formData.append('new_password', data.new_password)

      const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '更新用户信息失败')
      }

      return {
        success: true,
        message: '更新成功',
        data: result.data
      }
    } catch (error) {
      console.error('更新用户信息错误:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误'
      }
    }
  },
}

// 应用启动时，确保 _isAuthenticated 与 localStorage 同步一次
// （虽然 ref 初始化时已经做了，这里是双重保障或明确意图）
// _isAuthenticated.value = !!localStorage.getItem('token');
// 注释掉，因为 ref 初始化时已经执行了。
// 应用启动时，可以尝试根据 token 状态预加载用户信息
// if (_isAuthenticated.value && !_userInfoCache.value) {
//   authApi.getUserInfo(); 
// }
// 注释掉：让 getUserInfo 在首次被调用时按需加载，避免应用启动时不必要的请求。
// login 成功后会填充，checkToken 成功后也会填充。