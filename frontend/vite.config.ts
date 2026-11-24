/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies /api to the Go service, so the browser talks to a
// single origin in development, just like behind nginx in Docker.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Test coverage reports are written inside the project; don't reload the page for them.
    watch: { ignored: ['**/coverage/**'] },
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/testing.ts', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
    },
  },
})
