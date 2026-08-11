import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // xlsx / docx are fairly large — raise the warning limit instead of
    // pretending they're not there.
    chunkSizeWarningLimit: 1500,
  },
});
