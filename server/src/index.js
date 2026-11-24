import { createGameServer } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createGameServer(config);

if (config.corsOrigins === '*' && process.env.NODE_ENV === 'production') {
  console.warn('[warn] CLIENT_ORIGIN non impostato: accetto connessioni da qualunque origine');
}

const address = await server.listen();
console.log(`game server in ascolto su ${address.address}:${address.port}`);

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} ricevuto, chiusura in corso...`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  await server.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
