// Runs the production build locally (npm run build first), e.g. to try offline mode: the service worker
// only runs in production builds. PORT defaults to 3001 so it can run next to the dev server.
import { createRequire } from 'module';
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3001';
createRequire(import.meta.url)('../dist/server.cjs');
