import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Promptbox/', // Aggiungi questa linea
  build: {
    rollupOptions: {
      external: ['@supabase/supabase-js']
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js']
  }
})
