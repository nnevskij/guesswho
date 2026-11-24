import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { namespaceHooks, registerLobbyHandlers } from './core/handlers.js';
import { FunnyStoriesManager } from './games/funnystories/rooms.js';
import { registerFunnyStories } from './games/funnystories/handlers.js';
import { GuessWhoManager } from './games/guesswho/rooms.js';
import { ImpostoreManager } from './games/impostore/rooms.js';
import { registerImpostore } from './games/impostore/handlers.js';
import { registerGuessWho } from './games/guesswho/handlers.js';

/**
 * Un solo server per tutta la raccolta: ogni gioco ha il suo namespace Socket.IO
 * (stanze, codici ed eventi separati) e il suo manager. Per aggiungerne uno, una voce qui.
 */
const GAMES = {
  guesswho: {
    Manager: GuessWhoManager,
    register: registerGuessWho,
    extraHooks: (nsp) => ({
      onShowCharacters: (room, payload) => nsp.to(room.code).emit('characters:show', payload),
    }),
  },
  funnystories: {
    Manager: FunnyStoriesManager,
    register: registerFunnyStories,
  },
  impostore: {
    Manager: ImpostoreManager,
    register: registerImpostore,
  },
};

export function createGameServer(config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigins }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, methods: ['GET', 'POST'] },
    serveClient: false,
    maxHttpBufferSize: 10_000, // i messaggi sono minuscoli: blocca payload abusivi
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  const managers = {};
  for (const [name, game] of Object.entries(GAMES)) {
    const nsp = io.of(`/${name}`);
    const manager = new game.Manager(config, namespaceHooks(nsp, game.extraHooks?.(nsp)));
    registerLobbyHandlers(nsp, manager, config, game.register(manager));
    managers[name] = manager;
  }
  const all = Object.values(managers);

  app.get('/', (_req, res) => res.type('text').send('game server ok'));
  app.get('/health', (_req, res) => {
    const rooms = Object.fromEntries(Object.entries(managers).map(([name, m]) => [name, m.roomCount]));
    res.json({ status: 'ok', rooms, sockets: io.engine.clientsCount, uptime: process.uptime() });
  });
  // Utile al client per validare un link/codice prima di aprire il socket.
  app.get('/:game/rooms/:code', (req, res) => {
    const manager = managers[req.params.game];
    if (!manager) return res.status(404).json({ error: 'Gioco sconosciuto' });
    res.json(manager.roomInfo(req.params.code));
  });

  const sweeper = setInterval(() => all.forEach((m) => m.sweepExpired()), 10 * 60_000);
  sweeper.unref();

  return {
    app,
    io,
    httpServer,
    managers,
    listen: (port = config.port, host = config.host) =>
      new Promise((resolve) => httpServer.listen(port, host, () => resolve(httpServer.address()))),
    close: async () => {
      clearInterval(sweeper);
      all.forEach((m) => m.dispose());
      await io.close(); // chiude anche httpServer
    },
  };
}
