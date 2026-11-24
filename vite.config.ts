import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// /api roda como função serverless na Vercel; no dev, o Vite chama os mesmos handlers.
const devApi = (): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    for (const name of ['login', 'boletim']) {
      server.middlewares.use(`/api/${name}`, async (req, res) => {
        const mod = await server.ssrLoadModule(`/api/${name}.js`);
        await mod.default(req, res);
      });
    }
  },
});

export default defineConfig({
  plugins: [react(), devApi()],
});
