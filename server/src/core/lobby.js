import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { GameError } from '../errors.js';

// Niente caratteri ambigui (0/O, 1/I/L) per codici facili da dettare a voce.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const LOBBY = 'lobby';

export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Confronto senza maiuscole/minuscole, per nickname e nomi. */
export const key = (name) => name.toLocaleLowerCase('it');

/**
 * Chiave per confrontare nomi e parole: senza maiuscole, accenti, punteggiatura e spazi doppi.
 * "Napoléone", "napoleone " e "Napoleone!" sono lo stesso; "Napoleone Bonaparte" no.
 */
export const nameKey = (name) =>
  key(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const noop = () => {};

/**
 * Parte comune a tutti i giochi: stanze in memoria, codici, sessioni con token, riconnessione,
 * host, espulsioni, scadenze. Nessuna dipendenza da Socket.IO: le notifiche escono dagli hook.
 *
 * Ogni gioco estende questa classe e ridefinisce:
 *   initRoom(room) / initPlayer(player)   campi propri del gioco
 *   evaluate(room)                        transizioni di stato; può ritornare una funzione da
 *                                         eseguire dopo l'invio dello stato (eventi extra)
 *   onPlayerRemoved(room, player)         pulizia quando qualcuno esce
 *   publicState(room)                     ciò che vedono tutti (parte da baseState)
 *   selfView(player, room)                ciò che vede solo quel giocatore
 *
 * Room   { code, phase, hostId, ownerId, players: Map<id, Player>, createdAt, ...campi del gioco }
 *        hostId = chi comanda adesso; ownerId = chi ha creato la stanza (torna host quando si riconnette)
 * Player { id, token, nickname, connected, socketId, removalTimer, ...campi del gioco }
 *
 * `id` è pubblico (lo vedono tutti), `token` è segreto e serve solo al giocatore per riconnettersi.
 */
export class LobbyManager {
  #rooms = new Map();
  #sessions = new Map(); // token -> { code, playerId }

  constructor(opts, hooks = {}) {
    this.opts = opts;
    this.hooks = { onStateChange: noop, onSelfChange: noop, onPlayerRemoved: noop, ...hooks };
  }

  get roomCount() {
    return this.#rooms.size;
  }

  // ---------- Da ridefinire nei giochi ----------

  initRoom() {}
  initPlayer() {}
  evaluate() {
    return null;
  }
  onPlayerRemoved() {}
  publicState(room) {
    return this.baseState(room);
  }
  selfView(player) {
    return { playerId: player.id, nickname: player.nickname };
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

  requireSession(token) {
    const s = this.getSession(token);
    if (!s) throw new GameError('NOT_IN_ROOM', 'Non sei in una stanza');
    return s;
  }

  requireHost(room, player) {
    if (room.hostId !== player.id) throw new GameError('NOT_HOST', "Solo l'host può farlo");
  }

  requirePhase(room, phase, message = 'La partita è già iniziata') {
    if (room.phase !== phase) throw new GameError(phase === LOBBY ? 'GAME_IN_PROGRESS' : 'WRONG_PHASE', message);
  }

  // ---------- Stanze ----------

  createRoom(socketId) {
    const code = this.#generateCode();
    const room = { code, phase: LOBBY, hostId: null, ownerId: null, players: new Map(), createdAt: Date.now() };
    this.initRoom(room);
    this.#rooms.set(code, room);
    const player = this.#addPlayer(room, socketId);
    return { room, player };
  }

  joinRoom(rawCode, socketId) {
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const room = this.#rooms.get(code);
    if (!room) throw new GameError('ROOM_NOT_FOUND', 'Stanza non trovata');
    if (room.phase !== LOBBY) throw new GameError('GAME_IN_PROGRESS', 'La partita è già iniziata');
    if (room.players.size >= this.opts.maxPlayers) throw new GameError('ROOM_FULL', 'La stanza è piena');
    const player = this.#addPlayer(room, socketId);
    this.commit(room);
    return { room, player };
  }

  roomInfo(rawCode) {
    const room = this.#rooms.get(String(rawCode ?? '').trim().toUpperCase());
    if (!room) return { exists: false, joinable: false };
    return {
      exists: true,
      phase: room.phase,
      playerCount: room.players.size,
      joinable: room.phase === LOBBY && room.players.size < this.opts.maxPlayers,
    };
  }

  #generateCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < this.opts.roomCodeLength; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.#rooms.has(code)) return code;
    }
    throw new GameError('SERVER_BUSY', 'Impossibile generare un codice stanza, riprova');
  }

  #addPlayer(room, socketId) {
    const player = {
      id: randomBytes(8).toString('base64url'),
      token: randomUUID(),
      nickname: null,
      connected: true,
      socketId,
      removalTimer: null,
    };
    this.initPlayer(player);
    room.players.set(player.id, player);
    this.#sessions.set(player.token, { code: room.code, playerId: player.id });
    if (!room.hostId) room.hostId = player.id;
    if (!room.ownerId) room.ownerId = player.id;
    return player;
  }

  /** Nickname unico nella stanza (senza distinguere maiuscole). */
  cleanNickname(room, player, nick) {
    const lower = key(nick);
    for (const p of room.players.values()) {
      if (p.id !== player.id && p.nickname && key(p.nickname) === lower) {
        throw new GameError('NICKNAME_TAKEN', 'Nickname già usato in questa stanza');
      }
    }
    return nick;
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
    // Chi ha creato la stanza riprende il ruolo di host appena torna (es. dopo una ricarica):
    // il passaggio ad altri è solo un ripiego finché è offline.
    const host = room.players.get(room.hostId);
    if (player.id === room.ownerId || !host?.connected) room.hostId = player.id;
    this.commit(room);
    return { room, player, previousSocketId };
  }

  /** Il socket è caduto: il giocatore resta in stanza per `disconnectGraceMs`, poi viene rimosso. */
  disconnect(token, socketId) {
    const s = this.getSession(token);
    if (!s || s.player.socketId !== socketId) return; // socket vecchio già sostituito
    const { room, player } = s;
    player.connected = false;
    clearTimeout(player.removalTimer);
    player.removalTimer = setTimeout(() => this.removePlayer(room.code, player.id, 'timeout'), this.opts.disconnectGraceMs);
    player.removalTimer.unref?.();
    if (room.hostId === player.id) this.#reassignHost(room);
    this.commit(room);
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
    this.onPlayerRemoved(room, player);
    this.hooks.onPlayerRemoved(room, player, reason);

    if (room.players.size === 0) {
      this.#rooms.delete(code);
      return;
    }
    if (room.hostId === playerId) this.#reassignHost(room);
    if (room.ownerId === playerId) room.ownerId = room.hostId; // il creatore è uscito: il ruolo passa per sempre
    // Chi se ne va potrebbe essere l'ultimo che si aspettava: ricontrolla le transizioni.
    this.commit(room);
  }

  #reassignHost(room) {
    const players = [...room.players.values()];
    const next = players.find((p) => p.connected) ?? players[0];
    room.hostId = next?.id ?? null;
  }

  kick(token, targetId) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    if (targetId === player.id) throw new GameError('INVALID_INPUT', 'Non puoi espellere te stesso');
    if (!room.players.has(targetId)) throw new GameError('PLAYER_NOT_FOUND', 'Giocatore non trovato');
    this.removePlayer(room.code, targetId, 'kicked');
  }

  // ---------- Stato ----------

  /**
   * Unico punto in cui il gioco valuta le transizioni. Ordine degli eventi verso i client:
   * prima `room:state` a tutti, poi `room:me` a ciascuno, infine gli eventi extra del gioco.
   */
  commit(room) {
    const after = this.evaluate(room);
    this.hooks.onStateChange(room, this.publicState(room));
    for (const p of room.players.values()) this.hooks.onSelfChange(room, p, this.selfView(p, room));
    if (typeof after === 'function') after();
  }

  baseState(room) {
    return {
      code: room.code,
      phase: room.phase,
      hostId: room.hostId,
      minPlayers: this.opts.minPlayers,
      maxPlayers: this.opts.maxPlayers,
    };
  }

  // ---------- Manutenzione ----------

  sweepExpired(now = Date.now()) {
    for (const room of [...this.#rooms.values()]) {
      if (now - room.createdAt > this.opts.roomTtlMs) {
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
