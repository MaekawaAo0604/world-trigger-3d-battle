import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false, // 本番ではソースマップを無効化
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'dat-gui': ['dat.gui']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // チャンクサイズ警告の閾値を上げる
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['three', 'dat.gui']
  }
});