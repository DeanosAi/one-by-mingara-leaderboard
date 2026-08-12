import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function copyBrandAsset() {
  return {
    name: 'copy-one-leaderboard-brand-asset',
    closeBundle() {
      fs.copyFileSync(
        path.resolve(projectRoot, 'public/one-by-mingara-logo.png'),
        path.resolve(projectRoot, 'wordpress/one-by-mingara-leaderboard/assets/one-by-mingara-logo.png'),
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyBrandAsset()],
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
