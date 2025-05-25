<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import TorrentPlayer from '@/components/TorrentPlayer.vue'
import StatusHint from '@/components/StatusHint.vue'
import { API_BASE_URL } from '@/api/config' 

// TypeScript 接口定义 - 剧集列表相关
interface Episode {
  episode: number;
  resolution: string;
  url: string;
  release_date: string;
}

interface GroupedEpisode {
  group_name: string;
  episodes: Episode[];
}

interface GroupedApiResponse { // Renamed from ApiResponse to be specific
  code: number;
  message: string;
  data: GroupedEpisode[];
}

// TypeScript 接口定义 - 番剧详情相关 (NEW)
interface BangumiDetail {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  poster_hash: string;
  official_title: string;
  year: string;
  season: number;
  source: string;
  poster_link: string;
  view_count: number;
  favorite_count: number;
  rating_avg: number;
  rating_count: number;
}

interface BangumiDetailApiResponse { // (NEW)
  code: number;
  message: string;
  data: BangumiDetail | null;
}

// 新增：番剧统计信息接口
interface BangumiStats {
  favorite_count: number;
  is_favorite: boolean;
  rating_avg: number;
  rating_count: number;
  view_count: number;
}

interface BangumiStatsApiResponse {
  code: number;
  message: string;
  data: BangumiStats;
}

const route = useRoute()
const bangumiId = ref<string | null>(null)
const bangumiMainTitle = ref<string>('番剧标题加载中...')

// 剧集列表相关状态
const groupedEpisodesData = ref<GroupedEpisode[]>([])
const episodesLoading = ref(false) // RENAMED from: const loading = ref(false)
const episodesError = ref<string | null>(null) // RENAMED from: const error = ref<string | null>(null)

// 番剧详情相关状态 (NEW)
const bangumiDetails = ref<BangumiDetail | null>(null)
const detailsLoading = ref(false)
const detailsError = ref<string | null>(null)

// 新增：番剧统计信息状态
const bangumiStats = ref<BangumiStats | null>(null)
const statsLoading = ref(false)
const statsError = ref<string | null>(null)

const selectedGroup = ref<GroupedEpisode | null>(null)
const selectedEpisode = ref<Episode | null>(null)
const activeTorrentUrl = ref<string>('') // NEW: URL for the player, set only on explicit play action

// 辅助函数：格式化数字（例如：12345 -> 1.2万） (NEW)
const formatCount = (count: number | undefined): string => {
  if (typeof count !== 'number') return '0';
  if (count >= 100000000) { // 亿
    return (count / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  }
  if (count >= 10000) { // 万
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  }
  return count.toString();
};

// 辅助函数：处理海报链接 (NEW)
const posterUrl = (link: string | undefined): string => {
  const placeholder = '/default-poster.png'; // 确保有这个占位图或替换为有效路径
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!link) return placeholder;
  let formattedLink = link.replace(/\\\\/g, '/').replace(/\\/g, '/'); // 替换反斜杠
  // 如果是 uploads/ 开头，通常是相对于域名根目录
  if (formattedLink.startsWith('uploads/')) {
    if (viteApiBaseUrl) {
      // 确保基础URL和相对路径之间只有一个斜杠
      const base = viteApiBaseUrl.endsWith('/') ? viteApiBaseUrl.slice(0, -1) : viteApiBaseUrl;
      return `${base}/${formattedLink}`;
    } else {
      return `/${formattedLink}`;
    }
  }
  else {
  // 如果不是http(s)开头，也不是 / 开头，也不是 uploads/ 开头，则可能是需要API服务器代理的相对路径
  // 暂时不处理更复杂的前缀逻辑，依赖于链接本身是否可直接访问或通过uploads/规则处理
  return formattedLink || placeholder;
  }
};

