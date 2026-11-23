import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { GameError, cleanText } from './errors.js';

// Niente caratteri ambigui (0/O, 1/I/L) per codici facili da dettare a voce.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const PHASE = Object.freeze({ LOBBY: 'lobby', PLAYING: 'playing' });

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const noop = () => {};

/**
 * Tutto lo stato di gioco, in memoria. Nessuna dipendenza da Socket.IO:
 * le notifiche escono tramite gli hook passati al costruttore.
 *
 * Room   { code, phase, hostId, players: Map<id, Player>, characters: [{playerId, name}], rereadRound, createdAt }
 * Player { id, token, nickname, character, ready, rereadVote, connected, socketId, removalTimer }
 *
 * `id` è pubblico (lo vedono tutti), `token` è segreto e serve solo al giocatore per riconnettersi.
 */
export class RoomManager {
  #rooms = new Map();
  #sessions = new Map(); // token -> { code, playerId }
  #opts;
  #hooks;

  constructor(opts, hooks = {}) {
    this.#opts = opts;
    this.#hooks = { onStateChange: noop, onShowCharacters: noop, onPlayerRemoved: noop, ...hooks };
  }

  get roomCount() {
    return this.#rooms.size;
  }

  // ---------- Sessioni ----------

  getSession(token) {
    if (typeof token !== 'string') return null;
    const s = this.#sessions.get(token);
    if (!s) return null;
    const room = this.#rooms.get(s.code);
    const player = room?.players.get(s.playerId);
    if (!player) {
      this.#sessions.delete(token);
      return null;
    }
    return { room, player };
  }

