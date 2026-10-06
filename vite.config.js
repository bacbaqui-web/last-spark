import { defineConfig } from 'vite';

export default defineConfig({ base: './', build: {rollupOptions: {input: {game: 'index.html', settings: 'settings.html', assets: 'asset-gallery.html', sedan: 'sedan-compare.html', atomicMap: 'atomic-map.html', references: 'reference-assets.html', randomStreet: 'random-street.html'}}} });
