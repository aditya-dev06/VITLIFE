import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'vendor-three';
            }
            if (id.includes('postprocessing')) {
              return 'vendor-postprocessing';
            }
            if (id.includes('gsap')) {
              return 'vendor-gsap';
            }
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return 'vendor-others';
          }
        }
      }
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 0, // ensure all chunks are split regardless of size
          groups: [
            {
              name: 'vendor-three',
              test: /[\\/]node_modules[\\/]three[\\/]/,
              priority: 10
            },
            {
              name: 'vendor-postprocessing',
              test: /[\\/]node_modules[\\/]postprocessing[\\/]/,
              priority: 10
            },
            {
              name: 'vendor-gsap',
              test: /[\\/]node_modules[\\/]gsap[\\/]/,
              priority: 10
            },
            {
              name: 'vendor-motion',
              test: /[\\/]node_modules[\\/]motion[\\/]/,
              priority: 10
            },
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10
            }
          ]
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
