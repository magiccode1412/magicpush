import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || ''

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      port: 5173,
      proxy: apiBaseUrl
        ? undefined
        : {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
            },
          },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // 复制 version.json 到 dist 目录
      copyPublicDir: true,
    },
  }
})
