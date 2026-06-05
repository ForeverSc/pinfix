import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pinfix from 'pinfix/vite'

export default defineConfig({
  plugins: [react(), pinfix({ debug: true })],
})
