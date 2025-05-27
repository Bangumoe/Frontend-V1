import axios from 'axios'
import { API_BASE_URL } from '@/api/config'
import { authApi } from '@/api/auth'

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    console.log('[Request Interceptor] URL:', config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[Request Interceptor] Token found and Authorization header set:', config.headers.Authorization);
    } else {
      console.log('[Request Interceptor] Token not found in localStorage.');
    }
    return config
  },
  error => {
    console.error('[Request Interceptor] Error:', error);
    return Promise.reject(error)
  }
)

// 添加响应拦截器
request.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // 只在非用户信息接口和非beta状态接口时处理 401
      if (!url.includes('/api/v1/user/info') && !url.includes('/api/v1/beta/status')) {
        authApi.handleTokenExpiration()
      }
    }
    return Promise.reject(error)
  }
)

export default request 