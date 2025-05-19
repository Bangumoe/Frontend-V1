<script setup lang="ts">
import { ref } from 'vue'
import TorrentPlayer from '@/components/TorrentPlayer.vue'

const torrentUrl = ref('')
const showPlayer = ref(false)

const handleSubmit = () => {
  showPlayer.value = true
}
</script>

<template>
  <div class="torrent-test">
    <div class="input-container">
      <input 
        v-model="torrentUrl"
        type="text"
        placeholder="请输入种子链接"
        class="torrent-input"
      >
      <button 
        @click="handleSubmit"
        class="submit-btn"
      >
        播放
      </button>
    </div>
    
    <TorrentPlayer
      v-if="showPlayer"
      :torrent-url="torrentUrl"
    />
  </div>
</template>

<style scoped>
.torrent-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.torrent-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.submit-btn {
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background-color: #ff86aa;
}
</style>
