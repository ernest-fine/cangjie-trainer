import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site from /cangjie-trainer/; local dev and tests use /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cangjie-trainer/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}))
