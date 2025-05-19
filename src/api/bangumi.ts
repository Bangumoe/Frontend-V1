import { apiRequest } from './config'

interface Bangumi {
  ID: number
  official_title: string
  year: string
  season: number
  poster_link: string
  view_count: number
  favorite_count: number
  rating_avg: number
  rating_count: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  total?: number
}

export const bangumiApi = {
  // 获取所有番剧，支持分页
  getAllBangumi: async (page = 1, pageSize = 24): Promise<ApiResponse<Bangumi[]>> => {
    return await apiRequest.get(`/api/v1/bangumi?page=${page}&page_size=${pageSize}`)
  },

  // 获取指定年份的番剧
  getBangumiByYear: async (page = 1, pageSize = 24, year: string): Promise<ApiResponse<Bangumi[]>> => {
    return await apiRequest.get(`/api/v1/bangumi/year/${year}?page=${page}&page_size=${pageSize}`)
  },

  // 获取所有年份列表
  getBangumiYears: async (): Promise<ApiResponse<string[]>> => {
    return await apiRequest.get('/api/v1/bangumi/years')
  },

  // 获取番剧详情
  getBangumiDetail: async (id: number): Promise<ApiResponse<Bangumi>> => {
    return await apiRequest.get(`/api/v1/bangumi/${id}`)
  },

  // 获取番剧统计信息
  getBangumiStats: async (id: number): Promise<ApiResponse<any>> => {
    return await apiRequest.get(`/api/v1/bangumi/${id}/stats`)
  },

  // 获取番剧排名，支持分页
  getBangumiRankings: async (page = 1, pageSize = 10): Promise<ApiResponse<Bangumi[]>> => {
    return await apiRequest.get(`/api/v1/bangumi/stats/rankings?page=${page}&page_size=${pageSize}`)
  },

  // 搜索番剧，支持title关键词和分页
  searchBangumi: async (title: string, page = 1, pageSize = 24): Promise<ApiResponse<Bangumi[]>> => {
    return await apiRequest.get(`/api/v1/bangumi/search?title=${encodeURIComponent(title)}&page=${page}&page_size=${pageSize}`)
  }
}