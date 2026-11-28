import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { sendDisabled } from './api/_lyceum.js';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws://127.0.0.1:*; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
};

function disabledIntegrations(): Plugin {
  const install = (middlewares: Connect.Server) => {
    middlewares.use('/api', (req, res, next) => {
      const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
      if (pathname === '/v1' || pathname.startsWith('/v1/')) {
        if (process.env.LERNPILOT_LOCAL_API === '1') return next();
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ error: { code: 'LOCAL_INFRASTRUCTURE_DISABLED', message: 'Ambiente local não iniciado.', requestId: 'local-disabled' } }));
        return;
      }
      sendDisabled(res);
    });
  };
  return {
    name: 'disabled-integrations',
    configureServer(server) { install(server.middlewares); },
    configurePreviewServer(server) { install(server.middlewares); },
  };
}
const localApiProxy = process.env.LERNPILOT_LOCAL_API === '1'
  ? { '/api/v1': { target: 'http://127.0.0.1:8787', changeOrigin: false } } : undefined;

export default defineConfig({
  plugins: [react(), disabledIntegrations()],
  server: { host: '127.0.0.1', strictPort: true, headers: securityHeaders, proxy: localApiProxy },
  preview: { host: '127.0.0.1', strictPort: true, headers: securityHeaders, proxy: localApiProxy },
});
