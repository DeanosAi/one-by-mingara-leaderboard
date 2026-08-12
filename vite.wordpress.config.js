import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: path.resolve(projectRoot, 'wordpress/one-by-mingara-leaderboard/assets'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(projectRoot, 'src/wordpress-main.jsx'),
      output: {
        entryFileNames: 'one-leaderboard-app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'one-leaderboard-app.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
