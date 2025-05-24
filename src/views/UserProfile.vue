<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' // Removed

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')
const isEditing = ref(false)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')

const user = ref({
  username: '',
  email: '',
  avatar: '',
  role: '',
  created_at: '',
  favorite_count: 0,
  comment_count: 0
})

const editForm = ref({
  email: '',
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const handleLogout = async () => {
  await authApi.logout()
  router.push('/login')  
}

// 处理头像加载错误
const handleAvatarError = () => {
  if (user.value) {
    console.log('头像加载失败')
    user.value.avatar = ''
  }
}

const handleAvatarChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    avatarFile.value = input.files[0]
    avatarPreview.value = URL.createObjectURL(input.files[0])
  }
}

const handleEditSubmit = async () => {
  try {
    loading.value = true
    errorMsg.value = ''

    // 验证新密码
    if (editForm.value.new_password) {
      if (!editForm.value.old_password) {
        errorMsg.value = '请输入旧密码'
        return
      }
      if (editForm.value.new_password !== editForm.value.confirm_password) {
        errorMsg.value = '两次输入的新密码不一致'
        return
      }
    }

    const response = await authApi.updateUserInfo({
      email: editForm.value.email,
      avatar: avatarFile.value || undefined,
      old_password: editForm.value.old_password || undefined,
      new_password: editForm.value.new_password || undefined
    })

    if (response.success) {
      // 更新本地用户信息
      // 直接重新获取最新用户信息以确保数据同步
      await fetchUserProfile()

      isEditing.value = false
      // 清空表单
      editForm.value = {
        email: '',
        old_password: '',
        new_password: '',
        confirm_password: ''
      }
      avatarFile.value = null
      avatarPreview.value = ''
    } else {
      errorMsg.value = response.message || '更新失败'
    }
  } catch (error) {
    console.error('更新用户信息错误:', error)
    errorMsg.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

const startEditing = () => {
  editForm.value.email = user.value.email
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  editForm.value = {
    email: '',
    old_password: '',
    new_password: '',
    confirm_password: ''
  }
  avatarFile.value = null
  avatarPreview.value = ''
}

const fetchUserProfile = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    
    const userInfo = await authApi.getUserInfo()
    if (userInfo) {
      // 处理头像URL
      const avatarUrl = userInfo.avatar?.startsWith('http')
        ? userInfo.avatar
        : userInfo.avatar
          ? `${import.meta.env.VITE_API_BASE_URL || ''}${userInfo.avatar.startsWith('/') ? '' : '/'}${userInfo.avatar}`
          : ''

      user.value = {
        username: userInfo.username || '',
        email: userInfo.email || '',
        avatar: avatarUrl,
        role: userInfo.role || '',
        created_at: userInfo.created_at || '',
        favorite_count: userInfo.favorite_count || 0,
        comment_count: userInfo.comment_count || 0
      }
    } else {
      errorMsg.value = '获取用户信息失败'
    }
  } catch (error) {
    console.error('获取用户信息错误:', error)
    errorMsg.value = '获取用户信息失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<template>
  <div class="profile-container">
    <div class="profile-box">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      <template v-else>
        <div class="profile-header">
          <div class="avatar-wrapper">
            <img 
              v-if="avatarPreview || user.avatar"
              :src="avatarPreview || user.avatar" 
              :alt="user.username"
              class="avatar"
              @error="handleAvatarError"
            />
            <div v-else class="avatar no-avatar">
              {{ user.username ? user.username.charAt(0).toUpperCase() : '?' }}
            </div>
            <button v-if="isEditing" class="change-avatar-btn">
              <label for="avatar-input" class="avatar-input-label">
                <Camera theme="outline" size="16" fill="white"/>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  class="avatar-input"
                  @change="handleAvatarChange"
                />
              </label>
            </button>
          </div>
          <h2 class="username">{{ user.username }}</h2>
          <p class="email">{{ user.email }}</p>
          <p class="role">角色: {{ user.role }}</p>
          <p class="join-date">加入时间: {{ new Date(user.created_at).toLocaleDateString() }}</p>
        </div>

        <div class="profile-actions">
          <button class="edit-btn" @click="startEditing">
            <Edit theme="outline" size="16" /> 
            编辑资料
          </button>
          <button class="logout-btn" @click="handleLogout">
            <Logout theme="outline" size="16" />
            退出登录
          </button>
        </div>

        <!-- 导航和内容区域 -->
        <div class="profile-sections">
          <div class="section-nav">
            <RouterLink to="/user/profile" :class="{ active: $route.path === '/user/profile' }" class="nav-item">概览</RouterLink>
            <RouterLink to="/user/profile/favorites" :class="{ active: $route.path.startsWith('/user/profile/favorites') }" class="nav-item">我的收藏</RouterLink>
            <!-- 可以添加更多导航项 -->
          </div>
          <div class="section-content">
            <RouterView />
          </div>
        </div>

        <!-- 原有的统计数据移动到概览子页面或移除 -->
        <!-- <div class="profile-stats">...</div> -->

      </template>
    </div>

    <!-- 编辑弹窗 -->
    <Transition name="modal">
      <div v-if="isEditing" class="modal-overlay" @click="cancelEditing">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>编辑个人资料</h3>
            <button class="close-btn" @click="cancelEditing">×</button>
          </div>
          <form @submit.prevent="handleEditSubmit" class="edit-form">
            <div class="avatar-edit-section">
              <div class="avatar-preview">
                <img 
                  v-if="avatarPreview || user.avatar"
                  :src="avatarPreview || user.avatar" 
                  :alt="user.username"
                  class="preview-image"
                  @error="handleAvatarError"
                />
                <div v-else class="preview-image no-avatar">
                  {{ user.username ? user.username.charAt(0).toUpperCase() : '?' }}
                </div>
              </div>
              <label for="avatar-input" class="avatar-upload-btn">
                <Camera theme="outline" size="16" fill="#666"/>
                <span>更换头像</span>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  class="avatar-input"
                  @change="handleAvatarChange"
                />
              </label>
            </div>
            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model="editForm.email"
                type="email"
                required
              />
            </div>
            <div class="form-group">
              <label for="old-password">旧密码</label>
              <input
                id="old-password"
                v-model="editForm.old_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-group">
              <label for="new-password">新密码</label>
              <input
                id="new-password"
                v-model="editForm.new_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-group">
              <label for="confirm-password">确认新密码</label>
              <input
                id="confirm-password"
                v-model="editForm.confirm_password"
                type="password"
                placeholder="不修改密码请留空"
              />
            </div>
            <div class="form-actions">
              <button type="submit" class="save-btn">保存</button>
              <button type="button" class="cancel-btn" @click="cancelEditing">取消</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px;
  background-color: var(--background-color);
}

.profile-box {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
}

.loading {
  text-align: center;
  color: var(--text-color);
  font-size: 16px;
  padding: 20px;
}

.error-message {
  color: #ff4d4f;
  text-align: center;
  padding: 20px;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f0f0f0; /* 添加背景色 */
}

.no-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  color: white;
  font-size: 36px;
  font-weight: bold;
}

