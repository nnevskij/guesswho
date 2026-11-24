'use client';
// Connessione al namespace /funnystories del server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { gameSocketUrl, tokenStore } from '../lib/server';

const token = tokenStore('funnystories');

export type Phase = 'lobby' | 'writing' | 'reading';
export interface FsPlayer {
  id: string;
  nickname: string | null;
  connected: boolean;
  /** Fa parte della partita in corso. */
  playing: boolean;
  /** Ha già risposto alla domanda di questo turno. */
  answered: boolean;
}
export interface FsRoom {
  code: string;
  phase: Phase;
  hostId: string | null;
  minPlayers: number;
  maxPlayers: number;
  players: FsPlayer[];
  questions: string[];
  questionsMin: number;
  questionsMax: number;
  questionMaxLength: number;
  answerMaxLength: number;
  /** Turno corrente (0 = prima domanda). */
  round: number;
  /** Domanda del turno, uguale per tutti; null fuori dalla scrittura. */
  question: string | null;
  answeredCount: number;
  playingCount: number;
  storyCount: number;
  storyIndex: number;
}
export type StoryLine = { question: string; answer: string | null };
export interface FsMe {
  playerId: string;
  nickname: string | null;
  answered: boolean;
  /** Solo per l'host, a fine partita. */
  stories: StoryLine[][] | null;
}
type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: { code: string; message: string } };
interface Session {
  roomCode: string;
  token: string;
  me: FsMe;
  state: FsRoom;
}

export function useFunnyStories() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<FsRoom | null>(null);
  const [me, setMe] = useState<FsMe | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(gameSocketUrl('funnystories'), {
      transports: ['websocket'],
      // Rivalutata ad ogni riconnessione, così il server riaggancia la sessione da solo.
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
      const res = await emit<{ me: FsMe }>('player:profile', { nickname });
      if (res.ok) setMe(res.me);
      return res;
    },
    setQuestions: (questions: string[]) => emit('room:questions', { questions }),
    start: () => emit('game:start'),
    answer: (text: string) => emit('game:answer', { text }),
    skipMissing: () => emit('game:skip'),
    showStory: (index: number) => emit('story:show', { index }),
    resetGame: () => emit('game:reset'),
    kick: (playerId: string) => emit('player:kick', { playerId }),
  };
}

export type FunnyStoriesGame = ReturnType<typeof useFunnyStories>;
