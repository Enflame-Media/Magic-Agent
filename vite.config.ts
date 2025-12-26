import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Vite configuration for Happy Admin Vue.js SPA
 *
 * This builds the Vue.js frontend that will be served as static assets
 * by the Cloudflare Worker. The built files go to ./dist which is
 * configured as the static site bucket in wrangler.toml.
 */
export default defineConfig({
    plugins: [vue()],
    root: './src/app',
    base: '/',
    build: {
        outDir: '../../dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/app/index.html'),
            },
        },
    },
    resolve: {
        alias: {
            '@app': resolve(__dirname, 'src/app'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
});
