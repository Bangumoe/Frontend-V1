import request from '@/utils/request'

export const getBetaStatus = () => {
  return request({
    url: '/api/v1/beta/status',
    method: 'get'
  })
}

export const getUserInfo = () => {
  return request({
    url: '/api/v1/user/info',
    method: 'get'
  })
} 