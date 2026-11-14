import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
import path from 'path';
import {defineConfig} from 'vite';

/** The git commit the pages are built from (src/utils/buildInfo.ts): APP_COMMIT (Docker), else git, else none. */
function buildCommit(): string {
  const fromEnv = (process.env.APP_COMMIT ?? '').trim();
  if (fromEnv) return fromEnv;
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim();
  } catch {
    return '';
  }
}

export default defineConfig(() => {
  return {
    define: {
      __APP_COMMIT__: JSON.stringify(buildCommit()),
    },
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
