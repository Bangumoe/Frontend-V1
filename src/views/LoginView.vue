<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = '请填写用户名和密码'
    return
  }

  try {
    loading.value = true
    errorMsg.value = ''
    console.log('正在登录...')
    
    const response = await authApi.login({
      username: username.value,
      password: password.value
    })
    
    console.log('登录响应:', response)
    
    if (response.success && response.token) {
      console.log('登录成功 (token handled by authApi.login)，准备跳转...')
      
      // 获取重定向地址
      const redirect = route.query.redirect as string
      // 使用 replace 而不是 push，这样用户不能回退到登录页
      await router.replace(redirect || '/')
    } else {
      errorMsg.value = response.message || '登录失败，请检查用户名和密码'
    }
  } catch (error) {
    console.error('登录错误:', error)
    errorMsg.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 在组件挂载后检查查询参数
onMounted(() => {
  if (route.query.message === 'beta_register_forbidden') {
    ElMessage({
      message: '当前为内测模式，不允许注册',
      type: 'warning',
      duration: 3000 // 3秒后自动关闭
    })
    // 移除查询参数，避免刷新后重复提示
    router.replace({ query: { ...route.query, message: undefined } })
  }
})
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="title">登录</h2>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="form-footer">
          还没有账号？
          <router-link to="/register" class="register-link">立即注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--background-color);
}

.login-box {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.title {
  text-align: center;
  margin-bottom: 24px;
  color: var(--text-color);
  font-size: 24px;
  font-weight: bold;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: var(--text-color);
  font-size: 14px;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(251, 114, 153, 0.1);
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  text-align: center;
}

.submit-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background-color: #ff86aa;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-color);
}

.register-link {
  color: var(--primary-color);
  text-decoration: none;
  margin-left: 4px;
}

.register-link:hover {
  text-decoration: underline;
}
</style>