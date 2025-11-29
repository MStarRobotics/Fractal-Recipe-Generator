// Vite configuration that wires React, dotenv support, and shared aliases.
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set production base path via environment variable VITE_PROD_BASE_PATH, falling back to default if not set.
const PROD_BASE_PATH = process.env.VITE_PROD_BASE_PATH || '/Fractal-Recipe-Generator/';
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const basePath = isProduction ? PROD_BASE_PATH : '/';
    return {
      base: basePath,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
