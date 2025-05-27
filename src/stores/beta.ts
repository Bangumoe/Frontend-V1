import { defineStore } from 'pinia'
import { getBetaStatus } from '@/api/beta' // 移除了 getBetaUserInfo
import { authApi } from '@/api/auth' // 引入 authApi 用于检查 token 和获取用户信息
import axios from 'axios'

export const useBetaStore = defineStore('beta', {
  state: () => ({
    isBetaMode: false,
    isAllowed: false, // 在内测模式下，用户是否有权限访问
    hasChecked: false
  }),
  
  actions: {
    async checkBetaStatus() {
      // If status has already been checked and state populated, return the stored values.
      if (this.hasChecked) {
        console.log('[BetaStore] checkBetaStatus: Already checked, returning stored state.');
        return {
          isBetaMode: this.isBetaMode,
          isAllowed: this.isAllowed,
        };
      }

      console.log('[BetaStore] checkBetaStatus: Performing initial check...'); // Log changed for clarity
      let currentIsBetaMode = false;
      let currentIsAllowed = false;

      try {
        console.log('Fetching beta status...')
        const betaRes = await getBetaStatus()
        console.log('Beta API Response Data:', betaRes.data)
        currentIsBetaMode = betaRes.data.is_beta_mode === true
      } catch (error) {
        console.error('获取内测状态失败:', error)
        // 如果获取内测状态失败，则认为不是内测模式，允许所有用户访问
        currentIsBetaMode = false;
        currentIsAllowed = true; // 非内测模式，默认允许访问
      }
      
      // 只有在内测模式开启时，才需要检查用户的内测权限
      if (currentIsBetaMode) {
        const token = authApi.getToken();
        if (token) { // 用户已登录
          try {
            console.log('Fetching user info for beta check...')
            const userInfo = await authApi.getUserInfo() // 调用 authApi.getUserInfo()
            console.log('User Info for Beta Check:', userInfo)
            // 从完整的用户信息中检查 is_allowed
            currentIsAllowed = userInfo?.is_allowed === true
          } catch (error) {
            console.error('获取用户信息以检查内测权限失败:', error)
            currentIsAllowed = false;
          }
        } else { // 用户未登录，在内测模式下直接视为无权限
          currentIsAllowed = false;
        }
      } else {
        // 非内测模式，所有用户都允许访问
        currentIsAllowed = true;
      }
      
      this.isBetaMode = currentIsBetaMode
      this.isAllowed = currentIsAllowed
      this.hasChecked = true // Set hasChecked only after all async operations and state assignments

      console.log('Store State after update:', { isBetaMode: this.isBetaMode, isAllowed: this.isAllowed })

      return { 
        isBetaMode: this.isBetaMode,
        isAllowed: this.isAllowed
      }
    }
  }
}) 