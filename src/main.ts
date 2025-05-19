import './assets/main.css'
import 'global'
import { Buffer } from 'buffer'
import {install} from '@icon-park/vue-next/es/all';
import '@icon-park/vue-next/styles/index.css';
import IconParkPlugin from './plugins/icon-park'; // 引入您创建的插件

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 确保 webtorrent 等依赖库能正确访问 global 对象
if (typeof window !== 'undefined') {
  ;(window as any).global = window // 将 global 映射到 window
}

globalThis.Buffer = Buffer

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)


app.use(createPinia())
app.use(router)
app.use(IconParkPlugin) // 使用您创建的插件
app.use(ElementPlus) // 添加这一行来注册 Element Plus
app.mount('#app')