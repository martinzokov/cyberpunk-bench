import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../playground/public/models/gpt-6-sol',
    emptyOutDir: true,
  },
});
