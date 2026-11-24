import { GameError } from '../errors.js';

const createRateLimiter = ({ windowMs, max }) => {
  let windowStart = 0;
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - windowStart > windowMs) {
      windowStart = now;
      count = 0;
    }
    return ++count <= max;
  };
};

export const sessionPayload = (manager, room, player) => ({
  roomCode: room.code,
  token: player.token, // da salvare sul client (localStorage) per riconnettersi
  me: manager.selfView(player, room),
  state: manager.publicState(room),
});

/**
 * Eventi comuni a tutti i giochi, su un namespace Socket.IO (es. /guesswho).
 * Client -> server, tutti con ack `(res) => ...`, res = { ok: true, ... } | { ok: false, error: { code, message } }:
 *   room:create                         -> { roomCode, token, me, state }
 *   room:join     { code }              -> { roomCode, token, me, state }
 *   room:leave
 *   player:kick   { playerId }            (solo host)
 *
 * Server -> client:
 *   room:state       stato pubblico della stanza (ad ogni cambiamento)
 *   room:me          vista privata del giocatore (ad ogni cambiamento)
 *   session:resumed  { roomCode, token, me, state }  (riconnessione automatica via handshake auth.token)
 *   session:invalid  token non più valido: il client deve dimenticarlo
 *   session:replaced la stessa sessione è stata aperta da un'altra scheda
 *   room:removed     { reason: 'kicked' | 'timeout' | 'expired' }
 *
 * `registerGame(on)` aggiunge gli eventi propri del gioco; `on(event, fn)` riceve payload e token.
 */
export function registerLobbyHandlers(nsp, manager, config, registerGame) {
  nsp.on('connection', (socket) => {
    const allow = createRateLimiter(config.rateLimit);
    socket.data.token = null;

    const attach = (room, player) => {
      socket.data.token = player.token;
      socket.join(room.code);
    };

    const leaveCurrent = () => {
      const s = manager.getSession(socket.data.token);
      if (s) {
        socket.leave(s.room.code);
        manager.removePlayer(s.room.code, s.player.id, 'left');
      }
      socket.data.token = null;
    };

    const on = (event, fn) => {
      socket.on(event, (payload, ack) => {
        if (typeof payload === 'function') [payload, ack] = [undefined, payload];
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!allow()) return reply({ ok: false, error: { code: 'RATE_LIMITED', message: 'Troppe richieste' } });
        try {
          const result = fn(payload && typeof payload === 'object' ? payload : {}, socket.data.token);
          reply({ ok: true, ...result });
        } catch (err) {
          if (err instanceof GameError) {
            reply({ ok: false, error: { code: err.code, message: err.message } });
          } else {
            console.error(`[${nsp.name} ${event}]`, err);
            reply({ ok: false, error: { code: 'INTERNAL', message: 'Errore interno' } });
          }
        }
      });
    };

    // --- Riconnessione automatica: il client passa il token in `auth` ad ogni (ri)connessione.
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) {
      const resumed = manager.resume(authToken, socket.id);
      if (resumed) {
        const { room, player, previousSocketId } = resumed;
        const old = previousSocketId && nsp.sockets.get(previousSocketId);
        if (old) {
          old.data.token = null; // così il suo disconnect non segna offline il giocatore
          old.emit('session:replaced');
          old.disconnect(true);
        }
        attach(room, player);
        socket.emit('session:resumed', sessionPayload(manager, room, player));
      } else {
        socket.emit('session:invalid');
      }
    }

    on('room:create', () => {
      leaveCurrent();
      const { room, player } = manager.createRoom(socket.id);
      attach(room, player);
      return sessionPayload(manager, room, player);
    });

    on('room:join', ({ code }) => {
      const current = manager.getSession(socket.data.token);
      if (current && current.room.code === String(code ?? '').trim().toUpperCase()) {
        return sessionPayload(manager, current.room, current.player); // già dentro: idempotente
      }
      // Prima entra nella nuova stanza (può fallire), solo dopo lascia la vecchia.
      const { room, player } = manager.joinRoom(code, socket.id);
      leaveCurrent();
      attach(room, player);
      return sessionPayload(manager, room, player);
    });

    on('room:leave', () => {
      leaveCurrent();
    });

    on('player:kick', ({ playerId }, token) => void manager.kick(token, playerId));

    registerGame?.(on);

    socket.on('disconnect', () => {
      manager.disconnect(socket.data.token, socket.id);
    });
  });
}

/** Hook standard che collegano un manager al suo namespace. */
export const namespaceHooks = (nsp, extra = {}) => {
  const socketOf = (player) => {
    const socket = player.socketId && nsp.sockets.get(player.socketId);
    return socket && socket.data.token === player.token ? socket : null;
  };
  return {
    onStateChange: (room, state) => nsp.to(room.code).emit('room:state', state),
    onSelfChange: (_room, player, me) => socketOf(player)?.emit('room:me', me),
    onPlayerRemoved: (room, player, reason) => {
      const socket = socketOf(player);
      if (!socket) return;
      socket.data.token = null;
      socket.leave(room.code);
      if (reason !== 'left') socket.emit('room:removed', { reason });
    },
    ...extra,
  };
};
