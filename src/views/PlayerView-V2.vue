<template>
<div class="player-view-v2-page" :style="{ backgroundColor: pageStyle.backgroundColor }">
  <div v-if="pageInitialLoading" class="page-status-fullscreen">
    <p>少女祈祷中...</p>
  </div>
  <div v-else-if="pageError" class="page-status-fullscreen error">
    <p>{{ pageError }}</p>
    <p>请检查网络或番剧ID是否正确。</p>
  </div>
  <div v-else-if="!bangumiDetails && !groupedEpisodesData.length" class="page-status-fullscreen">
    <p>Σ( ° △ °|||)︴ 抱歉，该番剧暂无任何信息~</p>
  </div>

    <div v-else :class="['player-layout-container', { 'fullscreen-mode': isPlayerFullscreen || isPlayerWebFullscreen }]">
      <!-- Left Column: Player and Info in one card -->
      <div :class="['left-column', { 'fullscreen-mode': isPlayerFullscreen || isPlayerWebFullscreen }]">
        <div :class="['player-card', { 'fullscreen-mode': isPlayerFullscreen || isPlayerWebFullscreen }]">
          <div class="video-context-info" v-if="bangumiDetails && !isPlayerFullscreen && !isPlayerWebFullscreen">
            <h3 class="main-series-title">{{ bangumiMainTitle }}</h3>
            <p class="bangumi-subtitle">
              <span v-if="selectedEpisode && selectedGroup && selectedResolution && selectedSubGroup">
                {{ selectedGroup.group_name }} - {{ selectedResolution.resolution_name }} - {{ selectedSubGroup.sub_type }} - 第 {{ selectedEpisode.episode }} 话
              </span>
              <span v-else-if="selectedSubGroup && currentEpisodeList.length > 0">
                {{ selectedGroup?.group_name }} - {{ selectedResolution?.resolution_name }} - {{ selectedSubGroup.sub_type }} - 请选择集数
              </span>
              <span v-else-if="selectedSubGroup && currentEpisodeList.length === 0">
                {{ selectedGroup?.group_name }} - {{ selectedResolution?.resolution_name }} - {{ selectedSubGroup.sub_type }} - 暂无剧集
              </span>
              <span v-else-if="selectedResolution && (!selectedSubGroup || subGroupsForSelectedResolution.length === 0)">
                {{ selectedGroup?.group_name }} - {{ selectedResolution.resolution_name }} - 请选择字幕类型或暂无字幕类型
              </span>
              <span v-else-if="selectedGroup && (!selectedResolution || resolutionsForSelectedGroup.length === 0)">
                {{ selectedGroup.group_name }} - 请选择分辨率或暂无分辨率
              </span>
              <span v-else-if="!selectedGroup && groupedEpisodesData.length > 0">请选择字幕组</span>
              <span v-else>暂无播放信息，请选择剧集</span>
            </p>
            <div class="current-episode-playback-details">
              <div class="playback-stats">
                <span class="stat-item">
                  <Play theme="outline" size="14" fill="#61666d" class="stat-icon"/>
                  {{ formatCount(bangumiDetails.view_count) }}
                </span>
                <span class="stat-item rating-stat" :title="bangumiDetails.rating_count > 0 ? `${bangumiDetails.rating_count}人评价` : '暂无评价'">
                  <template v-if="bangumiDetails.rating_count > 0 && bangumiDetails.rating_avg > 0">
                    <template v-for="i in 5" :key="`star-rating-${i}`">
                      <Star v-if="i <= roundedStarRating" theme="filled" size="14" fill="#ffc107" class="stat-icon star-icon"/>
                      <Star v-else theme="outline" size="14" fill="#e0e0e0" class="stat-icon star-icon empty-star-color"/>
                    </template>
                  </template>
                  <template v-else>
                    <Star v-for="i in 5" :key="`star-empty-${i}`" theme="outline" size="14" fill="#e0e0e0" class="stat-icon star-icon empty-star-color"/>
                  </template>
                  <span class="rating-text">{{ (bangumiDetails.rating_count > 0 && bangumiDetails.rating_avg > 0) ? bangumiDetails.rating_avg.toFixed(1) : '暂无评分' }}</span>
                </span>
              </div>
            </div>
          </div>
          <div :class="['video-player-wrapper', { 'fullscreen-mode': isPlayerFullscreen || isPlayerWebFullscreen }]">
            <TorrentPlayer
              v-if="activeTorrentUrl"
              :torrent-url="activeTorrentUrl"
              class="torrent-player-instance"
              @fullscreen-change="handlePlayerFullscreenChange"
              @web-fullscreen-change="handlePlayerWebFullscreenChange"
            />
            <div v-else class="video-placeholder">
              <!-- Case 1: Episode selected, waiting for play confirmation -->
              <template v-if="selectedEpisode">
                <div class="play-prompt-container">
                  <p class="play-prompt-title">准备播放：</p>
                  <p class="play-prompt-ep-info">
                    <span v-if="selectedGroup">{{ selectedGroup.group_name }}</span>
                    <span v-if="selectedResolution"> - {{ selectedResolution.resolution_name }}</span>
                    <span v-if="selectedSubGroup"> - {{ selectedSubGroup.sub_type }}</span>
                    <span> - 第 {{ selectedEpisode.episode }} 话</span>
                  </p>
                  <button @click="playSelectedEpisode" class="play-confirmation-button">
                    <PlayOne theme="filled" size="18" class="play-btn-icon"/>
                    立即播放
                  </button>
                </div>
              </template>

              <!-- Case 2: No episode selected yet, various guiding messages -->
              <template v-else>
                <p v-if="episodesLoading && groupedEpisodesData.length === 0">字幕组和剧集列表加载中...</p>
                <p v-else-if="episodesLoading && selectedGroup && !selectedResolution">当前字幕组分辨率加载中...</p>
                <p v-else-if="episodesLoading && selectedResolution && !selectedSubGroup">当前分辨率字幕类型加载中...</p>
                <p v-else-if="episodesLoading && selectedSubGroup && currentEpisodeList.length === 0">当前字幕类型剧集加载中...</p>
                <p v-else-if="!selectedGroup && groupedEpisodesData.length > 0">请在右侧选择字幕组</p>
                <p v-else-if="selectedGroup && resolutionsForSelectedGroup.length === 0 && !episodesLoading">当前字幕组暂无分辨率</p>
                <p v-else-if="selectedResolution && subGroupsForSelectedResolution.length === 0 && !episodesLoading">当前分辨率暂无字幕类型</p>
                <p v-else-if="selectedSubGroup && currentEpisodeList.length === 0 && !episodesLoading">当前字幕类型暂无资源</p>
                <p v-else-if="selectedSubGroup && currentEpisodeList.length > 0">请选择一集进行播放</p>
                <p v-else-if="!groupedEpisodesData.length && !episodesLoading && !episodesError && !detailsError">暂无任何剧集数据</p>
                <p v-else-if="episodesError && !groupedEpisodesData.length">剧集加载失败: {{ episodesError }}</p>
                <p v-else>播放器准备就绪</p> <!-- Generic fallback -->
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Details and Episode Selection -->
      <div
        class="right-column"
        v-if="bangumiDetails"
        v-show="!isPlayerFullscreen && !isPlayerWebFullscreen"      >
        <div class="bangumi-info-card">
          <img 
            :src="computedPosterUrl" 
            :alt="bangumiDetails.official_title" 
            class="poster" 
            @error="($event.target as HTMLImageElement).src='/default-poster.png'"
          />
          <div class="info-content">
            <h2 class="title" :title="bangumiDetails.official_title">
              {{ bangumiDetails.official_title }}
            </h2>
            <div class="meta-tags">
              <span>年份: {{ bangumiDetails.year }}</span>
              <span>季度: 第{{ bangumiDetails.season }}季</span>
              <span>来源: {{ bangumiDetails.source }}</span>
            </div>
            <div class="action-buttons">
              <button class="action-btn favorite-btn">
                <Heart theme="outline" size="16" class="btn-icon"/>
                追番
              </button>
              <button class="action-btn channel-btn">番剧频道</button>
            </div>
            <div class="synopsis">
              <p><strong>简介：</strong>{{ synopsisText }} <a href="#" class="view-details-link">查看详情 &gt;</a></p>
            </div>
          </div>
        </div>
        
        <div class="episode-selection-panel">
          <h3 class="panel-title">选集</h3>
          <div class="selection-cascader">
            <!-- 字幕组选择 -->
            <div class="subtitle-group-tabs selector-level">
              <h4 class="selector-label">字幕组:</h4>
              <button
                v-for="group in groupedEpisodesData"
                :key="group.group_name"
                class="tab-btn"
                :class="{ active: selectedGroup?.group_name === group.group_name }"
                @click="selectGroupHandler(group)"
                :title="group.group_name"
              >
                {{ group.group_name }}
              </button>
              <span v-if="episodesLoading && groupedEpisodesData.length === 0" class="tab-loading-placeholder">字幕组加载中...</span>
              <span v-if="!episodesLoading && groupedEpisodesData.length === 0 && !episodesError" class="tab-empty-placeholder">无字幕组</span>
            </div>

            <!-- 分辨率选择 -->
            <div v-if="selectedGroup && resolutionsForSelectedGroup.length > 0" class="resolution-tabs selector-level">
              <h4 class="selector-label">分辨率:</h4>
              <button
                v-for="resolution in resolutionsForSelectedGroup"
                :key="resolution.resolution_name"
                class="tab-btn"
                :class="{ active: selectedResolution?.resolution_name === resolution.resolution_name }"
                @click="selectResolutionHandler(resolution)"
                :title="resolution.resolution_name"
              >
                {{ resolution.resolution_name }}
              </button>
            </div>
            <div v-else-if="selectedGroup && resolutionsForSelectedGroup.length === 0 && !episodesLoading" class="selector-level-status">当前字幕组无分辨率信息</div>

            <!-- 子类型选择 -->
            <div v-if="selectedResolution && subGroupsForSelectedResolution.length > 0" class="subgroup-tabs selector-level">
              <h4 class="selector-label">类型:</h4>
              <button
                v-for="subGroup in subGroupsForSelectedResolution"
                :key="subGroup.sub_type"
                class="tab-btn"
                :class="{ active: selectedSubGroup?.sub_type === subGroup.sub_type }"
                @click="selectSubGroupHandler(subGroup)"
                :title="subGroup.sub_type"
              >
                {{ subGroup.sub_type }}
              </button>
            </div>
            <div v-else-if="selectedResolution && subGroupsForSelectedResolution.length === 0 && !episodesLoading" class="selector-level-status">当前分辨率无字幕类型</div>
          </div>

          <div class="episode-grid-container">
            <div v-if="episodesLoading && selectedSubGroup && currentEpisodeList.length === 0" class="grid-status">当前字幕类型剧集加载中...</div>
            <ul v-else-if="currentEpisodeList.length > 0" class="episode-grid">
              <li
                v-for="episode in currentEpisodeList"
                :key="episode.url" 
                class="episode-item"
                :class="{ active: selectedEpisode?.url === episode.url }"
                @click="selectEpisodeHandler(episode)"
                :title="`第 ${episode.episode} 集`"
              >
                {{ episode.episode }}
              </li>
            </ul>
            <div v-else-if="!episodesLoading && selectedSubGroup && currentEpisodeList.length === 0" class="grid-status">该字幕类型暂无资源</div>
            <div v-else-if="!episodesLoading && selectedResolution && subGroupsForSelectedResolution.length > 0 && !selectedSubGroup" class="grid-status">请选择上方的字幕类型</div>
            <div v-else-if="!episodesLoading && selectedGroup && resolutionsForSelectedGroup.length > 0 && !selectedResolution" class="grid-status">请选择上方的分辨率</div>
            <div v-else-if="!episodesLoading && !selectedGroup && groupedEpisodesData.length > 0" class="grid-status">请先选择上方的字幕组</div>
            <div v-else-if="!episodesLoading && groupedEpisodesData.length === 0 && !episodesError" class="grid-status">此番剧暂无任何剧集信息</div>
          </div>
        </div>
      </div>
       <div class="right-column placeholder-column" v-else-if="detailsLoading">
           <p>番剧详情加载中...</p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, watchEffect, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import TorrentPlayer from '@/components/TorrentPlayer.vue'
