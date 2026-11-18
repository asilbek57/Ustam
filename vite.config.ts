import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './'  -> the build works from any folder / static host.
// proxy /api -> the AI chat server (server/index.js) during development.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
