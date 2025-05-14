import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'demo'),
  server: {
    port: 5173
  },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true
  }
});