import { Play, Star, PlayOne, Heart } from '@icon-park/vue-next';

// --- TypeScript 接口定义 --- 
interface Episode {
  episode: number;
  url: string;
  release_date: string;
  // resolution is now part of Resolution interface or can be derived
}

interface SubGroup {
  sub_type: string;
  episodes: Episode[];
}

interface Resolution {
  resolution_name: string;
  sub_groups: SubGroup[];
}

interface GroupedEpisode {
  group_name: string;
  resolutions: Resolution[];
}

interface GroupedApiResponse {
  code: number;
  message: string;
  data: GroupedEpisode[];
}

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
  // Add other relevant fields, e.g., synopsis if available directly
}

interface BangumiDetailApiResponse {
  code: number;
  message: string;
  data: BangumiDetail | null;
}

// --- Component State ---
const route = useRoute()
const bangumiId = ref<string | null>(null)

// 番剧详情
const bangumiDetails = ref<BangumiDetail | null>(null)
const detailsLoading = ref(false)
const detailsError = ref<string | null>(null)

// 剧集列表
const groupedEpisodesData = ref<GroupedEpisode[]>([])
const episodesLoading = ref(false)
const episodesError = ref<string | null>(null)

// 用户选择
const selectedGroup = ref<GroupedEpisode | null>(null)
const selectedResolution = ref<Resolution | null>(null) // 新增：选中的分辨率
const selectedSubGroup = ref<SubGroup | null>(null) // 新增：选中的子类型
const selectedEpisode = ref<Episode | null>(null)
const activeTorrentUrl = ref<string>('') // URL for TorrentPlayer

