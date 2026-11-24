'use client';
// Connessione al namespace /guesswho del server, usata dalle pagine di app/guesswho.
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { gameSocketUrl, tokenStore } from '../../lib/server';

const token = tokenStore('guesswho');

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
  /** Nomi falsi aggiunti alla lista alla partenza (li sceglie l'host). */
  decoyCount: number;
  maxDecoys: number;
  rereadRound: number;
}
export interface Me {
  playerId: string;
  nickname: string | null;
  character: string | null;
  /** Nome falso facoltativo proposto dal giocatore. */
  decoy: string | null;
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

const readToken = token.read;
const writeToken = token.write;

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
    const socket = io(gameSocketUrl('guesswho'), {
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
    setProfile: async (nickname: string, character: string, decoy: string) => {
      const res = await emit<{ me: Me }>('player:profile', { nickname, character, decoy });
      if (res.ok) setMe(res.me);
      return res;
    },
    setDecoys: (count: number) => emit('room:decoys', { count }),
    setReady: (ready: boolean) => emit('player:ready', { ready }),
    voteReread: (vote: boolean) => emit('game:reread', { vote }),
    resetGame: () => emit('game:reset'),
    kick: (playerId: string) => emit('player:kick', { playerId }),
  };
}
