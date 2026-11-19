import { defineConfig, mergeConfig } from 'vite'
import baseConfig from './vite.config'

// Explicit local entry; the production build keeps using vite.config.ts.
export default mergeConfig(baseConfig, defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080' },
    },
  },
}))