// 新增：播放器全屏状态
const isPlayerFullscreen = ref(false)
const isPlayerWebFullscreen = ref(false)
const handlePlayerFullscreenChange = (val: boolean) => {
  isPlayerFullscreen.value = val
}
const handlePlayerWebFullscreenChange = (val: boolean) => {
  isPlayerWebFullscreen.value = val
}

// --- Loading/Error States for UI ---
const pageInitialLoading = computed(() => {
  return (episodesLoading.value && groupedEpisodesData.value.length === 0) ||
         (detailsLoading.value && !bangumiDetails.value);
});

const pageError = computed(() => {
    if (episodesError.value && groupedEpisodesData.value.length === 0 && !bangumiDetails.value) return `剧集列表加载失败: ${episodesError.value}`;
    if (detailsError.value && !bangumiDetails.value && !groupedEpisodesData.value.length) return `番剧详情加载失败: ${detailsError.value}`;
    if (episodesError.value && detailsError.value) return "番剧信息和剧集列表加载均失败。";
    return null;
});

// --- Utility Functions (借鉴自 BangumiPlayer.vue) ---
const formatCount = (count: number | undefined): string => {
  if (typeof count !== 'number') return '0';
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1).replace(/\.0$/, "") + '亿';
  }
  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, "") + '万';
  }
  return count.toString();
};

