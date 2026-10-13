import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Service worker: guarda la app en el dispositivo para abrirla sin internet.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { name: 'Control Escolar Rural', short_name: 'Control Escolar', lang: 'es', theme_color: '#1f6f50', icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
      workbox: { navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  server: { host: true, proxy: { '/api': 'http://localhost:3000' } },
})
