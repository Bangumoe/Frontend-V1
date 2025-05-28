import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue' // 确保正确导入 vue 插件
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [
      vue(), // 确保 vue 插件被正确启用
      vueDevTools(),
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        'path': 'path-browserify',
        'stream': 'stream-browserify',
        'crypto': 'crypto-browserify',
        'buffer': 'buffer',
        'events': 'events',
        'assert': 'assert',
        'http': 'stream-http',
        'https': 'https-browserify',
        'os': 'os-browserify',
        'process': 'process/browser',
        'util': 'util',
        'global': 'global' // 确保 global 别名已正确配置
      },
      
    },

    optimizeDeps: {
      include: [
        'path-browserify',
        'stream-browserify',
        'crypto-browserify',
        'buffer',
        'events',
        'assert',
        'stream-http',
        'https-browserify',
        'os-browserify',
        'process/browser',
        'util',
        'global' // 确保 global 被包含在优化依赖中
      ]
    },
    
    server: {
      allowedHosts: [
        'mi.jamyido.cn'
      ],
      proxy: {
        '/mikan': {
          target: env.VITE_MIKAN_BASE_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/mikan/, '')
        },
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('dayjs')) { // 优先处理 dayjs
                return 'dayjs';
              }
              if (id.includes('element-plus')) {
                return 'element-plus';
              }
              if (id.includes('lodash-es')) {
                return 'lodash-es';
              }
              if (id.includes('axios')) {
                return 'axios';
              }
              // 对于 vue 全家桶，通常 vite 会有默认的智能分割，但也可以显式指定
              if (id.includes('vue-router') || id.includes('@vue/shared') || id.includes('@vue/runtime-core') || id.includes('@vue/reactivity') || id.includes('vue')) {
                return 'vue-vendor'; 
              }
              // 将其他 node_modules 放入一个通用的 vendor chunk
              // return 'vendor'; // 可以选择将其他第三方库打包到 vendor
            }
          }
        }
      }
    }
  }
})