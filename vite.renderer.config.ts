import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Standalone Vite config for renderer-only dev server (browser preview).
 * Used by `npm run dev:renderer` — no Electron, no main/preload builds.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost'
  }
})
