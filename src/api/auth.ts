import { API_BASE_URL } from './config'
import router from '@/router'
import { ref, readonly } from 'vue'

// 内部响应式状态，从 localStorage 初始化
const _isAuthenticated = ref(!!localStorage.getItem('token'))

interface LoginData {
  username: string
  password: string
}

interface RegisterData extends LoginData {
  email: string
  confirmPassword: string
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
}

export const authApi = {
  // 提供一个响应式的只读状态供外部使用
  isAuthenticatedReactive: readonly(_isAuthenticated),

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      console.log('发送登录请求:', `${API_BASE_URL}/api/v1/login`)
      const response = await fetch(`${API_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      console.log('登录响应结果:', result)

      if (!response.ok) {
        throw new Error(result.message || '登录失败')
      }

      if (result.token) { // 确保后端返回了token
        localStorage.setItem('token', result.token)
        _isAuthenticated.value = true // 更新响应式状态
      } else {
        // 如果后端没有返回token，也应该视为登录失败的一种情况
        console.error('登录成功但未收到Token')
        throw new Error('登录成功但未收到Token')
      }

      return {
        success: true,
        token: result.token,
        user: result.user,
        message: '登录成功'
      }
    } catch (error) {
      console.error('登录错误:', error)
      _isAuthenticated.value = false // 登录失败，确保状态为 false
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误'
      }
    }
  },
  
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
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
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        if (_isAuthenticated.value) _isAuthenticated.value = false // 同步状态
        throw new Error('未登录')
      }
      // 如果 _isAuthenticated 是 false 但 localStorage 有 token（不太可能，但为了健壮性）
      if (!_isAuthenticated.value) _isAuthenticated.value = true

      const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // localStorage.removeItem('token') // handleTokenExpiration会做
          authApi.handleTokenExpiration() // 调用统一处理，它会更新 _isAuthenticated
        }
        throw new Error('获取用户信息失败')
      }

      const result = await response.json()
      return result.data
    } catch (error: any) {
      console.error('获取用户信息错误:', error)
      throw new Error(error.message || '获取用户信息失败')
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    _isAuthenticated.value = false // 更新响应式状态
    // Pinia store 清理等逻辑（如果需要）
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
    const token = localStorage.getItem('token')
    if (!token) {
      if (_isAuthenticated.value) _isAuthenticated.value = false // 同步状态
      return false
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/check`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token check failed (401), handling expiration.')
          authApi.handleTokenExpiration() // 会调用 logout, 更新 _isAuthenticated
        } else {
          // 其他错误，例如服务器问题，不一定意味着token无效。
          // 但如果之前认为是认证的，现在检查失败，可能需要重新评估。
          // 暂时不改变 _isAuthenticated，依赖调用者和后续流程。
        }
        return false
      }
      // Token 有效
      if (!_isAuthenticated.value) _isAuthenticated.value = true // 如果之前是false，现在更新为true
      return true
    } catch (error) {
      console.error('Token 检查失败 (catch block): ', error)
      // 网络错误，不直接判断token无效，但如果依赖此检查进行认证，则返回false
      // 也不改变 _isAuthenticated 的状态，因为可能是临时网络问题
      return false
    }
  },

  handleTokenExpiration: () => {
    const currentPath = router.currentRoute.value.fullPath
    const currentRouteName = router.currentRoute.value.name

    console.log('Handling token expiration. Current path:', currentPath)
    authApi.logout()

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
  }
}

// 应用启动时，确保 _isAuthenticated 与 localStorage 同步一次
// （虽然 ref 初始化时已经做了，这里是双重保障或明确意图）
// _isAuthenticated.value = !!localStorage.getItem('token');
// 注释掉，因为 ref 初始化时已经执行了。