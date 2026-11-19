import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from '@/i18n'
import '@/styles/global.css'
/** Element Plus 样式：保证 ElMessageBox / ElMessage 及遮罩层正常显示，避免巨大黑色块、弹窗错位 */
import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
