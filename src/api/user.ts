import { API_BASE_URL, handleResponse, handleError } from './config'

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  password: string
  email: string
  nickname: string
}

interface UserInfo {
  id: number
  username: string
  nickname: string
  email: string
  avatar: string
  created_at: string
}

export const login = async (data: LoginRequest): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse<string>(response)
  } catch (error) {
    return handleError(error, '')
  }
}

export const register = async (data: RegisterRequest): Promise<UserInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse<UserInfo>(response)
  } catch (error) {
    return handleError(error, null)
  }
}

export const getUserInfo = async (): Promise<UserInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/user/info`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    return handleResponse<UserInfo>(response)
  } catch (error) {
    return handleError(error, null)
  }
} 