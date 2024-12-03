// frontend/vite.config.ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0', // Bind to all network interfaces
    open: true, // Automatically open the app in the browser
    port: 3000,
    cors: true, // Enable CORS if not already enabled
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
  },
});