const fetchBangumiData = async (id: string) => {
  episodesLoading.value = true
  episodesError.value = null
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get<GroupedApiResponse>(`${API_BASE_URL}/api/v1/bangumi/grouped_items/${id}`, {
      headers: headers
    })
    if (response.data.code === 200 && response.data.data) {
      groupedEpisodesData.value = response.data.data
      if (groupedEpisodesData.value.length > 0) {
        selectedGroup.value = groupedEpisodesData.value[0]
      }
      // 假设番剧主标题可以通过某种方式获取，这里用第一个字幕组的组名和ID作为示例
      // 您需要替换为真实的番剧标题获取逻辑
      if (groupedEpisodesData.value.length > 0 && groupedEpisodesData.value[0].group_name) {
        // 这只是一个临时的处理方式，实际项目中标题应该独立获取
        // bangumiMainTitle.value = `番剧系列 ${id}`; // 更通用的占位符
      } else {
        // bangumiMainTitle.value = `番剧 ${id}`;
      }
       // 为了演示，暂时写死一个标题，实际应从API或路由获取
      //bangumiMainTitle.value = `关于我转生变成史莱姆这档事 第三季`;


    } else {
      throw new Error(response.data.message || '获取番剧数据失败')
    }
  } catch (err) {
    console.error('获取番剧数据时出错:', err)
    episodesError.value = err instanceof Error ? err.message : String(err)
    bangumiMainTitle.value = '无法加载番剧标题';
  } finally {
    episodesLoading.value = false
  }
}

// (NEW FUNCTION)
const fetchBangumiDetails = async (id: string) => {
  detailsLoading.value = true;
  detailsError.value = null;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await axios.get<BangumiDetailApiResponse>(`${API_BASE_URL}/api/v1/bangumi/${id}`, { headers });
    if (response.data.code === 200 && response.data.data) {
      bangumiDetails.value = response.data.data;
      if (bangumiDetails.value && bangumiDetails.value.official_title) {
        let title = bangumiDetails.value.official_title;
        if (bangumiDetails.value.season > 0) {
            title += ` 第${bangumiDetails.value.season}季`;
        }
        bangumiMainTitle.value = title;
      } else {
        bangumiMainTitle.value = '番剧标题信息缺失';
      }
    } else {
      throw new Error(response.data.message || '获取番剧详情失败');
    }
  } catch (err) {
    console.error('获取番剧详情时出错:', err);
    detailsError.value = err instanceof Error ? err.message : String(err);
    if (bangumiMainTitle.value === '番剧标题加载中...') {
        bangumiMainTitle.value = '无法加载番剧详情';
    }
  } finally {
    detailsLoading.value = false;
  }
};

// 新增：获取番剧统计信息
const fetchBangumiStats = async (id: string) => {
  statsLoading.value = true;
  statsError.value = null;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await axios.get<BangumiStatsApiResponse>(`${API_BASE_URL}/api/v1/bangumi/${id}/stats`, { headers });
    if (response.data.code === 200 && response.data.data) {
      bangumiStats.value = response.data.data;
    } else {
      throw new Error(response.data.message || '获取番剧统计信息失败');
    }
  } catch (err) {
    console.error('获取番剧统计信息时出错:', err);
    statsError.value = err instanceof Error ? err.message : String(err);
  } finally {
    statsLoading.value = false;
  }
};

onMounted(() => {
  const idFromRoute = route.params.id
  if (typeof idFromRoute === 'string') {
    bangumiId.value = idFromRoute
    fetchBangumiData(idFromRoute)
    fetchBangumiDetails(idFromRoute)
    fetchBangumiStats(idFromRoute) // 新增：获取统计信息
  } else {
    const invalidIdMsg = "番剧ID无效";
    episodesError.value = `${invalidIdMsg} (剧集)`;
    detailsError.value = `${invalidIdMsg} (详情)`;
    statsError.value = `${invalidIdMsg} (统计)`;
    bangumiMainTitle.value = invalidIdMsg;
  }
})

// NEW WATCH: When selected episode changes, clear the active URL to require play confirmation
watch(selectedEpisode, (newEpisode, oldEpisode) => {
  if (newEpisode !== oldEpisode) { // Check if the episode object itself has changed
    activeTorrentUrl.value = '';
  }
});