const posterUrl = (link: string | undefined): string => {
  const placeholder = '/default-poster.png'; // 确保有此占位图
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!link) return placeholder;

  // 如果链接已经是完整的 HTTP/HTTPS URL，直接返回
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }

  let formattedLink = link.replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (formattedLink.startsWith('uploads/')) {
    if (viteApiBaseUrl) {
      const base = viteApiBaseUrl.endsWith('/') ? viteApiBaseUrl.slice(0, -1) : viteApiBaseUrl;
      return `${base}/${formattedLink}`;
    }
    return `/${formattedLink}`;
  }
  return formattedLink.startsWith('http') ? formattedLink : placeholder;
};

// --- Data Fetching ---
const fetchBangumiDetails = async (id: string) => {
  detailsLoading.value = true;
  detailsError.value = null;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await axios.get<BangumiDetailApiResponse>(`/api/v1/bangumi/${id}`, { headers });
    if (response.data.code === 200 && response.data.data) {
      bangumiDetails.value = response.data.data;
    } else {
      throw new Error(response.data.message || '获取番剧详情失败');
    }
  } catch (err) {
    console.error('获取番剧详情时出错:', err);
    detailsError.value = err instanceof Error ? err.message : String(err);
  } finally {
    detailsLoading.value = false;
  }
};

