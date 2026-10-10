import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    host: true,
    allowedHosts: true,
    fs: {
      // Allow serving files from two levels up (the workspace root)
      allow: ['../..']
    },
    // Proxies local /api/v1 and /uploads requests from port 4000 to port 3333
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
    // Force Vite to resolve the shared package from the source file
    alias: {
      '@idp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
    }
  }
})