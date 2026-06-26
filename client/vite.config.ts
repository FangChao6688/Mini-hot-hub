import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = 'http://localhost:3001';

const apiProxy = {
  '/api': {
    target: API_PROXY_TARGET,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