watch(selectedGroup, (newGroup, oldGroup) => {
  if (newGroup) {
    // Case 1: Group is changed by user/programmatically AFTER initial load (oldGroup existed and is different)
    if (oldGroup && oldGroup.group_name !== newGroup.group_name) {
      if (newGroup.episodes.length > 0) {
        selectedEpisode.value = newGroup.episodes[0]; // Auto-select first episode of the new group
      } else {
        selectedEpisode.value = null;
      }
    }
    // Case 2: Initial setting of selectedGroup (oldGroup was null)
    // OR group data refreshed for the same group (oldGroup is same as newGroup and episodes might have changed)
    else if (!oldGroup || (oldGroup && oldGroup.group_name === newGroup.group_name)) {
      // If no episodes in the new group (applies to initial or refresh if episodes disappear)
      if (newGroup.episodes.length === 0) {
        selectedEpisode.value = null;
      }
      // If it's a refresh of the same group, check if the current selected episode is still valid
      else if (oldGroup && oldGroup.group_name === newGroup.group_name) {
        const currentEpisodeStillInNewGroup = selectedEpisode.value &&
                                              newGroup.episodes.some(ep => ep.url === selectedEpisode.value?.url);
        if (selectedEpisode.value && !currentEpisodeStillInNewGroup) {
          selectedEpisode.value = null; // Clear selection if current episode is gone, do not auto-pick a new one
        }
      }
      // If it's the initial load (!oldGroup) and newGroup has episodes,
      // selectedEpisode.value remains as it is (which should be null from its initial state),
      // thus no auto-play is triggered from here.
    }
  } else { // newGroup is null
    selectedEpisode.value = null;
  }
});

const selectGroup = (group: GroupedEpisode) => {
  selectedGroup.value = group
}

const selectEpisode = (episode: Episode) => {
  selectedEpisode.value = episode
}

// NEW FUNCTION: Called when user clicks the "Play" button for a selected episode
const playSelectedEpisode = () => {
  if (selectedEpisode.value) {
    activeTorrentUrl.value = selectedEpisode.value.url;
  }
};

const episodesForSelectedGroup = computed(() => {
  return selectedGroup.value ? selectedGroup.value.episodes : []
})

const totalEpisodesInSelectedGroup = computed(() => {
  return selectedGroup.value ? selectedGroup.value.episodes.length : 0;
});

// 当前播放集数在当前字幕组列表中的显示索引 (例如 "1" 或 "N/A")
const currentEpisodeDisplayIndex = computed(() => { // RENAMED from currentEpisodeNumberInGroup
    if (selectedGroup.value && selectedEpisode.value) {
        const index = selectedGroup.value.episodes.findIndex(ep => ep.url === selectedEpisode.value?.url);
        return index !== -1 ? (index + 1).toString() : 'N/A';
    }
    return '';
});

// 计算属性，用于判断是否所有关键数据都加载完毕，用于控制全局初始loading (NEW)
const pageInitialLoading = computed(() => {
    // 初始加载看 episodesLoading 和 detailsLoading 是否都还在加载，并且对应数据还未填充
    return (episodesLoading.value && groupedEpisodesData.value.length === 0) || 
           (detailsLoading.value && !bangumiDetails.value);
});

</script>

