import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    fs: {
      allow: ['../..']
    },
    // Proxies local /api/v1 and /uploads requests from localhost:3000 to localhost:3333
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@idp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
    }
  }
})