import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fakeBackend } from './server/plugin'

export default defineConfig({
  plugins: [react(), fakeBackend()],
})