<template>
  <div class="bangumi-player-page">
    <!-- Page Level Loading/Error/Empty States -->
    <StatusHint v-if="pageInitialLoading && !episodesError && !detailsError" type="loading" title="少女祈祷中..." sub="正在加载番剧资源，请稍候" />
    <StatusHint v-else-if="(episodesError || detailsError) && (!groupedEpisodesData.length && !bangumiDetails)" type="error" :title="'加载失败'" :sub="episodesError || detailsError || undefined">
      <div class="status-sub">请检查网络连接或番剧ID是否正确。</div>
    </StatusHint>
    <StatusHint v-else-if="!pageInitialLoading && !groupedEpisodesData.length && !bangumiDetails && !episodesError && !detailsError" type="empty" title="暂无番剧信息" sub="抱歉，该番剧暂无任何信息~" />

    <div v-else class="player-layout-wrapper">
      <main class="main-content-area">
        <TorrentPlayer
          v-if="activeTorrentUrl"
          :torrent-url="activeTorrentUrl"
          class="torrent-video-player-main"
        />
        <div v-else class="video-placeholder">
          <!-- Case 1: Episode selected, waiting for play confirmation -->
          <template v-if="selectedEpisode">
            <div class="play-prompt-container">
              <p class="play-prompt-title">准备播放：</p>
              <p class="play-prompt-ep-info">
                <span v-if="selectedGroup">{{ selectedGroup.group_name }}</span> -
                <span>第 {{ selectedEpisode.episode }} 话</span>
                <span v-if="selectedEpisode.resolution"> ({{ selectedEpisode.resolution }})</span>
              </p>
              <button @click="playSelectedEpisode" class="play-confirmation-button">
                <svg class="play-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                立即播放
              </button>
            </div>
          </template>

          <!-- Case 2: No episode selected yet, various guiding messages -->
          <template v-else>
            <p v-if="episodesLoading && groupedEpisodesData.length === 0 && !selectedGroup">字幕组和剧集列表加载中...</p>
            <p v-else-if="episodesLoading && selectedGroup && episodesForSelectedGroup.length === 0">当前字幕组剧集加载中...</p>
            <p v-else-if="!selectedGroup && groupedEpisodesData.length > 0">请在右侧选择字幕组</p>
            <p v-else-if="selectedGroup && episodesForSelectedGroup.length === 0 && !episodesLoading">当前字幕组暂无资源</p>
            <p v-else-if="selectedGroup && episodesForSelectedGroup.length > 0">请选择一集进行播放</p>
            <p v-else-if="!groupedEpisodesData.length && !episodesLoading && !episodesError">暂无任何剧集数据</p>
            <p v-else-if="episodesError && groupedEpisodesData.length === 0">剧集加载失败: {{ episodesError }}</p>
            <p v-else>请选择剧集开始</p> <!-- Generic fallback -->
          </template>
        </div>

        <div class="video-info-section">
          <h1 class="bangumi-title" :title="bangumiMainTitle">{{ bangumiMainTitle }}</h1>
          <h2 class="episode-current-info" v-if="selectedEpisode">
            <span v-if="selectedGroup">{{ selectedGroup.group_name }}</span>
            <span> - 第 {{ selectedEpisode.episode }} 话</span>
            <span v-if="selectedEpisode.resolution"> ({{ selectedEpisode.resolution }})</span>
          </h2>
        </div>

        <!-- 番剧详细信息块 (NEW) -->
        <div v-if="detailsLoading && !bangumiDetails" class="details-loading-skeleton">
            <div class="skeleton-poster"></div>
            <div class="skeleton-text-lines">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line long"></div>
            </div>
        </div>
        <div v-else-if="detailsError && !bangumiDetails" class="details-error-message">
            番剧详细信息加载失败: {{ detailsError }}
        </div>
        <div v-else-if="bangumiDetails" class="bangumi-extended-details">
          <div class="details-left">
            <img 
              :src="posterUrl(bangumiDetails.poster_link)" 
              :alt="bangumiDetails.official_title" 
              class="details-poster" 
              @error="($event.target as HTMLImageElement).src='/default-poster.png'"
            />
          </div>
          <div class="details-right">
            <h2 class="details-official-title" :title="bangumiDetails.official_title">{{ bangumiDetails.official_title }}</h2>
            <div class="details-stats">
              <span title="播放数"><i class="icon-play-count">▶</i> {{ formatCount(bangumiDetails.view_count) }}</span>
              <span title="追番人数"><i class="icon-favorite-count">❤</i> {{ formatCount(bangumiDetails.favorite_count) }}</span>
            </div>
            <div class="details-meta">
              <span>{{ bangumiDetails.year }}</span>
              <span v-if="bangumiDetails.season > 0">第{{ bangumiDetails.season }}季</span>
              <span v-if="bangumiDetails.source">来源: {{ bangumiDetails.source }}</span>
            </div>
            <div class="details-rating" v-if="bangumiDetails.rating_count > 0">
              <span class="rating-score">{{ bangumiDetails.rating_avg.toFixed(1) }}</span>
              <span class="rating-unit">分</span>
              <span class="rating-count">({{ formatCount(bangumiDetails.rating_count) }}人评价)</span>
            </div>
            <div class="details-rating-empty" v-else>
              <span>暂无评分</span>
            </div>
            <div class="details-actions">
              <button class="action-btn favorite-btn"><i class="icon-add-favorite">❤</i> 追番</button>
              <button class="action-btn channel-btn">番剧频道</button>
            </div>
            <div class="details-synopsis">
              <p><strong>简介：</strong>
                {{ bangumiDetails.official_title }} ({{bangumiDetails.year}}{{bangumiDetails.season > 0 ? ` 第${bangumiDetails.season}季` : ''}})
                是一部广受欢迎的作品。当前暂无更详细的剧情摘要。 
                <span v-if="bangumiDetails.source">本资源信息主要来源于{{bangumiDetails.source}}。</span>
                请欣赏视频内容。
              </p>
            </div>
          </div>
        </div>
        
      </main>

      <aside class="sidebar-area">
        <div class="sidebar-header">
          <span>选集</span>
          <span class="episode-count-display" v-if="selectedGroup && totalEpisodesInSelectedGroup > 0">({{ currentEpisodeDisplayIndex }}/{{ totalEpisodesInSelectedGroup }})</span>
        </div>

        <div class="group-selector-tabs">
          <ul class="tabs-list">
            <li
              v-for="group in groupedEpisodesData"
              :key="group.group_name"
              class="tab-item"
              :class="{ active: selectedGroup?.group_name === group.group_name }"
              @click="selectGroup(group)"
              :title="group.group_name"
            >
              {{ group.group_name }}
            </li>
             <li v-if="episodesLoading && groupedEpisodesData.length === 0" class="tab-item-loading">字幕组加载中...</li>
             <li v-if="!episodesLoading && groupedEpisodesData.length === 0 && !episodesError" class="tab-item-empty">无字幕组信息</li>
          </ul>
        </div>
        
        <div class="episode-selector-grid">
          <div class="grid-header" v-if="selectedGroup">
            <span>{{ selectedGroup.group_name }}</span>
          </div>
           <div v-if="episodesLoading && episodesForSelectedGroup.length === 0 && selectedGroup" class="grid-loading">剧集列表加载中...</div>
          <ul v-else-if="episodesForSelectedGroup.length > 0" class="grid-list">
            <li
              v-for="episode in episodesForSelectedGroup"
              :key="episode.url" 
              class="grid-item"
              :class="{ active: selectedEpisode?.url === episode.url }"
              @click="selectEpisode(episode)"
              :title="`第 ${episode.episode} 集 (${episode.resolution})`"
            >
              <span class="episode-number">{{ episode.episode }}</span>
            </li>
          </ul>
          <div v-else-if="!episodesLoading && selectedGroup && episodesForSelectedGroup.length === 0" class="grid-empty">该字幕组暂无资源</div>
          <div v-else-if="!episodesLoading && !selectedGroup && groupedEpisodesData.length > 0" class="grid-placeholder">请先选择上方的字幕组</div>
          <div v-else-if="!episodesLoading && groupedEpisodesData.length === 0 && !episodesError && !selectedGroup" class="grid-empty">此番剧暂无任何字幕组或剧集信息</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* 全局颜色变量 (Bilibili风格) */
