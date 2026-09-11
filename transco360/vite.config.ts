import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Le prototype est servi comme un site purement statique : aucun appel reseau
// au runtime, tout le dataset est genere en memoire au demarrage.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'brand/transco-mark.svg'],
      manifest: {
        name: 'TRANSCO 360 — Prototype',
        short_name: 'TRANSCO 360',
        description:
          'Prototype de demonstration — pilotage et controle de gestion. Donnees fictives, non connecte aux systemes TRANSCO.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d1512',
        theme_color: '#0d1512',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Aucune requete reseau externe : precache integral, cache-first.
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
});
