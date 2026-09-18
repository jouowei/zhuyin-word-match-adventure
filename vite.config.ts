import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Lists every built file (with its size) in offline-manifest.json, so offline mode can download all of them first.
 * The version changes whenever a file changes, which tells devices their offline copy needs updating.
 */
const offlineManifest = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'offline-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files: { url: string; size: number }[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { walk(full); continue; }
          const url = '/' + path.relative(outDir, full).split(path.sep).join('/');
          if (/\.map$|^\/server\.|^\/offline-manifest\.json$|^\/sw\.js$|^\/test-ruby/.test(url)) continue;
          files.push({ url, size: fs.statSync(full).size });
        }
      };
      walk(outDir);
      files.sort((a, b) => a.url.localeCompare(b.url));
      const hash = crypto.createHash('sha256');
      for (const f of files) hash.update(`${f.url}:${f.size}:${fs.readFileSync(path.join(outDir, f.url))}`);
      const manifest = { version: hash.digest('hex').slice(0, 12), files };
      fs.writeFileSync(path.join(outDir, 'offline-manifest.json'), JSON.stringify(manifest));
    },
  };
};

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  // The Gemini key stays on the server: nothing from .env is put into the page's code
  plugins: [react(), offlineManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
