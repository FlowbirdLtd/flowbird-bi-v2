import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pinned: other local projects hold 5173. A fixed port keeps the URL stable
  // and matches auth.additional_redirect_urls in supabase/config.toml, which the
  // invite → /set-password flow checks exactly. strictPort so a clash fails
  // loudly instead of silently drifting to another port.
  server: { port: 5174, strictPort: true },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    passWithNoTests: true,
  },
})