  #requireSession(token) {
    const s = this.getSession(token);
    if (!s) throw new GameError('NOT_IN_ROOM', 'Non sei in una stanza');
    return s;
  }

  // ---------- Stanze ----------

  createRoom(socketId) {
    const code = this.#generateCode();
    const room = {
      code,
      phase: PHASE.LOBBY,
      hostId: null,
      players: new Map(),
      characters: [],
      rereadRound: 0,
      createdAt: Date.now(),
    };
    this.#rooms.set(code, room);
    const player = this.#addPlayer(room, socketId);
    return { room, player };
  }

  joinRoom(rawCode, socketId) {
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const room = this.#rooms.get(code);
    if (!room) throw new GameError('ROOM_NOT_FOUND', 'Stanza non trovata');
    if (room.phase !== PHASE.LOBBY) throw new GameError('GAME_IN_PROGRESS', 'La partita è già iniziata');
    if (room.players.size >= this.#opts.maxPlayers) throw new GameError('ROOM_FULL', 'La stanza è piena');
    const player = this.#addPlayer(room, socketId);
    this.#commit(room);
    return { room, player };
  }

  roomInfo(rawCode) {
    const room = this.#rooms.get(String(rawCode ?? '').trim().toUpperCase());
    if (!room) return { exists: false, joinable: false };
    return {
      exists: true,
      phase: room.phase,
      playerCount: room.players.size,
      joinable: room.phase === PHASE.LOBBY && room.players.size < this.#opts.maxPlayers,
    };
  }

  #generateCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < this.#opts.roomCodeLength; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.#rooms.has(code)) return code;
    }
    throw new GameError('SERVER_BUSY', 'Impossibile generare un codice stanza, riprova');
  }

  #addPlayer(room, socketId) {
    const player = {
      id: randomBytes(8).toString('base64url'),
      token: randomUUID(),
      nickname: null,
      character: null,
      ready: false,
      rereadVote: false,
      connected: true,
      socketId,
      removalTimer: null,
    };
    room.players.set(player.id, player);
    this.#sessions.set(player.token, { code: room.code, playerId: player.id });
    if (!room.hostId) room.hostId = player.id;
    return player;
  }

  // ---------- Connessione / disconnessione ----------

  /** Riaggancia un giocatore esistente a un nuovo socket. Ritorna null se il token non è valido. */
  resume(token, socketId) {
    const s = this.getSession(token);
    if (!s) return null;
    const { room, player } = s;
    const previousSocketId = player.socketId !== socketId ? player.socketId : null;
    clearTimeout(player.removalTimer);
    player.removalTimer = null;
    player.socketId = socketId;
    player.connected = true;
    const host = room.players.get(room.hostId);
    if (!host?.connected) room.hostId = player.id;
    this.#commit(room);
    return { room, player, previousSocketId };
  }

  /** Il socket è caduto: il giocatore resta in stanza per `disconnectGraceMs`, poi viene rimosso. */
  disconnect(token, socketId) {
    const s = this.getSession(token);
    if (!s || s.player.socketId !== socketId) return; // socket vecchio già sostituito
    const { room, player } = s;
    player.connected = false;
    clearTimeout(player.removalTimer);
    player.removalTimer = setTimeout(
      () => this.removePlayer(room.code, player.id, 'timeout'),
      this.#opts.disconnectGraceMs,
    );
    player.removalTimer.unref?.();
    if (room.hostId === player.id) this.#reassignHost(room);
    this.#commit(room);
  }

  leave(token) {
    const s = this.getSession(token);
    if (s) this.removePlayer(s.room.code, s.player.id, 'left');
  }

  removePlayer(code, playerId, reason) {
    const room = this.#rooms.get(code);
    const player = room?.players.get(playerId);
    if (!player) return;
    clearTimeout(player.removalTimer);
    room.players.delete(playerId);
    this.#sessions.delete(player.token);
    room.characters = room.characters.filter((c) => c.playerId !== playerId);
    this.#hooks.onPlayerRemoved(room, player, reason);

    if (room.players.size === 0) {
      this.#rooms.delete(code);
      return;
    }
    if (room.hostId === playerId) this.#reassignHost(room);
    // Chi se ne va potrebbe essere l'ultimo "non pronto": ricontrolla l'unanimità.
    this.#commit(room);
  }

  #reassignHost(room) {
    const players = [...room.players.values()];
    const next = players.find((p) => p.connected) ?? players[0];
    room.hostId = next?.id ?? null;
  }

  // ---------- Azioni di gioco ----------

  setProfile(token, { nickname, character } = {}) {
    const { room, player } = this.#requireSession(token);
    if (room.phase !== PHASE.LOBBY) throw new GameError('GAME_IN_PROGRESS', 'Non puoi cambiare profilo a partita iniziata');
    const nick = cleanText(nickname, { field: 'nickname', max: this.#opts.nicknameMaxLength });
    const char = cleanText(character, { field: 'personaggio', max: this.#opts.characterMaxLength });
    const lower = nick.toLocaleLowerCase('it');
    for (const p of room.players.values()) {
      if (p.id !== player.id && p.nickname?.toLocaleLowerCase('it') === lower) {
        throw new GameError('NICKNAME_TAKEN', 'Nickname già usato in questa stanza');
      }
    }
    player.nickname = nick;
    player.character = char;
    player.ready = false; // modificare il profilo annulla il "sono pronto"
    this.#commit(room);
    return this.selfView(player);
  }

  setReady(token, ready) {
    const { room, player } = this.#requireSession(token);
    if (room.phase !== PHASE.LOBBY) throw new GameError('GAME_IN_PROGRESS', 'La partita è già iniziata');
    if (ready && !(player.nickname && player.character)) {
      throw new GameError('PROFILE_INCOMPLETE', 'Inserisci nickname e personaggio prima di dirti pronto');
    }
    player.ready = Boolean(ready);
    this.#commit(room);
  }

  voteReread(token, vote) {
    const { room, player } = this.#requireSession(token);
    if (room.phase !== PHASE.PLAYING) throw new GameError('NOT_PLAYING', 'La partita non è ancora iniziata');
    player.rereadVote = Boolean(vote);
    this.#commit(room);
  }

  resetGame(token) {
    const { room, player } = this.#requireSession(token);
    this.#requireHost(room, player);
    room.phase = PHASE.LOBBY;
    room.characters = [];
    for (const p of room.players.values()) {
      p.ready = false;
      p.rereadVote = false;
    }
    this.#commit(room);
  }

  kick(token, targetId) {
    const { room, player } = this.#requireSession(token);
    this.#requireHost(room, player);
    if (targetId === player.id) throw new GameError('INVALID_INPUT', 'Non puoi espellere te stesso');
    if (!room.players.has(targetId)) throw new GameError('PLAYER_NOT_FOUND', 'Giocatore non trovato');
    this.removePlayer(room.code, targetId, 'kicked');
  }

  #requireHost(room, player) {
    if (room.hostId !== player.id) throw new GameError('NOT_HOST', "Solo l'host può farlo");
  }

  // ---------- Stato & transizioni ----------

  /**
   * Unico punto in cui si valutano le votazioni unanimi. Ordine degli eventi verso i client:
   * prima `room:state` aggiornato, poi (se scatta) `characters:show`.
   */
  #commit(room) {
    const players = [...room.players.values()];
    let show = null;

    if (room.phase === PHASE.LOBBY) {
      if (players.length >= this.#opts.minPlayers && players.every((p) => p.ready)) {
        room.phase = PHASE.PLAYING;
        room.characters = shuffle(players.map((p) => ({ playerId: p.id, name: p.character })));
        room.rereadRound = 0;
        for (const p of players) p.rereadVote = false;
        show = 'start';
      }
    } else if (players.length > 0 && players.every((p) => p.rereadVote)) {
      for (const p of players) p.rereadVote = false;
      room.rereadRound += 1;
      show = 'reread';
    }

    this.#hooks.onStateChange(room, this.publicState(room));
    if (show) {
      this.#hooks.onShowCharacters(room, {
        reason: show,
        round: room.rereadRound,
        characters: this.#characterNames(room),
        // Tempi decisi dal server, così tutti i telefoni contano alla rovescia e chiudono insieme.
        countdownMs: this.#opts.revealCountdownMs,
        durationMs: this.#opts.revealDurationMs,
      });
    }
  }

  // L'ordine è mescolato una volta sola all'inizio, così le riletture mostrano la stessa lista.
  // Gli autori non vengono inviati: nessuno può risalire a chi ha scritto cosa.
  #characterNames(room) {
    return room.characters.map((c) => c.name);
  }

  publicState(room) {
    const players = [...room.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      hasCharacter: Boolean(p.character),
      ready: p.ready,
      rereadVote: p.rereadVote,
      connected: p.connected,
    }));
    return {
      code: room.code,
      phase: room.phase,
      hostId: room.hostId,
      minPlayers: this.#opts.minPlayers,
      maxPlayers: this.#opts.maxPlayers,
      players,
      readyCount: players.filter((p) => p.ready).length,
      rereadCount: players.filter((p) => p.rereadVote).length,
      charactersCount: room.characters.length,
      rereadRound: room.rereadRound,
    };
  }

  selfView(player) {
    return { playerId: player.id, nickname: player.nickname, character: player.character };
  }

  // ---------- Manutenzione ----------

  sweepExpired(now = Date.now()) {
    for (const room of [...this.#rooms.values()]) {
      if (now - room.createdAt > this.#opts.roomTtlMs) {
        for (const id of [...room.players.keys()]) this.removePlayer(room.code, id, 'expired');
      }
    }
  }

  dispose() {
    for (const room of this.#rooms.values()) {
      for (const p of room.players.values()) clearTimeout(p.removalTimer);
    }
    this.#rooms.clear();
    this.#sessions.clear();
  }
}
