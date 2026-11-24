'use client';
// Connessione al namespace /impostore del server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { gameSocketUrl, tokenStore } from '../lib/server';

const token = tokenStore('impostore');

export type Phase = 'lobby' | 'clues' | 'voting' | 'guess' | 'result';
export type Mode = 'classic' | 'similar';
export type Outcome = 'caught' | 'guessed' | 'escaped';

export interface ImpPlayer {
  id: string;
  nickname: string | null;
  connected: boolean;
  score: number;
  /** Fa parte del round in corso. */
  playing: boolean;
  /** Ha già votato (solo durante il voto). */
  voted: boolean;
}
export interface Category {
  id: string;
  name: string;
  count: number;
}
export interface Reveal {
  word: string;
  /** Parola degli impostori, solo nella modalità "parola simile". */
  similar: string | null;
  impostorIds: string[];
  guess: string | null;
  outcome: Outcome;
  votes: { voterId: string; targetId: string }[];
  /** Punti presi in questo round, per giocatore. */
  points: Record<string, number>;
}
export interface ImpRoom {
  code: string;
  phase: Phase;
  hostId: string | null;
  minPlayers: number;
  maxPlayers: number;
  players: ImpPlayer[];
  settings: { mode: Mode; impostorCount: number; categories: string[] };
  /** Impostori che la stanza regge con i giocatori attuali. */
  maxImpostors: number;
  impostorLimit: number;
  wordMaxLength: number;
  categories: Category[];
  /** L'host ha scritto la parola del prossimo round (gli altri non la vedono). */
  customWordSet: boolean;
  roundNumber: number;
  round: {
    starterId: string;
    order: string[];
    votedCount: number;
    accusedId: string | null;
    reveal: Reveal | null;
  } | null;
}
export interface ImpMe {
  playerId: string;
  nickname: string | null;
  /** La tua parola nel round; null se sei l'impostore nella classica (o fuori dal round). */
  word: string | null;
  /** Solo nella classica: se sei l'impostore. Nella "parola simile" è sempre null. */
  isImpostor: boolean | null;
  /** Hai scritto tu la parola di questo round (quindi non sei impostore). */
  wroteWord: boolean;
  vote: string | null;
  /** Solo per l'host: la parola che ha scritto per il prossimo round. */
  custom: { word: string; similar: string | null } | null;
}
type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: { code: string; message: string } };
interface Session {
  roomCode: string;
  token: string;
  me: ImpMe;
  state: ImpRoom;
}

export function useImpostore() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<ImpRoom | null>(null);
  const [me, setMe] = useState<ImpMe | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(gameSocketUrl('impostore'), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: token.read() }),
    });
    socketRef.current = socket;

    const applySession = (s: Session) => {
      token.write(s.token);
      setMe(s.me);
      setRoom(s.state);
    };
    const clear = (msg?: string) => {
      token.write(null);
      setRoom(null);
      setMe(null);
      if (msg) setNotice(msg);
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('session:resumed', applySession);
    socket.on('session:invalid', () => clear());
    socket.on('session:replaced', () => setNotice('Sessione aperta in un’altra scheda'));
    socket.on('room:state', setRoom);
    socket.on('room:me', setMe);
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
        token.write(res.token);
        setMe(res.me);
        setRoom(res.state);
      }
      return res;
    },
    [emit],
  );

  return {
    connected,
    room,
    me,
    notice,
    isHost: !!room && room.hostId === me?.playerId,
    createRoom: () => enter('room:create'),
    joinRoom: (code: string) => enter('room:join', { code }),
    leaveRoom: async () => {
      await emit('room:leave');
      token.write(null);
      setRoom(null);
      setMe(null);
    },
    setNickname: async (nickname: string) => {
      const res = await emit<{ me: ImpMe }>('player:profile', { nickname });
      if (res.ok) setMe(res.me);
      return res;
    },
    setSettings: (settings: Partial<ImpRoom['settings']>) => emit('room:settings', settings),
    setCustomWord: (word: string, similar: string) => emit('room:customWord', { word, similar }),
    start: () => emit('game:start'),
    openVoting: () => emit('game:vote'),
    vote: (targetId: string) => emit('game:castVote', { targetId }),
    guess: (word: string) => emit('game:guess', { word }),
    skipGuess: () => emit('game:skipGuess'),
    resetGame: () => emit('game:reset'),
    kick: (playerId: string) => emit('player:kick', { playerId }),
  };
}
