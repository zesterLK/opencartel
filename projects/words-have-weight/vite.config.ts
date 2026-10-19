import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  base: process.env.OPEN_CARTEL_BASE || './',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
});
