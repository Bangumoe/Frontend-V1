<template>
  <AsyncElDialog
    v-model="visible"
    title="内测模式提示"
    width="30%"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="beta-dialog"
  >
    <div class="beta-notice">
      <el-icon class="beta-icon"><InfoFilled /></el-icon>
      <p>当前网站处于内测模式，部分功能可能不稳定</p>
    </div>
  </AsyncElDialog>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElDialog } from 'element-plus' // 显式导入 ElDialog 以供 defineAsyncComponent 使用

// 定义异步 ElDialog
const AsyncElDialog = defineAsyncComponent(() => 
  Promise.resolve(ElDialog)
  // 或者更保险的写法，如果ElDialog没有正确导出或被tree-shaking:
  // import('element-plus/es/components/dialog/index').then(module => module.ElDialog)
);

const visible = ref(false)
const BETA_NOTICE_KEY = 'beta_notice_last_shown'
const BETA_NOTICE_INTERVAL = 7200000 // 2小时的毫秒数

onMounted(() => {
  const lastShown = localStorage.getItem(BETA_NOTICE_KEY)
  const now = Date.now()
  
  // 如果没有显示记录，或者距离上次显示已经超过2小时
  if (!lastShown || (now - parseInt(lastShown)) > BETA_NOTICE_INTERVAL) {
    visible.value = true
    localStorage.setItem(BETA_NOTICE_KEY, now.toString())
    
    // 3秒后自动关闭
    setTimeout(() => {
      visible.value = false
    }, 3000)
  }
})
</script>

<style scoped>
.beta-dialog {
  /* 整体弹窗样式 */
  border-radius: 15px; /* 进一步增加圆角 */
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); /* 使用更柔和的渐变蓝 */
  box-shadow: 0 8px 20px rgba(161, 196, 253, 0.4); /* 使用与背景色相关的柔和阴影 */
  border: 2px solid rgba(255, 255, 255, 0.5); /* 添加半透明白色边框 */
  overflow: hidden; /* 确保内容和伪元素在圆角内 */
}

/* 修改弹窗头部样式 */
.beta-dialog :deep(.el-dialog__header) {
  background-color: rgba(255, 255, 255, 0.7); /* 头部背景更透明一点 */
  border-bottom: 1px solid rgba(161, 196, 253, 0.6); /* 头部下边框颜色与背景协调 */
  padding: 15px 25px; /* 调整内边距 */
  position: relative; /* 为可能添加的头部装饰做准备 */
}

.beta-dialog :deep(.el-dialog__title) {
  color: #4a4a4a; /* 使用柔和的深灰色标题 */
  font-weight: bold; /* 加粗 */
  font-size: 19px; /* 调整字号 */
  text-align: center; /* 标题居中 */
  width: 100%; /* 确保标题居中有效 */
}

/* 修改弹窗主体样式 */
.beta-dialog :deep(.el-dialog__body) {
  padding: 25px 25px 35px 25px; /* 调整内边距 */
  background-color: rgba(255, 255, 255, 0.85); /* 主体背景更透明一点 */
}

.beta-notice {
  text-align: center;
  padding: 0; /* 移除这里的padding，由body控制 */
  position: relative; /* 为可能添加的主体装饰做准备 */
}

.beta-icon {
  font-size: 64px; /* 进一步增大图标 */
  color: #ff7675; /* 使用醒目的粉色 */
  margin-bottom: 20px; /* 调整下边距 */
  filter: drop-shadow(0 3px 5px rgba(255, 118, 117, 0.4)); /* 图标阴影颜色与图标协调 */
}

p {
  font-size: 17px; /* 调整字号 */
  color: #555; /* 柔和的文字颜色 */
  margin: 0;
  line-height: 1.6; /* 调整行高，增加可读性 */
}

/* 可选：添加一个顶部装饰元素 */
.beta-dialog :deep(.el-dialog__header)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 50px; /* 装饰线宽度 */
  height: 3px; /* 装饰线高度 */
  background-color: #ff7675; /* 装饰线颜色与图标协调 */
  border-radius: 2px; /* 装饰线圆角 */
}

/* 响应式调整 */
@media (max-width: 768px) {
  .beta-dialog {
    width: 85% !important; /* 小屏幕下宽度更大 */
  }
  .beta-icon {
    font-size: 56px; /* 小屏幕下图标小一些 */
  }
  p {
    font-size: 16px; /* 小屏幕下文字小一些 */
  }
}
</style> 