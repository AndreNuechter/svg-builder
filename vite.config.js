import { defineConfig } from 'vite';
import pugPlugin from 'vite-plugin-pug';

export default defineConfig({
    plugins: [pugPlugin()],
    build: {
        outDir: './docs',
        emptyOutDir: true,
    },
    optimizeDeps: {
        needsInterop: ['svgo']
    },
    base: './',
});