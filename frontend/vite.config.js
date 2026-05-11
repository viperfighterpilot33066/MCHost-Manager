import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';

// Force IPv4-first on Windows to avoid ENOBUFS from dual-stack localhost resolution
dns.setDefaultResultOrder('ipv4first');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
