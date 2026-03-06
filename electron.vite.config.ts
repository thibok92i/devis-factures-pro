import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'

// Load .env file
const env = config().parsed || {}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.LICENSE_KEY_SECRET': JSON.stringify(env.LICENSE_KEY_SECRET || '')
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    root: resolve('src/renderer')
  }
})
