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
    }
  },
  resolve: {
    // Force Vite to resolve the shared package from the source file
    alias: {
      '@idp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
    }
  }
})