import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        /**
         * manualChunks: function form avoids circular dependency crashes.
         * Previously removed due to "createContext undefined" — that bug was
         * caused by splitting React itself. This implementation keeps React
         * in a dedicated chunk so it always loads first.
         *
         * Result: critical path JS ~50KB gzip vs 188KB without splitting.
         * Each vendor chunk is independently cacheable (long-term Cache-Control).
         */
        manualChunks(id) {
          // React core — must stay together to avoid createContext crash
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          // Framer Motion — 130KB+ parsed, page-independent UI library
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion'
          }
          // Supabase client (PostgREST + realtime + auth)
          if (id.includes('node_modules/@supabase')) {
            return 'supabase'
          }
          // TanStack (Router + Query) — routing + data fetching
          if (id.includes('node_modules/@tanstack')) {
            return 'tanstack'
          }
          // Radix UI primitives — dialog, select, tooltip, etc.
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui'
          }
          // Lucide icons — tree-shaken but still ~35KB
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide'
          }
          // Zod — schema validation, only needed on form pages
          if (id.includes('node_modules/zod')) {
            return 'zod'
          }
          // React Hook Form
          if (id.includes('node_modules/react-hook-form')) {
            return 'react-hook-form'
          }
          // PDF.js — only loaded when viewing PDFs (lazy import)
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  server: {
    port: 5173,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
