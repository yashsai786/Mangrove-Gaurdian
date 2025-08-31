import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Remove any custom file naming that adds .1
        entryFileNames: '[name].js', // instead of '[name].[hash].js.1'
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})


