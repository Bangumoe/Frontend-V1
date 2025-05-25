import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue' // 确保正确导入 vue 插件
import vueDevTools from 'vite-plugin-vue-devtools'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
    plugins: [
      vue(), // 确保 vue 插件被正确启用
      vueDevTools(),
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
    }
  }
})