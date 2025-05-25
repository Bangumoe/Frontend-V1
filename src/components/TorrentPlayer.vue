<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import axios from 'axios'
import { TORRENT_API_BASE_URL } from '@/api/config';

// --- Helper Types/Interfaces ---
// REMOVED EpisodeInfo interface as it's no longer used
// interface EpisodeInfo {
//   episode: string | number;
//   resolution?: string;
//   url: string; 
//   name?: string; 
//   release_date?: string;
//   [key: string]: any; 
// }

// Define props - simplified as episode selection is removed
interface TorrentPlayerProps {
  torrentUrl: string;
}

const props = withDefaults(defineProps<TorrentPlayerProps>(), {
});

const emit = defineEmits(['fullscreen-change', 'web-fullscreen-change'])

// --- Refs for DOM Elements ---
const videoPlayer = ref<HTMLVideoElement | null>(null)
const playerContainer = ref<HTMLElement | null>(null)
const volumeSliderContainer = ref<HTMLElement | null>(null)

// --- Player State (for the currently playing torrent) ---
const sessionId = ref('') 
const videoUrl = ref('')    
const isLoading = ref(false)
const error = ref<string | null>(null)
const PosterNotVideoError = ref<boolean>(false)

// --- Control State ---
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.75)
const isMuted = ref(false)
const showControls = ref(false)
const controlsTimeout = ref<number | null>(null)
const isFullscreenActive = ref(false)
const isWebFullscreenActive = ref(false)
const showVolumeSlider = ref(false)
// const showEpisodeListPanel = ref(false) // REMOVED

// Function to manage the auto-hiding timeout for controls
const resetControlsHideTimeout = () => {
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
    controlsTimeout.value = null;
  }
  // MODIFIED: Removed !showEpisodeListPanel.value from condition
  if (isPlaying.value && videoUrl.value && !showVolumeSlider.value) {
    controlsTimeout.value = window.setTimeout(() => {
      showControls.value = false;
    }, 3000);
  }
};

