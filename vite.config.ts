import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['duckpos-icon.svg'],
      manifest: {
        name: 'DuckPOS',
        short_name: 'DuckPOS',
        description: 'ระบบขายหน้าร้านและสั่งอาหารผ่าน QR',
        theme_color: '#F97316',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/duckpos-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/duckpos-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/(product-images|shop-assets)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'duckpos-public-images-v1',
              expiration: { maxEntries: 250, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'vendor-query', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'vendor-router', test: /node_modules[\\/]react-router/ },
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
})

