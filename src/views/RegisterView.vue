<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { useBetaStore } from '@/stores/beta'

const router = useRouter()
const betaStore = useBetaStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const invitationCode = ref('')
const errorMsg = ref('')
const loading = ref(false)

const isBetaModeActive = computed(() => betaStore.isBetaMode)

onMounted(async () => {
  await betaStore.checkBetaStatus()
})

const validateForm = () => {
  if (!username.value || !password.value || !confirmPassword.value || !email.value) {
    errorMsg.value = '请填写所有必填项'
    return false
  }

  if (isBetaModeActive.value && !invitationCode.value) {
    errorMsg.value = '内测模式下，邀请码为必填项'
    return false
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return false
  }

  if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email.value)) {
    errorMsg.value = '请输入有效的邮箱地址'
    return false
  }

  return true
}

const handleRegister = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    errorMsg.value = ''

    const formData = new FormData()
    formData.append('username', username.value)
    formData.append('password', password.value)
    formData.append('email', email.value)
    formData.append('role', 'regular')

    if (isBetaModeActive.value && invitationCode.value) {
      formData.append('invitation_code', invitationCode.value)
    }

    const response = await authApi.register(formData)
    
    if (response.success) {
      console.log('Registration successful, user:', response.user)
      router.push('/login')
    } else {
      errorMsg.value = response.message || '注册失败'
    }
  } catch (error: any) {
    errorMsg.value = error.message || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-box">
      <h2 class="title">注册</h2>
      
      <form @submit.prevent="handleRegister" class="register-form">
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
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
            required
          />
        </div>

        <div v-if="isBetaModeActive" class="form-group">
          <label for="invitationCode">邀请码</label>
          <input
            id="invitationCode"
            v-model="invitationCode"
            type="text"
            placeholder="请输入邀请码"
            :required="isBetaModeActive"
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

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
          />
        </div>

        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '注册中...' : '注册' }}
        </button>

        <div class="form-footer">
          <router-link to="/login" class="login-link">
            已有账号？立即登录
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--background-color);
}

.register-box {
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

.register-form {
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

.login-link {
  color: var(--primary-color);
  text-decoration: none;
  margin-left: 4px;
}

.login-link:hover {
  text-decoration: underline;
}
</style> 