import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pinfix from '@pinfix/plugin/vite'

export default defineConfig({
  plugins: [vue(), pinfix({ debug: true })],
})
