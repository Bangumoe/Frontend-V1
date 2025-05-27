import request from '@/utils/request'
import { API_BASE_URL } from '@/api/config'

export const getBetaStatus = () => {
  return request({
    url: `${API_BASE_URL}/api/v1/beta/status`,
    method: 'get'
  })
} 