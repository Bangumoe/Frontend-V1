<template>
  <div :class="['status-hint', `status-${type}`]">
    <div class="status-icon" v-if="type === 'loading'">
      <span class="loading-spinner"></span>
    </div>
    <div class="status-icon error-icon" v-else-if="type === 'error'">(╯°□°）╯︵ ┻━┻</div>
    <div class="status-icon empty-icon" v-else-if="type === 'empty'">Σ( ° △ °|||)︴</div>
    <div class="status-texts">
      <div class="status-title">{{ title }}</div>
      <div v-if="sub" class="status-sub">{{ sub }}</div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
const props = defineProps({
  type: {
    type: String,
    default: 'loading', // loading | error | empty
    validator: (v: string) => ['loading', 'error', 'empty'].includes(v)
  },
  title: {
    type: String,
    required: true
  },
  sub: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.status-hint {
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 18px;
  background: none;
  color: #61666d;
  font-size: 18px;
  animation: fadeIn 0.6s;
}
.status-icon {
  font-size: 48px;
  margin-bottom: 8px;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-spinner {
  width: 56px;
  height: 56px;
  border: 6px solid #fb7299;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 8px auto;
  background: linear-gradient(135deg, #fb7299 60%, #ffd6e3 100%);
  box-shadow: 0 2px 12px rgba(251,114,153,0.12);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.status-error .error-icon {
  color: #ff4d4f;
  font-size: 54px;
  animation: shake 0.7s;
}
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}
.status-empty .empty-icon {
  color: #bdbdbd;
  font-size: 54px;
  animation: bounceIn 0.7s;
}
@keyframes bounceIn {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
.status-title {
  font-size: 1.5em;
  font-weight: bold;
  color: #18191c;
  margin-bottom: 4px;
}
.status-sub {
  font-size: 1em;
  color: #888;
  margin-bottom: 2px;
}
.status-texts {
  display: flex;
  flex-direction: column;
  align-items: center;
}
@media (max-width: 768px) {
  .status-hint {
    font-size: 15px;
    gap: 12px;
  }
  .status-icon {
    font-size: 36px;
  }
  .loading-spinner {
    width: 36px;
    height: 36px;
    border-width: 4px;
  }
  .status-title {
    font-size: 1.1em;
  }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style> 