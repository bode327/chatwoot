import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: './src/main.js',
      name: 'GalleryPlugin',
      formats: ['iife'],
      fileName: () => 'plugin.js'
    },
    rollupOptions: {
      external: ['vue'], // Assuming Vue is available in global scope if necessary, or just bundle
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});