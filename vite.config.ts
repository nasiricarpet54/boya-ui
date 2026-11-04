import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
      dedupe: ['date-fns'],
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket connection errors in iframe
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // P2: Split heavy vendor libs into their own chunks so the customer-facing
      // initial bundle does not have to carry the whole vendor tree. The router
      // already lazy-loads the admin/salon screens via React.lazy.
      // NOTE: Vite 8 ships Rolldown, which only accepts the function form of
      // manualChunks (the object form throws "manualChunks is not a function").
      rollupOptions: {
        output: {
          manualChunks(id: string): string | undefined {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
              if (id.includes('@tanstack') || id.includes('zustand')) return 'router-vendor';
              if (id.includes('date-fns')) return 'date-vendor';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('postgres') || id.includes('drizzle')) return 'db-vendor';
            }
            return undefined;
          },
        },
      },
      // Raise the limit slightly: the admin dashboard chunk is legitimately big
      // (tables, charts, forms) and the warning alone was not actionable.
      chunkSizeWarningLimit: 700,
    },
  };
});
