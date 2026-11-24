import { GameError } from './errors.js';

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
  me: manager.selfView(player),
  state: manager.publicState(room),
});

/**
 * Protocollo (client -> server, tutti con ack `(res) => ...`, res = { ok: true, ... } | { ok: false, error: { code, message } }):
 *   room:create                         -> { roomCode, token, me, state }
 *   room:join     { code }              -> { roomCode, token, me, state }
 *   room:leave
 *   player:profile { nickname, character, decoy? } -> { me }   (decoy = nome falso facoltativo)
 *   room:decoys   { count: 0..3 }         (solo host, in lobby: quanti nomi falsi aggiungere)
 *   player:ready  { ready: boolean }
 *   game:reread   { vote: boolean }
 *   game:reset                            (solo host: torna in lobby)
 *   player:kick   { playerId }            (solo host)
 *
 * Server -> client:
 *   room:state       stato pubblico della stanza (ad ogni cambiamento)
 *   characters:show  { reason: 'start' | 'reread', round, characters: string[], countdownMs, durationMs }
 *   session:resumed  { roomCode, token, me, state }  (riconnessione automatica via handshake auth.token)
 *   session:invalid  token non più valido: il client deve dimenticarlo
 *   session:replaced la stessa sessione è stata aperta da un'altra scheda
 *   room:removed     { reason: 'kicked' | 'timeout' | 'expired' }
 */
export function registerHandlers(io, manager, config) {
  io.on('connection', (socket) => {
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
          const result = fn(payload && typeof payload === 'object' ? payload : {});
          reply({ ok: true, ...result });
        } catch (err) {
          if (err instanceof GameError) {
            reply({ ok: false, error: { code: err.code, message: err.message } });
          } else {
            console.error(`[${event}]`, err);
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
        const old = previousSocketId && io.sockets.sockets.get(previousSocketId);
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

    on('player:profile', (data) => ({ me: manager.setProfile(socket.data.token, data) }));
    on('room:decoys', ({ count }) => void manager.setDecoys(socket.data.token, count));
    on('player:ready',({ ready = true }) => void manager.setReady(socket.data.token, ready));
    on('game:reread', ({ vote = true }) => void manager.voteReread(socket.data.token, vote));
    on('game:reset', () => void manager.resetGame(socket.data.token));
    on('player:kick', ({ playerId }) => void manager.kick(socket.data.token, playerId));

    socket.on('disconnect', () => {
      manager.disconnect(socket.data.token, socket.id);
    });
  });
}
