import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
          '/api/tour': {
            target: 'https://apis.data.go.kr',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api\/tour/, '/B551011/EngService2'),
          },
        },
    },
});
