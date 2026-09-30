/// <reference types="vitest/config" />
import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // The backend also serves /capabilities, /health, /ready and /docs at the
      // root, so proxy those too during development.
      ...Object.fromEntries(
        ['/api', '/capabilities', '/health', '/ready', '/docs', '/redoc', '/openapi.json'].map(
          (path) => [
            path,
            { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000', changeOrigin: true },
          ],
        ),
      ),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['motion'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
