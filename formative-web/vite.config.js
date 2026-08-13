import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed under /formative on the same Vercel project as Expo web.
export default defineConfig({
  plugins: [react()],
  base: '/formative/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: '/formative/',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
