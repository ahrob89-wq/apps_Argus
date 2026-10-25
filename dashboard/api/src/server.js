import config from './config.js';
import { buildApp } from './app.js';

const app = buildApp();

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ code: error?.code || 'STARTUP_FAILED' }, 'Dashboard API failed to start');
  process.exitCode = 1;
}

async function shutdown(signal) {
  app.log.info({ signal }, 'Dashboard API shutting down');
  await app.close();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