.change-avatar-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white; /* This will be inherited by the icon if fill is currentColor */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.change-avatar-btn:hover {
  background-color: #ff86aa;
}

.username {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 8px;
}

.email {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.role {
  font-size: 14px;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.join-date {
  font-size: 12px;
  color: #999;
}

.profile-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.edit-btn,
.logout-btn {
  flex: 1;
  padding: 12px;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-btn {
  background-color: var(--primary-color);
  color: white; /* Icon fill will be white if using currentColor */
}

.edit-btn:hover {
  background-color: #ff86aa;
}

.logout-btn {
  background-color: #f5f5f5;
  color: #666; /* Icon fill will be #666 if using currentColor */
}

.logout-btn:hover {
  background-color: #e8e8e8;
}

.profile-sections {
  margin-top: 32px;
}

.section-nav {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 24px;
}

.nav-item {
  padding: 12px 20px;
  text-decoration: none;
  color: #666;
  font-size: 15px;
  transition: color 0.3s, border-bottom-color 0.3s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px; /* 避免边框重叠 */
}

.nav-item:hover {
  color: var(--primary-color);
}

.nav-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: bold;
}

.section-content {
  /* 根据需要调整内边距 */
  padding: 0 0;
}

/* 根据新的布局调整 stats 区域的样式或将其移除 */
.profile-stats {
  /* display: none; */ /* 暂时隐藏或根据需要调整 */
}

.avatar-input {
  display: none;
}

.avatar-input-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.edit-form {
  width: 100%;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
}

.save-btn:hover {
  background-color: #ff86aa;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e8e8e8;
}

@media (max-width: 480px) {
  .profile-container {
    padding: 20px 16px;
  }

  .profile-box {
    padding: 24px;
  }

  .avatar {
    width: 100px;
    height: 100px;
  }

  .username {
    font-size: 20px;
  }

  .profile-actions {
    flex-direction: column;
  }

  .profile-sections {
    margin-top: 20px;
  }

  .section-nav {
    flex-direction: column;
  }

  .nav-item {
    padding: 12px 16px;
  }

  .edit-form {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.edit-form {
  padding: 24px;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 弹窗内容动画 */
.modal-content {
  animation: modal-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes modal-bounce {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  70% {
    transform: scale(0.9);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .edit-form {
    padding: 16px;
  }
}

.avatar-edit-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 16px;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f0f0f0;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.avatar-upload-btn:hover {
  background-color: #e8e8e8;
}

.avatar-input {
  display: none;
}

@media (max-width: 480px) {
  .avatar-preview {
    width: 100px;
    height: 100px;
  }
}
</style>