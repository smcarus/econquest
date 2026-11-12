import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        // jsPDF's optional helpers for doc.html() and SVG images, which the app never calls (size review K1).
        html2canvas: path.resolve(import.meta.dirname, 'src/vendor/pdfExtrasStub.ts'),
        dompurify: path.resolve(import.meta.dirname, 'src/vendor/pdfExtrasStub.ts'),
        canvg: path.resolve(import.meta.dirname, 'src/vendor/pdfExtrasStub.ts'),
      },
    },
    server: {
      // DISABLE_HMR=true turns off hot reload and file watching (saves CPU while files change in bulk).
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
