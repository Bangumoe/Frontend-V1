import { authApi } from './auth';

export const API_BASE_URL = import.meta.env.PROD ? 'http://localhost:8081' : ''

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  total?: number
}

class ApiRequest {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token')
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers
      })

      // 处理 401 未授权响应
      if (response.status === 401) {
        // 清除 token 和重定向的逻辑已移至 authApi.handleTokenExpiration
        console.warn('API request received 401, calling handleTokenExpiration.');
        authApi.handleTokenExpiration();
        // 抛出错误，让调用方知道请求失败了，并且中断后续处理
        throw new Error('Unauthorized: Token may be invalid or expired.');
      }

      if (!response.ok) {
        // 对于其他非401的错误，尝试从响应体获取错误信息
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<T> = await response.json()
      return data
    } catch (error) {
      // 如果错误是由我们主动抛出的 "Unauthorized..."，它已经被处理（重定向），这里可以不再重复打印
      // 并且，由于 handleTokenExpiration 已经是异步的导航，直接重新抛出错误
      if (!(error instanceof Error && error.message.startsWith('Unauthorized:'))) {
          console.error('API请求失败 (in ApiRequest catch): ', error);
      }
      throw error; // 重新抛出，让上层调用知道，或者被全局错误处理器捕获
    }
  }

  async get<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T>(path: string, body: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async put<T>(path: string, body: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  async delete<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const apiRequest = new ApiRequest(API_BASE_URL)

export const handleResponse = async <T>(response: Response): Promise<T> => {
  const result: ApiResponse<T> = await response.json()
  
  if (result.code === 200) {
    return result.data
  } else {
    throw new Error(result.message)
  }
}

export const handleError = (error: any, defaultValue: any = null) => {
  console.error('API请求失败:', error)
  return defaultValue
}