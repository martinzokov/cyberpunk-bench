import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../playground/public/models/opus-5.5',
    emptyOutDir: true,
  },
});
