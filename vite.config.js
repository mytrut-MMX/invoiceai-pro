import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ledger: [
            './src/utils/ledger/ledgerService.js',
            './src/utils/ledger/defaultAccounts.js',
            './src/utils/ledger/fetchUserAccounts.js',
            './src/utils/ledger/generateAlerts.js',
          ],
        },
      },
    },
  },
})