const fetchGroupedEpisodes = async (id: string) => {
  episodesLoading.value = true;
  episodesError.value = null;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await axios.get<GroupedApiResponse>(`/api/v1/bangumi/grouped_items/${id}`, { headers });
    if (response.data.code === 200 && response.data.data) {
      groupedEpisodesData.value = response.data.data;
      if (groupedEpisodesData.value.length > 0 && !selectedGroup.value) {
        selectedGroup.value = groupedEpisodesData.value[0]; // 默认选中第一个字幕组
      }
    } else {
      throw new Error(response.data.message || '获取剧集列表失败');
    }
  } catch (err) {
    console.error('获取剧集列表时出错:', err);
    episodesError.value = err instanceof Error ? err.message : String(err);
  } finally {
    episodesLoading.value = false;
  }
};

// --- Computed Properties for UI ---
const bangumiMainTitle = computed(() => {
  if (!bangumiDetails.value) return '番剧标题加载中...';
  let title = bangumiDetails.value.official_title;
  return title;
});

const resolutionsForSelectedGroup = computed(() => {
  return selectedGroup.value ? selectedGroup.value.resolutions : [];
});

const subGroupsForSelectedResolution = computed(() => {
  return selectedResolution.value ? selectedResolution.value.sub_groups : [];
});

const episodesForSelectedSubGroup = computed(() => {
  return selectedSubGroup.value ? selectedSubGroup.value.episodes : [];
});

// 旧的 episodesForSelectedGroup 逻辑需要更新或移除，取决于UI如何处理
// 暂时保留一个基于当前选择的剧集列表，方便后续UI调整
const currentEpisodeList = computed(() => {
  if (selectedSubGroup.value) {
    return selectedSubGroup.value.episodes;
  }
  return [];
});

const synopsisText = computed(() => {
    if (!bangumiDetails.value) return "简介加载中...";
    const title = bangumiDetails.value.official_title;
    const year = bangumiDetails.value.year;
    const season = bangumiDetails.value.season > 0 ? `第${bangumiDetails.value.season}季` : '';
    const source = bangumiDetails.value.source || '网络';

    return `${title} (${year}${season ? ` ${season}` : ''}) 是一部广受欢迎的作品。当前暂无更详细的剧情摘要。本资源信息主要来源于${source}。请欣赏视频内容。`;
});

const roundedStarRating = computed(() => {
  if (bangumiDetails.value && bangumiDetails.value.rating_avg > 0 && bangumiDetails.value.rating_count > 0) {
    return Math.round(bangumiDetails.value.rating_avg / 2);
  }
  return 0;
});

const blurredBgImageCssUrl = ref('none');

// 生成带 webp 参数的背景图 URL（与 poster 一致，使用固定宽高或窗口宽高）
const getDynamicBgUrl = () => {
  if (!bangumiDetails.value || !bangumiDetails.value.poster_link) return 'none';
  // 取窗口宽高，保证背景模糊图足够大
  const width = window.innerWidth;
  const height = window.innerHeight;
  const baseUrl = posterUrl(bangumiDetails.value.poster_link);
  if (baseUrl && width && height) {
    return `url('${baseUrl}?width=${width}&height=${height}&format=webp')`;
  }
  return `url('${baseUrl}')`;
};

const updateDynamicBgUrl = () => {
  blurredBgImageCssUrl.value = getDynamicBgUrl();
};

watchEffect(() => {
  updateDynamicBgUrl();
});

onMounted(() => {
  window.addEventListener('resize', updateDynamicBgUrl);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateDynamicBgUrl);
});

const pageStyle = computed(() => {
  return {
    backgroundColor: 'transparent',
  };
});

// 新增：直接用固定宽高拼接 webp 参数，避免初始加载原图
const POSTER_WIDTH = 148;
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * 4 / 3); // 3:4 比例
const computedPosterUrl = computed(() => {
  if (!bangumiDetails.value || !bangumiDetails.value.poster_link) return '/default-poster.png';
  const baseUrl = posterUrl(bangumiDetails.value.poster_link);
  return `${baseUrl}?width=${POSTER_WIDTH}&height=${POSTER_HEIGHT}&format=webp`;
});

