import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // allow the sandbox/preview host names (and any tunnel) to reach the dev server
    allowedHosts: true,
    strictPort: false,
    proxy: {
      // the FastAPI backend runs on :8000 — the browser only ever talks to :5173
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})
