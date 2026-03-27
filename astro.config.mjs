import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  base: process.env.BASE_URL || '/',
  integrations: [react()],
  vite: {
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['@mlc-ai/web-llm'],
    },
  },
});
