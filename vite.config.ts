import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

/**
 * Base-Path: GitHub Pages liefert die App unter /<repo-name>/ aus.
 * Der Workflow setzt BASE_PATH; lokal läuft die App unter "/".
 */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', sourcemap: true },
  plugins: [
    VitePWA({
      registerType: 'prompt', // Update erst nach Bestätigung, damit keine Eingabe verloren geht
      injectRegister: false, // Registrierung passiert in src/pwa.ts
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Kleine Schritte – Entwicklung begleiten',
        short_name: 'Kleine Schritte',
        description: 'Ideen für Spiel und Alltag passend zur Entwicklung deines Kindes. Offline, ohne Konto.',
        lang: 'de',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#2f6f5e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles wird vorab gecacht: App ist nach dem ersten Besuch vollständig offline nutzbar.
        globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
