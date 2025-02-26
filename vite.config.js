import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: 'globalThis'  // global을 globalThis로 정의
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090', // 백엔드 주소
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
})