const convertTorrentToMagnetIfNeeded = async (url: string): Promise<string> => {
  if (url.startsWith('magnet:')) {
    return url
  }
  try {
    const response = await axios.post(`${TORRENT_API_BASE_URL}/api/v1/torrent/parse`, { url })
    if (response.data && response.data.magnet) {
      return response.data.magnet
    }
    throw new Error('磁力链接转换失败 (API 未返回磁力链接)')
  } catch (err) {
    console.error('转换磁力链接失败:', err)
    throw new Error(`磁力链接转换失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const initPlayer = async (url: string) => {
  isLoading.value = true;
  error.value = null;
  PosterNotVideoError.value = false;
  isPlaying.value = false;
  if(videoPlayer.value) videoPlayer.value.pause();
  videoUrl.value = ''; 

  currentTime.value = 0;
  duration.value = 0;

  if (!url) {
    error.value = '未提供 Torrent 链接。';
    isLoading.value = false;
    if (sessionId.value) { 
        
    }
    sessionId.value = ''; 
    return;
  }

  try {
    const oldSessionId = sessionId.value;
    if (oldSessionId) {
      axios.delete(`${TORRENT_API_BASE_URL}/api/v1/torrent/${oldSessionId}`).catch(err => console.warn('Failed to cleanup old session:', err));
    }
    sessionId.value = ''; 

    const magnet = await convertTorrentToMagnetIfNeeded(url);
    const addResponse = await axios.post(`${TORRENT_API_BASE_URL}/api/v1/torrent/add`, { magnet });

    if (addResponse.data && addResponse.data.sessionId) {
      sessionId.value = addResponse.data.sessionId;
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const filesResponse = await axios.get(`${TORRENT_API_BASE_URL}/api/v1/torrent/${sessionId.value}`);
      if (filesResponse.data && Array.isArray(filesResponse.data)) {
        const videosInCurrentTorrent = filesResponse.data
          .filter((file: any) => file && file.name && typeof file.index === 'number' && 
                                 file.name.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i))
          .map((file: any) => ({ name: file.name, index: file.index, length: file.length }));
        
        if (videosInCurrentTorrent.length > 0) {
          const videoToPlay = videosInCurrentTorrent.sort((a,b) => a.name.localeCompare(b.name))[0];
          videoUrl.value = `${TORRENT_API_BASE_URL}/api/v1/torrent/${sessionId.value}/stream/${videoToPlay.index}`;
          if (videoPlayer.value) {
             nextTick(() => {
                if(videoPlayer.value) {
                    videoPlayer.value.load();
                }
            });
          }
        } else {
          const posterFile = filesResponse.data.find((file:any) => file && file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
          if (posterFile && filesResponse.data.length === 1) {
             PosterNotVideoError.value = true;
             error.value = '此 Torrent 只包含封面图片，没有可播放的视频文件。';
          } else {
            error.value = '当前 Torrent 中未找到支持的视频文件。';
          }
        }
      } else {
        throw new Error('无法获取当前 Torrent 的文件列表或格式不正确');
      }
    } else {
      throw new Error('创建 Torrent 会话失败');
    }
  } catch (errCatch) {
    console.error('播放器初始化错误:', errCatch);
    error.value = `播放器初始化失败: ${errCatch instanceof Error ? errCatch.message : String(errCatch)}`;
     if (sessionId.value) { 
        
    }
  } finally {
    isLoading.value = false;
  }
};

const onVideoPlay = () => { 
  isPlaying.value = true;
  resetControlsHideTimeout(); 
}
const onVideoPause = () => {
  isPlaying.value = false;
  showControls.value = true; 
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
    controlsTimeout.value = null;
  }
}
const onVideoLoadedMetadata = () => {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration
    videoPlayer.value.volume = volume.value 
    videoPlayer.value.muted = isMuted.value  
    isLoading.value = false; 
  }
}
const onVideoTimeUpdate = () => { if (videoPlayer.value) currentTime.value = videoPlayer.value.currentTime }
const onVideoVolumeChange = () => {
  if (videoPlayer.value) {
    volume.value = videoPlayer.value.volume
    isMuted.value = videoPlayer.value.muted
  }
}
const onVideoEnded = () => {
    isPlaying.value = false;
    showControls.value = true; 
    if (controlsTimeout.value) {
      clearTimeout(controlsTimeout.value);
      controlsTimeout.value = null;
    }
}
const onVideoWaiting = () => { isLoading.value = true; }
const onVideoPlaying = () => { isLoading.value = false; }

const togglePlay = () => {
  if (!videoPlayer.value || !videoUrl.value) return
  if (videoPlayer.value.paused || videoPlayer.value.ended) {
    videoPlayer.value.play().catch(e => error.value = `播放失败: ${e.message}`);
  } else {
    videoPlayer.value.pause()
  }
}

const handleSeek = (event: Event | number) => {
  if (!videoPlayer.value) return
  const targetTime = typeof event === 'number' ? event : parseFloat((event.target as HTMLInputElement).value)
  videoPlayer.value.currentTime = targetTime
  currentTime.value = targetTime
}

const handleVolumeInput = (event: Event) => {
  if (!videoPlayer.value) return
  const newVolume = parseFloat((event.target as HTMLInputElement).value)
  videoPlayer.value.volume = newVolume
  volume.value = newVolume
  isMuted.value = newVolume === 0
  videoPlayer.value.muted = isMuted.value
}

const toggleMute = () => {
  if (!videoPlayer.value) return
  const currentMuteState = !videoPlayer.value.muted
  videoPlayer.value.muted = currentMuteState
  isMuted.value = currentMuteState
  if (!isMuted.value && videoPlayer.value.volume === 0) { 
    videoPlayer.value.volume = 0.5
    volume.value = 0.5
  }
}

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00'
  const date = new Date(0)
  date.setSeconds(timeInSeconds)
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const toggleFullscreen = () => {
  if (!playerContainer.value) return
  if (isWebFullscreenActive.value) {
    isWebFullscreenActive.value = false; 
  }
  if (!isFullscreenActive.value) {
    playerContainer.value.requestFullscreen().catch(err => console.error("Fullscreen request failed:", err))
  } else {
    document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err))
  }
}

const toggleWebFullscreen = () => {
  if (!playerContainer.value) return;
  if (isFullscreenActive.value) {
    document.exitFullscreen().then(() => {
      isWebFullscreenActive.value = !isWebFullscreenActive.value;
    }).catch(err => console.error("Exit fullscreen failed before web fullscreen:", err));
  } else {
    isWebFullscreenActive.value = !isWebFullscreenActive.value;
  }
  if (isWebFullscreenActive.value) {
    handlePlayerActivity(); 
    handleMouseLeavePlayer(); 
  }
}

const updateFullscreenStatus = () => {
  const nowNativeFullscreen = !!document.fullscreenElement
  if (nowNativeFullscreen && isWebFullscreenActive.value) {
    isWebFullscreenActive.value = false; 
  }
  isFullscreenActive.value = nowNativeFullscreen
  emit('fullscreen-change', isFullscreenActive.value)
}

const handlePlayerActivity = () => {
  showControls.value = true;
  resetControlsHideTimeout();
};

const handleMouseLeavePlayer = () => {
  resetControlsHideTimeout();
};

// REMOVED toggleEpisodeListPanel function
// REMOVED handleEpisodeSelectFromPanel function

const onVolumeButtonMouseEnter = () => { 
  showVolumeSlider.value = true; 
  showControls.value = true; 
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
    controlsTimeout.value = null;
  }
}
const onVolumeSliderContainerMouseLeave = () => { 
  showVolumeSlider.value = false; 
  resetControlsHideTimeout(); 
}

watch(() => props.torrentUrl, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    initPlayer(newUrl);
  } else if (!newUrl && oldUrl) { 
    error.value = '未提供 Torrent 链接。';
    videoUrl.value = '';
    if (sessionId.value) { 
        
    }
    sessionId.value = ''; 
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    isLoading.value = false;
    PosterNotVideoError.value = false;
  } else if (newUrl && !videoUrl.value && !isLoading.value && !error.value) {
    initPlayer(newUrl);
  }
}, { immediate: true });

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isWebFullscreenActive.value) {
      isWebFullscreenActive.value = false;
      event.preventDefault(); 
    }
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenStatus)
  document.addEventListener('keydown', handleEscKey); 
  if(videoPlayer.value && videoPlayer.value.src){
      videoPlayer.value.volume = volume.value;
      videoPlayer.value.muted = isMuted.value;
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenStatus)
  document.removeEventListener('keydown', handleEscKey); 
  if (controlsTimeout.value) clearTimeout(controlsTimeout.value)
  if (sessionId.value) {
    axios.delete(`${TORRENT_API_BASE_URL}/api/v1/torrent/${sessionId.value}`).catch(err => console.warn('Failed to cleanup session on unmount:', err))
    sessionId.value = '';
  }
})

const progressPercent = computed(() => {
  if (duration.value > 0) {
    return (currentTime.value / duration.value) * 100
  }
  return 0
})

const setWebFullscreen = (val: boolean) => {
  isWebFullscreenActive.value = val
  emit('web-fullscreen-change', val)
}

watch(isWebFullscreenActive, (val) => {
  emit('web-fullscreen-change', val)
})

</script>

<template>
  <div 
    ref="playerContainer"
    class="torrent-player-container"
    :class="{ 
      'fullscreen-active': isFullscreenActive,
      'web-fullscreen-active': isWebFullscreenActive 
    }"
    @mousemove="handlePlayerActivity" 
    @mouseleave="handleMouseLeavePlayer" 
  >
    <video
      ref="videoPlayer"
      class="video-element"
      :src="videoUrl"
      @play="onVideoPlay"
      @pause="onVideoPause"
      @loadedmetadata="onVideoLoadedMetadata"
      @timeupdate="onVideoTimeUpdate"
      @volumechange="onVideoVolumeChange"
      @ended="onVideoEnded"
      @waiting="onVideoWaiting"
      @playing="onVideoPlaying"
      @click.self="togglePlay"
      @dblclick="toggleFullscreen"
      playsinline
    >
      您的浏览器不支持 HTML5 视频。
    </video>

    <!-- Status Overlays -->
    <div v-if="isLoading && !error" class="status-overlay loading-indicator">
      <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
      <span>加载中...</span>
    </div>
    <div v-if="error && !PosterNotVideoError" class="status-overlay error-indicator">
      <p>{{ error }}</p>
      <button v-if="props.torrentUrl" @click="initPlayer(props.torrentUrl)" class="retry-button">重试</button>
    </div>
     <div v-if="PosterNotVideoError" class="status-overlay error-indicator poster-error">
      <p>{{ error }}</p>
    </div>
    <div v-if="!props.torrentUrl && !isLoading && !error && !videoUrl" class="status-overlay no-torrent-indicator">
      <p>播放器准备就绪，等待 Torrent 链接。</p>
    </div>
    
    <div 
      v-if="videoUrl && !isPlaying && !isLoading && !error" 
      class="center-play-button-overlay" 
      @click.stop="togglePlay"
    >
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>

    <div 
      class="controls-overlay" 
      :class="{ 'visible': showControls || !isPlaying || showVolumeSlider }" 
      @click.self="togglePlay" 
    >
      <!-- Progress Bar Area - Moved to the top of controls overlay -->
      <div class="progress-bar-area-top">
        <div class="progress-bar-container" @click.stop>
           <input 
              type="range" 
              class="progress-bar"
              min="0" 
              :max="duration" 
              :value="currentTime" 
              @input="handleSeek($event)"
              :style="{ background: `linear-gradient(to right, var(--progress-fill-color) 0%, var(--progress-fill-color) ${progressPercent}%, var(--progress-track-color) ${progressPercent}%, var(--progress-track-color) 100%)` }"
              :disabled="!duration"
           />
        </div>
      </div>

      <div class="bottom-controls-bar">
        <div class="controls-left">
          <button @click.stop="togglePlay" :title="isPlaying ? '暂停' : '播放'" class="control-btn">
            <svg v-if="!isPlaying" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
        </div>

        <div class="controls-right">
          <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

          <div 
            class="volume-control-wrapper" 
            @mouseenter="onVolumeButtonMouseEnter" 
            @mouseleave="onVolumeSliderContainerMouseLeave"
          >
            <button @click.stop="toggleMute" :title="isMuted ? '取消静音' : '静音'" class="control-btn">
              <svg v-if="isMuted || volume === 0" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21c.59.31 1 .92 1 1.62a2.5 2.5 0 01-2.5 2.5c-.7 0-1.31-.26-1.72-.84l-1.42 1.42A6.43 6.43 0 0012 16.5a6.5 6.5 0 005.48-3.07l-1.98-1.43zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM19 12h-2c0 .1-.01.19-.02.28L19 14.23V12zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              <svg v-else-if="volume > 0.6" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              <svg v-else-if="volume > 0.1" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
            </button>
            <div ref="volumeSliderContainer" class="volume-slider-container" :class="{ visible: showVolumeSlider }">
              <input 
                type="range" 
                class="volume-slider"
                min="0" max="1" step="0.01" 
                :value="volume" 
                @input="handleVolumeInput"
                :style="{ background: `linear-gradient(to right, var(--volume-fill-color) 0%, var(--volume-fill-color) ${volume*100}%, var(--volume-track-color) ${volume*100}%, var(--volume-track-color) 100%)` }"
              />
            </div>
          </div>
          
          <button title="设置 (暂未实现)" class="control-btn" disabled>
            <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17-.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
          </button>

          <button @click.stop="toggleWebFullscreen" :title="isWebFullscreenActive ? '退出网页全屏' : '网页全屏'" class="control-btn">
            <svg v-if="!isWebFullscreenActive" viewBox="0 0 24 24"><path fill="currentColor" d="M21 6H3C2.45 6 2 6.45 2 7V17C2 17.55 2.45 18 3 18H21C21.55 18 22 17.55 22 17V7C22 6.45 21.55 6 21 6ZM20 16H4V8H20V16Z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path fill="currentColor" d="M19 10H5C4.45 10 4 10.45 4 11V13C4 13.55 4.45 14 5 14H19C19.55 14 20 13.55 20 13V11C20 10.45 19.55 10 19 10Z"/></svg>
          </button>
          
          <button @click.stop="toggleFullscreen" :title="isFullscreenActive ? '退出全屏' : '全屏'" class="control-btn">
            <svg v-if="!isFullscreenActive" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
:root {
  --player-accent-color: #00a1d6; 
  --player-text-color: #e0e0e0;
  --controls-bg-color: rgb(26, 26, 26); 
  --progress-track-color: rgba(255, 255, 255, 0.4); 
  --progress-fill-color: var(--player-accent-color);
  --volume-track-color: rgba(255, 255, 255, 0.4); 
  --volume-fill-color: #fff; 
  --icon-fill-color: #fff;
  --button-hover-bg: rgba(255, 255, 255, 0.15);
  --panel-bg-color: rgb(30, 30, 30);   
  --panel-border-color: rgba(80, 80, 80, 0.7);
  --item-hover-bg: rgba(255, 255, 255, 0.1);
  --item-active-bg: var(--player-accent-color);
  --bottom-controls-height: 48px; /* Define height for bottom bar */
}

.torrent-player-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #000;
  color: var(--player-text-color);
  overflow: hidden; 
  display: flex; 
  justify-content: center;
  align-items: center;
  /* min-height: 200px; */ /* Consider removing or ensure it doesn't conflict */
}
.torrent-player-container.fullscreen-active {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647; 
}
.torrent-player-container.web-fullscreen-active {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important; 
  height: 100vh !important;
  z-index: 2147483646; 
  background-color: #000; 
}

.video-element {
  width: 100%;
  height: 100%;
  display: block; 
  object-fit: contain; 
}

.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.75);
  color: #fff;
  z-index: 10;
  padding: 20px;
  text-align: center;
  box-sizing: border-box;
}
.status-overlay .spinner {
  animation: rotate 2s linear infinite;
  width: 50px;
  height: 50px;
  margin-bottom: 15px;
}
.status-overlay .spinner .path {
  stroke: var(--player-accent-color);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}
@keyframes rotate { 100% { transform: rotate(360deg); } }
@keyframes dash {
  0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}
.status-overlay p { margin: 5px 0; }
.status-overlay .retry-button {
  margin-top: 15px;
  padding: 8px 16px;
  background-color: var(--player-accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.status-overlay .retry-button:hover { background-color: #007ead; }
.error-indicator { color: #ffabab; }
.error-indicator .retry-button { background-color: #d32f2f; }
.error-indicator .retry-button:hover { background-color: #b71c1c; }
.poster-error { font-size: 1.1em; }


.center-play-button-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70px;
  height: 70px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 25;
  transition: background-color 0.2s;
}
.center-play-button-overlay:hover { background-color: rgba(0, 0, 0, 0.7); }
.center-play-button-overlay svg {
  width: 36px;
  height: 36px;
  fill: var(--icon-fill-color);
}

.controls-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease-out, visibility 0.25s ease-out;
  z-index: 20;
  /* Removed gradient background from overlay, will be on bottom-controls-bar if needed */
}
.controls-overlay.visible {
  opacity: 1;
  visibility: visible;
}

/* New area for the progress bar, above the main controls */
.progress-bar-area-top {
  position: absolute; /* Positioned relative to controls-overlay */
  bottom: var(--bottom-controls-height); /* Place it above the bottom bar */
  left: 0;
  right: 0;
  padding: 0 12px; /* Align with bottom bar padding */
  box-sizing: border-box;
  height: 20px; /* Adjust as needed, gives some clickable area around the thin bar */
  display: flex;
  align-items: center;
}

.progress-bar-container { /* This is the direct parent of the input[type=range] */
  width: 100%;
  height: 14px; /* Container height for easier clicking, can be adjusted */
  display: flex;
  align-items: center;
  cursor: pointer;
  /* padding: 4px 0; /* Padding to make clickable area larger - adjust if needed */
}
.progress-bar {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px; /* Thinner bar */
  border-radius: 2px;
  background: var(--progress-track-color); 
  outline: none;
  cursor: pointer;
  transition: height 0.15s ease;
}
.progress-bar-area-top:hover .progress-bar { height: 6px; } /* Slightly thicker on hover of area */

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px; /* Smaller thumb */
  height: 12px;
  background: #fff;
  border-radius: 50%;
  border: 2px solid var(--player-accent-color);
  cursor: pointer;
  transform: scale(0);
  transition: transform 0.15s ease;
}
.progress-bar-area-top:hover .progress-bar::-webkit-slider-thumb { transform: scale(1); }

.progress-bar::-moz-range-thumb { 
  width: 12px; height: 12px; background: #fff; border-radius: 50%; border: 2px solid var(--player-accent-color); cursor: pointer; transform: scale(0); transition: transform 0.15s ease; border: none;
}
.progress-bar-area-top:hover .progress-bar::-moz-range-thumb { transform: scale(1); }


.bottom-controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Space out left and right controls */
  height: var(--bottom-controls-height);
  padding: 0 12px;
  box-sizing: border-box;
  font-size: 30px;
}

.controls-left, .controls-right { display: flex; align-items: center; }
/* .controls-center was removed */

.control-btn {
  background: none;
  border: none;
  color: var(--icon-fill-color);
  cursor: pointer;
  padding: 6px;
  margin: 0 3px; 
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1; 
  transition: opacity 0.2s, background-color 0.2s;
}
.control-btn:hover { opacity: 1; background-color: var(--button-hover-bg); border-radius: 3px;}
.control-btn:disabled { opacity: 0.5; cursor: not-allowed; background-color: transparent !important;}
.control-btn svg { width: 22px; height: 22px; fill: currentColor; }

.time-display {
  font-size: 15px;
  margin: 0 8px;
  color: var(--player-text-color);
  user-select: none;
  min-width: 85px; /* Keep min-width for consistent layout */
  text-align: left; /* Time is now first in right controls, so left align within its space */
}

.volume-control-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.volume-slider-container {
  position: absolute;
  bottom: calc(100% + 5px); 
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--controls-bg-color);
  padding: 10px 8px;
  border-radius: 4px;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.3);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 5; 
}
.volume-slider-container.visible { opacity: 1; visibility: visible; }
.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 80px; 
  height: 5px;
  background: var(--volume-track-color); 
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 12px; height: 12px; background: var(--volume-fill-color); border-radius: 50%; cursor: pointer;
}
.volume-slider::-moz-range-thumb {
  width: 12px; height: 12px; background: var(--volume-fill-color); border-radius: 50%; cursor: pointer; border:none;
}


/* Styles for removed episode panel can be cleaned up if desired */
.panel-list-empty {
  padding: 20px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
}
.panel-list .file-resolution { 
  font-size: 0.9em;
  color: #aaa;
  margin-left: 8px;
  flex-shrink: 0;
}
</style>
