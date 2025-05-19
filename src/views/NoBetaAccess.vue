<template>
  <div class="no-beta-access">
    <el-result
      icon="warning"
      title="暂无内测资格"
      sub-title="您当前没有内测资格，无法访问该网站"
    >
      <template #extra>
        <el-button type="primary" @click="goBack">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.no-beta-access {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 添加二次元背景 */
  background-image: url('https://t.alcy.cc/pc'); /* 请替换此URL */
  background-size: cover; /* 覆盖整个区域 */
  background-position: center; /* 背景居中 */
  background-repeat: no-repeat; /* 不重复 */
  /* 可选：添加一个半透明遮罩层，使文字更清晰 */
  position: relative; /* 为伪元素定位提供参考 */
}

.no-beta-access::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3); /* 黑色半透明遮罩 */
  z-index: 1; /* 确保遮罩在背景图之上 */
}

/* 提升内容层级，使其在遮罩之上 */
.no-beta-access .el-result {
  z-index: 2; /* 确保内容在遮罩之上 */
  color: white; /* 让文字在深色背景或遮罩上更显眼 */
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5); /* 文字阴影 */
}

/* 修改Element Plus Result组件内部文字颜色 */
.no-beta-access :deep(.el-result__title p) {
  color: white; /* 标题文字颜色 */
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5); /* 标题文字阴影 */
}

.no-beta-access :deep(.el-result__subtitle p) {
  color: #eee; /* 副标题文字颜色 */
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); /* 副标题文字阴影 */
}

/* 可选：调整按钮样式，使其更符合主题 */
.no-beta-access :deep(.el-button--primary) {
  background-color: var(--primary-color); /* 使用您定义的主题色 */
  border-color: var(--primary-color);
  /* 可以添加更多样式，比如圆角、阴影等 */
}
</style> 