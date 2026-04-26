import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('@vis.gl/react-google-maps')) return 'maps';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('tesseract.js')) return 'ocr';
              if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'pdf';
              if (id.includes('@google/genai')) return 'ai';
              if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
              return 'vendor';
            },
          },
        },
      },
      test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
        css: true,
      },
    };
});