// --- Event Handlers ---
const selectGroupHandler = (group: GroupedEpisode) => {
  selectedGroup.value = group;
  selectedResolution.value = null; // 清空已选分辨率
  selectedSubGroup.value = null; // 清空已选子类型
  selectedEpisode.value = null; // 清空已选集数
  activeTorrentUrl.value = ''; // 停止当前播放
  // 自动选择第一个分辨率和子类型 (如果存在)
  if (group.resolutions && group.resolutions.length > 0) {
    selectedResolution.value = group.resolutions[0];
    if (selectedResolution.value.sub_groups && selectedResolution.value.sub_groups.length > 0) {
      selectedSubGroup.value = selectedResolution.value.sub_groups[0];
    }
  }
};

const selectResolutionHandler = (resolution: Resolution) => {
  selectedResolution.value = resolution;
  selectedSubGroup.value = null; // 清空已选子类型
  selectedEpisode.value = null; // 清空已选集数
  activeTorrentUrl.value = ''; // 停止当前播放
  // 自动选择第一个子类型 (如果存在)
  if (resolution.sub_groups && resolution.sub_groups.length > 0) {
    selectedSubGroup.value = resolution.sub_groups[0];
  }
};

const selectSubGroupHandler = (subGroup: SubGroup) => {
  selectedSubGroup.value = subGroup;
  selectedEpisode.value = null; // 清空已选集数
  activeTorrentUrl.value = ''; // 停止当前播放
};

const selectEpisodeHandler = (episode: Episode) => {
  selectedEpisode.value = episode;
};

const playSelectedEpisode = () => {
  if (selectedEpisode.value) {
    activeTorrentUrl.value = selectedEpisode.value.url;
  }
};

// --- Watchers ---
const initializeFromRoute = () => {
  const idFromRoute = route.params.id;
  if (typeof idFromRoute === 'string' && idFromRoute) {
    bangumiId.value = idFromRoute;
    fetchBangumiDetails(idFromRoute);
    fetchGroupedEpisodes(idFromRoute);
  } else {
    const invalidIdMsg = "番剧ID无效";
    episodesError.value = invalidIdMsg;
    detailsError.value = invalidIdMsg;
  }
};

watch(selectedGroup, (newGroup) => {
  if (newGroup) {
    selectedResolution.value = null;
    selectedSubGroup.value = null;
    selectedEpisode.value = null;
    activeTorrentUrl.value = '';
    if (newGroup.resolutions && newGroup.resolutions.length > 0) {
      selectedResolution.value = newGroup.resolutions[0];
      if (selectedResolution.value.sub_groups && selectedResolution.value.sub_groups.length > 0) {
        selectedSubGroup.value = selectedResolution.value.sub_groups[0];
      }
    }
  }
});

watch(selectedResolution, (newResolution) => {
  if (newResolution) {
    selectedSubGroup.value = null;
    selectedEpisode.value = null;
    activeTorrentUrl.value = '';
    if (newResolution.sub_groups && newResolution.sub_groups.length > 0) {
      selectedSubGroup.value = newResolution.sub_groups[0];
    }
  }
});

watch(selectedSubGroup, () => {
  selectedEpisode.value = null;
  activeTorrentUrl.value = '';
});


watch(selectedEpisode, (newEpisode) => {
  if (newEpisode) {
    // 清除当前播放URL，等待用户手动点击播放
    activeTorrentUrl.value = '';
  }
});

onMounted(() => {
  initializeFromRoute();
});

watch(() => route.params.id, (newId) => {
  if (newId !== bangumiId.value) {
    initializeFromRoute();
  }
});

</script>

<style scoped>
/* --- Global Page Styles --- */
.player-view-v2-page {
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  position: relative; /* Crucial for ::before pseudo-element positioning */
}

.player-view-v2-page::before {
  content: '';
  position: fixed; 
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: v-bind(blurredBgImageCssUrl);
  background-size: cover;
  background-position: center center;
  filter: blur(10px); 
  z-index: -1; 
}

/* --- Layout --- */
.player-layout-container {
  display: flex;
  gap: 20px;
  max-width: 1800px; /* Adjust as needed */
  margin: 0 auto;
}

