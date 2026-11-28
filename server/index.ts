import { createApiServer } from './app.ts';
import { loadServerConfig } from './config.ts';
import { SupabaseGateway } from './supabase-gateway.ts';

const config = loadServerConfig();
const server = createApiServer({
  gateway: new SupabaseGateway(config), frontendOrigin: config.frontendOrigin, port: config.port,
  logger: entry => process.stdout.write(`${JSON.stringify(entry)}\n`),
});
server.listen(config.port, '127.0.0.1', () => {
  process.stdout.write(`Lokale LernPilot-Test-API: http://127.0.0.1:${config.port}\n`);
});

function close() {
  server.close(() => process.exit(0));
  setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 5_000).unref();
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
