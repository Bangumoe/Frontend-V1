<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

interface CarouselItem {
  id: number
  title: string
  image: string
  link?: string // Add link property
  is_active?: boolean // Add active property
}

const props = defineProps<{
  items: CarouselItem[]
}>()

const activeItems = computed(() => props.items.filter(item => item.is_active === true))

const currentIndex = ref(0)
let timer: number | null = null

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % activeItems.value.length
}

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + activeItems.value.length) % activeItems.value.length
}

const startAutoPlay = () => {
  // Only start autoplay if there are active items
  if (activeItems.value.length > 0) {
    timer = window.setInterval(nextSlide, 5000)
  }
}

const stopAutoPlay = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})

// Reset index if active items change or become empty
watch(activeItems, (newItems) => {
  if (currentIndex.value >= newItems.length) {
    currentIndex.value = newItems.length > 0 ? 0 : -1; // Set to -1 if no active items
  }
  // Restart autoplay if active items change
  stopAutoPlay();
  startAutoPlay();
}, { immediate: true });

</script>

<template>
  <div class="carousel-container" @mouseenter="stopAutoPlay" @mouseleave="startAutoPlay">
    <div class="carousel-track" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div v-for="item in activeItems" :key="item.id" class="carousel-slide">
        <a v-if="item.link" :href="item.link" target="_blank" rel="noopener noreferrer">
          <img :src="item.image" :alt="item.title" />
          <div class="slide-title">{{ item.title }}</div>
        </a>
        <template v-else>
          <img :src="item.image" :alt="item.title" />
          <div class="slide-title">{{ item.title }}</div>
        </template>
      </div>
    </div>
    
    <button class="carousel-button prev" @click="prevSlide">❮</button>
    <button class="carousel-button next" @click="nextSlide">❯</button>
    
    <div class="carousel-dots" v-if="activeItems.length > 0">
      <button
        v-for="(_, index) in activeItems"
        :key="index"
        class="dot"
        :class="{ active: index === currentIndex }"
        @click="currentIndex = index"
      />
    </div>
  </div>
</template>

<style scoped>
.carousel-container {
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
  border-radius: 8px;
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.carousel-slide {
  flex: 0 0 100%;
  position: relative;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-title {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.carousel-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 20px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.carousel-button:hover {
  background: rgba(0, 0, 0, 0.7);
}

.prev {
  left: 20px;
}

.next {
  right: 20px;
}

.carousel-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dot.active {
  background: white;
}
</style>