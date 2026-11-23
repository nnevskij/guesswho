import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { registerHandlers } from './handlers.js';
import { RoomManager } from './rooms.js';

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

  const manager = new RoomManager(config, {
    onStateChange: (room, state) => io.to(room.code).emit('room:state', state),
    onShowCharacters: (room, payload) => io.to(room.code).emit('characters:show', payload),
    onPlayerRemoved: (room, player, reason) => {
      const socket = io.sockets.sockets.get(player.socketId);
      if (!socket || socket.data.token !== player.token) return;
      socket.data.token = null;
      socket.leave(room.code);
      if (reason !== 'left') socket.emit('room:removed', { reason });
    },
  });

  registerHandlers(io, manager, config);

  app.get('/', (_req, res) => res.type('text').send('guesswho server ok'));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', rooms: manager.roomCount, sockets: io.engine.clientsCount, uptime: process.uptime() });
  });
  // Utile al client Next.js per validare un link/codice prima di aprire il socket.
  app.get('/rooms/:code', (req, res) => res.json(manager.roomInfo(req.params.code)));

  const sweeper = setInterval(() => manager.sweepExpired(), 10 * 60_000);
  sweeper.unref();

  return {
    app,
    io,
    httpServer,
    manager,
    listen: (port = config.port, host = config.host) =>
      new Promise((resolve) => httpServer.listen(port, host, () => resolve(httpServer.address()))),
    close: async () => {
      clearInterval(sweeper);
      manager.dispose();
      await io.close(); // chiude anche httpServer
    },
  };
}
