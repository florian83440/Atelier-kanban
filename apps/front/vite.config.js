import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

// host: true => accessible depuis les autres machines du reseau local
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    fs: { allow: [repoRoot] }, // autorise l'import du workspace @kanban-it/shared
  },
  preview: { host: true, port: 4173 },
  // shared est du code source ESM sans build : pas de pre-bundling
  optimizeDeps: { exclude: ['@kanban-it/shared'] },
});
