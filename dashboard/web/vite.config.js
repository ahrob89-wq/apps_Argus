import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3100',
      '/health': 'http://127.0.0.1:3100'
    }
  },
  build: {
    sourcemap: false,
    // Preserve light-dark() so the in-app theme toggle can override system preference.
    cssTarget: 'chrome123'
  }
});
