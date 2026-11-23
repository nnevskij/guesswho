'use client';
// Esempio di hook per il client Next.js (App Router). Copialo in es. `app/hooks/useGameSocket.ts`
// e installa: npm i socket.io-client
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SERVER_PORT = 3001;

/**
 * In produzione usa NEXT_PUBLIC_SERVER_URL (es. il dominio Railway).
 * Senza la variabile, si collega allo stesso host da cui è aperta la pagina sulla porta 3001:
 * da `localhost` sul tuo computer, da `192.168.x.x` sul telefono di un amico in rete locale.
 */
function serverUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL;
  if (fromEnv) return fromEnv;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${SERVER_PORT}`;
}
const TOKEN_KEY = 'guesswho:token';

export type Phase = 'lobby' | 'playing';
export interface PublicPlayer {
  id: string;
  nickname: string | null;
  hasCharacter: boolean;
  ready: boolean;
  rereadVote: boolean;
  connected: boolean;
}
export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string | null;
  minPlayers: number;
  maxPlayers: number;
  players: PublicPlayer[];
  readyCount: number;
  rereadCount: number;
  charactersCount: number;
  rereadRound: number;
}
export interface Me {
  playerId: string;
  nickname: string | null;
  character: string | null;
}
export interface CharactersShow {
  reason: 'start' | 'reread';
  round: number;
  characters: string[];
  /** Conto alla rovescia prima di mostrare la lista (deciso dal server). */
  countdownMs: number;
  /** Per quanto resta visibile la lista dopo il conto alla rovescia. */
  durationMs: number;
  /** Date.now() locale alla ricezione: i tempi partono da qui. */
  receivedAt: number;
}
type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: { code: string; message: string } };
interface Session {
  roomCode: string;
  token: string;
  me: Me;
  state: RoomState;
}

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [shown, setShown] = useState<CharactersShow | null>(null); // lista da mostrare in overlay
  const [notice, setNotice] = useState<string | null>(null);
  // Stabile: l'overlay la usa come dipendenza dei suoi timer.
  const dismissCharacters = useCallback(() => setShown(null), []);

  useEffect(() => {
    const socket = io(serverUrl(), {
      transports: ['websocket'], // niente long-polling: meno latenza e overhead
      // Funzione: rivalutata ad ogni riconnessione, così il server riaggancia la sessione da solo.
      auth: (cb) => cb({ token: readToken() }),
    });
    socketRef.current = socket;

    const applySession = (s: Session) => {
      writeToken(s.token);
      setMe(s.me);
      setRoom(s.state);
    };
    const clear = (msg?: string) => {
      writeToken(null);
      setRoom(null);
      setMe(null);
      setShown(null);
      if (msg) setNotice(msg);
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('session:resumed', applySession);
    socket.on('session:invalid', () => clear());
    socket.on('session:replaced', () => setNotice('Sessione aperta in un’altra scheda'));
    socket.on('room:state', setRoom);
    socket.on('characters:show', (p: Omit<CharactersShow, 'receivedAt'>) =>
      setShown({
        ...p,
        // Valori di riserva se il server è una versione vecchia senza i tempi.
        countdownMs: p.countdownMs ?? 5000,
        durationMs: p.durationMs ?? 30000,
        receivedAt: Date.now(),
      }),
    );
    socket.on('room:removed', ({ reason }: { reason: string }) =>
      clear(reason === 'kicked' ? 'Sei stato espulso dalla stanza' : 'Sei uscito dalla stanza'),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback(async <T,>(event: string, payload?: object): Promise<Ack<T>> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: { code: 'NO_SOCKET', message: 'Non connesso' } };
    try {
      return await socket.timeout(5000).emitWithAck(event, payload ?? {});
    } catch {
      return { ok: false, error: { code: 'TIMEOUT', message: 'Il server non risponde' } };
    }
  }, []);

  const enter = useCallback(
    async (event: 'room:create' | 'room:join', payload?: object) => {
      const res = await emit<Session>(event, payload);
      if (res.ok) {
        writeToken(res.token);
        setMe(res.me);
        setRoom(res.state);
        setShown(null);
      }
      return res;
    },
    [emit],
  );

  return {
    connected,
    room,
    me,
    shown,
    notice,
    isHost: !!room && room.hostId === me?.playerId,
    dismissCharacters,
    createRoom: () => enter('room:create'),
    joinRoom: (code: string) => enter('room:join', { code }),
    leaveRoom: async () => {
      await emit('room:leave');
      writeToken(null);
      setRoom(null);
      setMe(null);
    },
    setProfile: async (nickname: string, character: string) => {
      const res = await emit<{ me: Me }>('player:profile', { nickname, character });
      if (res.ok) setMe(res.me);
      return res;
    },
    setReady: (ready: boolean) => emit('player:ready', { ready }),
    voteReread: (vote: boolean) => emit('game:reread', { vote }),
    resetGame: () => emit('game:reset'),
    kick: (playerId: string) => emit('player:kick', { playerId }),
  };
}
