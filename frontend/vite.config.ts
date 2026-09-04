import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// NOTE: this file used to begin with `import './fix_registration_masters.js'`,
// a codemod that walked src/pages/registration and rewrote .tsx files on every
// config load — including during `vite build`. A build that mutates its own
// source cannot produce a reproducible image. It was verified to be a no-op
// (already fully applied) before removal; the script itself is still in the
// repo if it is ever needed again.

// Where the dev server forwards /api/v1 and /uploads. In a built image nginx
// does this (frontend/nginx.conf); the dev server has to do it itself so that
// VITE_API_URL can stay the relative '/api/v1' in every environment.
//   bare `npm run dev`        → http://localhost:8000
//   docker-compose.local.yml  → http://backend:8000
const apiTarget = process.env.VITE_DEV_API_PROXY || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
})
