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
    }
  },
  resolve: {
    alias: {
      '@idp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
    }
  }
})