/* :root DEFINITION REMOVED FROM HERE */

.bangumi-player-page {
  background-color: var(--bili-bg-gray, #f1f2f3);
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

.page-loading-state, .page-error-state, .page-empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 40px);
  text-align: center;
  color: var(--bili-text-secondary, #61666d);
}
.page-loading-state p, .page-error-state p, .page-empty-state p {
  font-size: 1.2em;
  margin-bottom: 8px;
}
.page-error-state p:first-child {
  color: var(--bili-pink, #fb7299);
  font-size: 1.5em;
  margin-bottom: 10px;
}

.player-layout-wrapper {
  display: flex;
  gap: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.main-content-area {
  flex: 1;
  min-width: 0;
  background-color: var(--bili-bg-light, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  overflow: hidden;
}

.torrent-video-player-main {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: var(--bili-player-bg, #000);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.video-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: var(--bili-player-bg, #000);
  color: #fff;
  display: flex;
  flex-direction: column; /* MODIFIED: Allow column layout for prompt */
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
  text-align: center;
  padding: 20px;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.video-info-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--bili-border-color, #e3e5e7);
}

.bangumi-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--bili-text-main, #18191c);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 2.8em;
}

.episode-current-info {
  font-size: 14px;
  color: var(--bili-text-secondary, #61666d);
  margin: 0;
  font-weight: normal;
}

/* 番剧详情块样式 (NEW STYLES) */
.bangumi-extended-details {
  display: flex;
  padding: 20px;
  gap: 20px;
}

.details-left {
  flex-shrink: 0;
}

.details-poster {
  width: 160px;
  height: auto;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--bili-border-color, #e3e5e7);
  background-color: var(--bili-bg-gray);
}

.details-right {
  flex-grow: 1;
  min-width: 0;
  color: var(--bili-text-main);
}

.details-official-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 10px 0;
  line-height: 1.3;
}

.details-stats, .details-meta {
  font-size: 13px;
  color: var(--bili-text-secondary);
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}
.details-stats span, .details-meta span {
  display: inline-flex;
  align-items: center;
}
.details-stats i, .details-meta i {
  margin-right: 4px;
  font-style: normal;
}

.details-rating {
  display: flex;
  align-items: baseline;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--bili-text-secondary);
}
.details-rating-empty {
    font-size: 13px;
    color: var(--bili-text-light);
    margin-bottom: 12px;
}

.rating-score {
  font-size: 28px;
  font-weight: 600;
  color: #ffa000;
  margin-right: 2px;
}
.rating-unit {
  font-size: 14px;
  color: #ffa000;
  margin-right: 6px;
}

.details-actions {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.action-btn i {
  font-style: normal;
}

.favorite-btn {
  background-color: var(--bili-pink);
  color: white;
}
.favorite-btn:hover {
  background-color: #e0688a;
}

.channel-btn {
  background-color: var(--bili-bg-hover);
  color: var(--bili-text-main);
  border: 1px solid var(--bili-border-color);
}
.channel-btn:hover {
  background-color: var(--bili-border-color);
}

.details-synopsis {
  font-size: 13px;
  line-height: 1.6;
  color: var(--bili-text-secondary);
}
.details-synopsis strong {
  color: var(--bili-text-main);
  font-weight: 500;
}

/* 详情加载骨架屏 (NEW STYLES) */
.details-loading-skeleton {
    display: flex;
    padding: 20px;
    gap: 20px;
}
.skeleton-poster {
    width: 160px;
    height: calc(160px * 4 / 3);
    background-color: var(--bili-skeleton-bg);
    border-radius: 6px;
    animation: pulse 1.5s infinite ease-in-out;
}
.skeleton-text-lines {
    flex-grow: 1;
}
.skeleton-line {
    height: 1em;
    background-color: var(--bili-skeleton-bg);
    border-radius: 4px;
    margin-bottom: 10px;
    animation: pulse 1.5s infinite ease-in-out;
}
.skeleton-line.title { width: 60%; height: 1.5em; margin-bottom: 15px; }
.skeleton-line.short { width: 40%; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.long { width: 90%; }

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
}
.details-error-message {
    padding: 20px;
    color: var(--bili-pink);
    text-align: center;
}

/* 侧边栏样式 */
.sidebar-area {
  width: 360px;
  flex-shrink: 0;
  background-color: var(--bili-bg-light, #fff);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--bili-text-main, #18191c);
  padding: 8px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--bili-border-color, #e3e5e7);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.episode-count-display {
    font-size: 13px;
    font-weight: normal;
    color: var(--bili-text-light);
}


.group-selector-tabs {
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.group-selector-tabs::-webkit-scrollbar {
  height: 6px;
}
.group-selector-tabs::-webkit-scrollbar-thumb {
  background: var(--bili-border-color, #e3e5e7);
  border-radius: 3px;
}
.group-selector-tabs::-webkit-scrollbar-track {
  background: transparent;
}


.tabs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  white-space: nowrap;
}
.tab-item-loading, .tab-item-empty { /* Added .tab-item-empty */
    padding: 6px 12px;
    font-size: 14px;
    color: var(--bili-text-light);
}

.tab-item {
  padding: 6px 12px;
  margin-right: 8px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 13px;
  color: var(--bili-text-secondary);
  background-color: var(--bili-bg-gray);
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.tab-item:hover {
  background-color: var(--bili-bg-hover);
  color: var(--bili-text-main);
}

.tab-item.active {
  background-color: var(--bili-pink-light);
  color: var(--bili-pink);
  font-weight: 600;
}

.episode-selector-grid {
  flex-grow: 1;
  overflow-y: auto;
}

.episode-selector-grid::-webkit-scrollbar {
  width: 6px;
}
.episode-selector-grid::-webkit-scrollbar-thumb {
  background: var(--bili-border-color, #e3e5e7);
  border-radius: 3px;
}

.grid-header {
  font-size: 13px;
  color: var(--bili-text-light, #9499a0);
  padding: 4px 0;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.grid-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 10px 8px;
}

.grid-item {
  min-height: 36px;
  border: 1px solid var(--bili-border-color, #e3e5e7);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  color: var(--bili-text-main);
  background-color: var(--bili-bg-light, #fff);
  transition: border-color 0.2s, background-color 0.2s, color 0.2s, box-shadow 0.2s;
  overflow: hidden;
  text-align: center;
  padding: 4px;
}
.grid-item .episode-number {
  font-weight: 500;
}

.grid-item:hover {
  border-color: var(--bili-pink, #fb7299);
  color: var(--bili-pink, #fb7299);
  box-shadow: 0 0 0 1px var(--bili-pink, #fb7299) inset;
}

.grid-item.active {
  background-color: var(--bili-pink, #fb7299);
  color: #fff;
  border-color: var(--bili-pink, #fb7299);
  font-weight: 600;
}

.grid-loading, .grid-empty, .grid-placeholder {
  padding: 20px;
  text-align: center;
  color: var(--bili-text-light, #9499a0);
  font-size: 13px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式调整 */
@media (max-width: 1200px) {
    .sidebar-area {
        width: 320px;
    }
}

@media (max-width: 1024px) {
  .player-layout-wrapper {
    flex-direction: column;
  }
  .sidebar-area {
    width: 100%;
    max-height: 50vh;
    margin-top: 20px;
  }
}

@media (max-width: 768px) {
  .bangumi-player-page {
    padding: 10px;
  }
  .player-layout-wrapper {
    gap: 15px;
  }
  .video-info-section {
    padding: 12px 15px;
  }
  .bangumi-title {
    font-size: 18px;
     max-height: 2.6em;
  }
  .episode-current-info {
    font-size: 13px;
  }

  .bangumi-extended-details {
    flex-direction: column;
    padding: 15px;
  }
  .details-poster {
    width: 120px;
    margin: 0 auto 15px auto;
  }
  .details-official-title {
    font-size: 20px;
  }
  .details-stats, .details-meta, .details-rating {
    font-size: 12px;
  }
  .rating-score { font-size: 24px;}

  .sidebar-area {
    padding: 10px;
    max-height: 45vh;
  }
  .grid-list {
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 8px 6px;
  }
  .tab-item {
    padding: 5px 10px;
    font-size: 13px;
  }
}

/* NEW STYLES for Play Prompt */
.play-prompt-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.play-prompt-title {
  font-size: 1.1em;
  color: var(--bili-text-secondary-on-dark, #e0e0e0);
  margin-bottom: 4px;
}
.play-prompt-ep-info {
  font-size: 1.3em;
  font-weight: 500;
  color: var(--bili-text-main-on-dark, #ffffff);
}
.play-confirmation-button {
  background-color: var(--bili-pink, #fb7299);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.play-confirmation-button:hover {
  background-color: var(--bili-pink-hover, #f0608a);
}
.play-btn-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
/* END NEW STYLES */
</style> 