/* 全屏时的布局样式 */
.player-layout-container.fullscreen-mode,
.left-column.fullscreen-mode,
.player-card.fullscreen-mode,
.video-player-wrapper.fullscreen-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important; /* 添加右边界约束 */
  width: 100% !important; /* 改用百分比而不是 vw */
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background: #000 !important;
  z-index: 1000 !important;
  max-width: 100% !important; /* 确保不会超出视口宽度 */
  overflow: hidden !important; /* 防止出现滚动条 */
}

.video-player-wrapper.fullscreen-mode {
  width: 100% !important;
  height: 100% !important;
  aspect-ratio: unset;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 确保 TorrentPlayer 组件在全屏模式下也能正确适应容器 */
.torrent-player-instance {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100vh !important;
  object-fit: contain !important;
}

.left-column {
  flex: 3;
  display: flex;
  min-width: 0;
}

.right-column {
  flex: 1.3; /* Details/episodes panel takes less space */
  background-color: rgba(255, 255, 255, 0.85); /* Adjust alpha for desired transparency */
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px); /* Safari compatibility */
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 40px); /* Allow scrolling if content exceeds viewport */
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.18); /* Optional: subtle border for glass edge effect */
}
.right-column.placeholder-column {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #61666d;
}

.player-card {
  background-color: rgba(255, 255, 255, 0.85); /* Adjust alpha for desired transparency */
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px); /* Safari compatibility */
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.18); /* Optional: subtle border for glass edge effect */
}
.video-context-info {
  padding: 0 0 16px 0;
  border-bottom: none;
  background: none;
  box-shadow: none;
}
.video-player-wrapper {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  width: 100%;
  margin-top: 0;
  box-shadow: none;
}

/* --- Left Column: Video Player & Info --- */
.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  background-color: #222;
  font-size: 1.1em;
}

.main-series-title {
  font-size: 20px;
  font-weight: 600;
  color: #18191c;
  margin: 0 0 4px 0;
}
.bangumi-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0 0 10px 0;
  line-height: 1.4;
  min-height: 1.4em; /* Ensure space even if text is short */
}
.current-episode-playback-details {
  font-size: 14px;
  color: #61666d;
}
.playback-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #61666d;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stat-icon { /* Common style for icons in stats */
  display: inline-flex; /* Helps with alignment */
  align-items: center;
}
.rating-text {
  margin-left: 4px;
}

/* --- Right Column: Bangumi Info & Episode Selection --- */
.bangumi-info-card {
  display: flex;
  gap: 15px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e7e7e7;
}
.poster {
  width: 148px; 
  height: auto; /* Height will be calculated based on aspect-ratio and width */
  aspect-ratio: 3 / 4; /* Corrected to 3:4 for vertical 4:3 feel (width 3, height 4) */
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #eee;
}
.info-content {
  flex: 1;
  min-width: 0; /* Prevents overflow issues in flex children */
}
.title {
  font-size: 18px;
  font-weight: 600;
  color: #18191c;
  margin: 0 0 8px 0;
  line-height: 1.3;
}
.meta-tags {
  font-size: 12px;
  color: #757575;
  display: flex;
  flex-direction: row; /* Changed from column to row */
  flex-wrap: wrap; /* Allow wrapping if items don't fit */
  gap: 12px; /* Added gap for spacing between items */
  margin-bottom: 12px;
}
.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.action-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 18px; /* Pill shape */
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.favorite-btn {
  background-color: #fb7299; /* Pink */
  color: white;
}
.favorite-btn:hover { background-color: #e0688a; }
.channel-btn {
  background-color: #f1f2f3; /* Light grey */
  color: #333;
  border: 1px solid #e0e0e0;
}
.channel-btn:hover { background-color: #e7e7e7; }

.synopsis {
  font-size: 12px;
  line-height: 1.6;
  color: #61666d;
}
.synopsis strong {
  color: #333;
  font-weight: 500;
}
.view-details-link {
  color: #fb7299;
  text-decoration: none;
  font-size: 12px;
  margin-left: 5px;
}
.view-details-link:hover { text-decoration: underline; }

.episode-selection-panel {
  flex-grow: 1; /* Take remaining space in right column */
  display: flex;
  flex-direction: column;
  min-height: 0; /* For overflow-y to work */
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #18191c;
  margin: 0 0 10px 0;
}
.subtitle-group-tabs {
  display: flex;
  flex-wrap: wrap; /* Allow tabs to wrap */
  gap: 8px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e7e7e7;
}
.tab-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  color: #555;
  border-radius: 15px; /* Pill shape */
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  border-color: #fb7299;
  color: #fb7299;
}
.tab-btn.active {
  background-color: #fb7299;
  color: white;
  border-color: #fb7299;
  font-weight: 500;
}
.selection-cascader {
  display: flex;
  flex-direction: column;
  gap: 15px; /* Space between selector levels */
}

.selector-level {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px; /* Space between label and buttons, and between buttons */
  padding-bottom: 10px;
  /* border-bottom: 1px solid #f0f0f0; */ /* Optional: if you want separators between levels */
}

.selector-level:last-child {
  border-bottom: none;
}

.selector-label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #333;
  margin-right: 5px; /* Space after the label */
  flex-shrink: 0; /* Prevent label from shrinking */
}

