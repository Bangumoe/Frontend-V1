import { defineStore } from 'pinia'
import { getBetaStatus, getUserInfo } from '@/api/beta'
import axios from 'axios' // 引入 axios，用于判断错误类型

export const useBetaStore = defineStore('beta', {
  state: () => ({
    isBetaMode: false,
    isAllowed: false,
    hasChecked: false
  }),
  
  actions: {
    async checkBetaStatus() {
      let isBetaMode = false
      let isAllowed = false
      let betaStatusSuccess = false

      try {
        console.log('Fetching beta status...')
        const betaRes = await getBetaStatus()
        console.log('Beta API Response Data:', betaRes.data)
        isBetaMode = betaRes.data.is_beta_mode === true
        betaStatusSuccess = true
      } catch (error) {
        console.error('获取内测状态失败:', error)
        isBetaMode = false // 获取内测状态失败，默认关闭内测模式相关限制
        betaStatusSuccess = false
      }
      
      try {
        console.log('Fetching user info...')
         // 即使获取内测状态失败，也尝试获取用户信息
        const userRes = await getUserInfo()
        console.log('User API Response Data:', userRes.data)
        isAllowed = userRes.data.data.is_allowed === true
      } catch (error) {
         console.error('获取用户信息失败:', error)
         // 如果是 401 错误，且内测模式开启，才判断为无资格。否则默认允许访问（非内测模式或未登录）。
         if (axios.isAxiosError(error) && error.response?.status === 401) {
            isAllowed = false; // 401 错误，表示未登录或 token 无效，视为无内测资格（在内测模式开启时）
         } else {
            isAllowed = true; // 其他错误，为了不阻断正常流程，默认允许访问（可以根据实际需求调整）
         }
      }
      
      this.isBetaMode = isBetaMode
      this.isAllowed = isAllowed
      this.hasChecked = true

      console.log('Store State after update:', { isBetaMode: this.isBetaMode, isAllowed: this.isAllowed })
      console.log('Returning from checkStatus:', { isBetaMode, isAllowed })

      return { 
        isBetaMode: isBetaMode,
        isAllowed: isAllowed
      }
    }
  }
}) 