.selector-level-status {
  font-size: 0.9rem;
  color: #666;
  padding: 6px 0;
  width: 100%;
}

/* Adjust tab-btn if needed, e.g., for consistency if labels take up space */
/* .tab-btn { ... } */

.tab-loading-placeholder,
.tab-empty-placeholder {
    padding: 6px 12px;
    font-size: 13px;
    color: #909399;
}

.episode-grid-container {
  flex-grow: 1;
  overflow-y: auto; /* Scroll for episodes if they overflow */
}
.episode-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); /* Responsive columns */
  gap: 8px;
}
.episode-item {
  min-height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  background-color: #fff;
  transition: all 0.2s;
  text-align: center;
  padding: 4px; /* Ensure text isn't too cramped */
}
.episode-item:hover {
  border-color: #fb7299;
  color: #fb7299;
}
.episode-item.active {
  background-color: #fb7299;
  color: white;
  border-color: #fb7299;
  font-weight: 600;
}
.grid-status {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

/* Scrollbar styling for episode grid (optional, but nice) */
.episode-grid-container::-webkit-scrollbar, .right-column::-webkit-scrollbar {
  width: 6px;
}
.episode-grid-container::-webkit-scrollbar-thumb, .right-column::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.episode-grid-container::-webkit-scrollbar-track, .right-column::-webkit-scrollbar-track {
  background: #f1f1f1;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .player-layout-container {
    flex-direction: column;
  }
  .left-column, .right-column {
    flex: none; /* Reset flex proportions */
    width: 100%;
  }
  .right-column {
    max-height: 60vh; /* Adjust height for stacked layout */
  }
}

@media (max-width: 768px) {
  .player-view-v2-page {
    padding: 10px;
  }
  .player-card {
    padding: 15px; /* Reduce padding on smaller screens */
  }
  .right-column {
    padding: 15px;
  }
  .main-series-title {
    font-size: 16px;
  }
  .bangumi-info-card {
    flex-direction: column;
    align-items: center; /* Center content when stacked */
    text-align: center;
  }
  .poster { margin-bottom: 10px; }
  .action-buttons { justify-content: center; }
  .tab-btn, .episode-item { font-size: 12px; }
  .episode-grid { grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); }
}

/* NEW STYLES for Play Prompt */
.play-prompt-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 20px;
}
.play-prompt-title {
  font-size: 1.1em; 
  color: #e0e0e0; 
  margin-bottom: 4px;
}
.play-prompt-ep-info {
  font-size: 1.3em; 
  font-weight: 500;
  color: #ffffff; 
}
.play-confirmation-button {
  background-color: #fb7299; 
  color: white;
  border: none;
  padding: 10px 20px; 
  border-radius: 8px; 
  font-size: 1.0em; 
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.play-confirmation-button:hover {
  background-color: #e0688a; 
}
.play-btn-icon { /* Common style for icon in play button */
  fill: currentColor; /* Inherits color from button text (white) */
  display: inline-flex; /* Helps with alignment */
  align-items: center;
}

</style>
