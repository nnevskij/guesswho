import { GameError, cleanText } from '../../errors.js';
import { LOBBY, LobbyManager, nameKey, shuffle } from '../../core/lobby.js';
import { randomInt } from 'node:crypto';
import { CATEGORIES } from './words.js';

export const PHASE = Object.freeze({ LOBBY, CLUES: 'clues', VOTING: 'voting', GUESS: 'guess', RESULT: 'result' });
export const MODE = Object.freeze({ CLASSIC: 'classic', SIMILAR: 'similar' });

/** Punti a fine round. */
export const POINTS = Object.freeze({
  caught: 1, // impostore scoperto: a ogni innocente…
  rightVote: 1, // …più questo a chi ha votato un impostore
  guessed: 3, // impostore scoperto ma indovina la parola: a ogni impostore
  escaped: 2, // accusato un innocente o pareggio: a ogni impostore
});

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/**
 * Impostore: tutti ricevono la stessa parola segreta, tranne gli impostori.
 *   - classica: l'impostore sa di esserlo e non ha la parola; se viene scoperto può provare a indovinarla.
 *   - parola simile: l'impostore riceve una parola vicina e non sa di essere l'impostore.
 * Gli indizi si danno a voce; il telefono mostra la parola, chi inizia, e raccoglie il voto.
 *
 * Room   + { settings: { mode, impostorCount, categories }, custom: { word, similar, authorId } | null,
 *            round: Round | null, roundNumber, usedWords: Set }
 * Round  { mode, word, similar, impostorIds: Set, playerIds: [], starterId, authorId, votes: Map<voter, target>,
 *          accusedId, guess, outcome: 'caught' | 'guessed' | 'escaped' | null, points: Map<id, n> }
 * Player + { score }
 *
 * Parole e ruoli non passano mai in `room:state`: ognuno vede la sua in `room:me`;
 * tutto viene rivelato solo nella fase `result`.
 */
export class ImpostoreManager extends LobbyManager {
  initRoom(room) {
    room.settings = { mode: MODE.CLASSIC, impostorCount: 1, categories: [...CATEGORY_IDS] };
    room.custom = null;
    room.round = null;
    room.roundNumber = 0;
    room.usedWords = new Set();
  }

  initPlayer(player) {
    player.score = 0;
  }

  onPlayerRemoved(room, player) {
    const r = room.round;
    if (!r) return;
    r.votes.delete(player.id);
    for (const [voter, target] of r.votes) if (target === player.id) r.votes.delete(voter);
  }

  /** Impostori massimi per n giocatori: almeno due innocenti per ogni impostore. */
  maxImpostors(n) {
    return Math.max(1, Math.min(this.opts.impostore.maxImpostors, Math.floor((n - 1) / 2)));
  }

  #requireBetweenRounds(room) {
    if (room.phase !== LOBBY && room.phase !== PHASE.RESULT) {
      throw new GameError('GAME_IN_PROGRESS', 'Si può cambiare solo tra un round e l’altro');
    }
  }

  // ---------- Lobby e impostazioni ----------

  setProfile(token, { nickname } = {}) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, LOBBY, 'Non puoi cambiare nickname a partita iniziata');
    const nick = cleanText(nickname, { field: 'nickname', max: this.opts.nicknameMaxLength });
    player.nickname = this.cleanNickname(room, player, nick);
    this.commit(room);
    return this.selfView(player, room);
  }

  setSettings(token, { mode, impostorCount, categories } = {}) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.#requireBetweenRounds(room);
    const next = { ...room.settings };
    if (mode !== undefined) {
      if (!Object.values(MODE).includes(mode)) throw new GameError('INVALID_INPUT', 'Modalità sconosciuta');
      next.mode = mode;
    }
    if (impostorCount !== undefined) {
      const n = Number(impostorCount);
      if (!Number.isInteger(n) || n < 1 || n > this.opts.impostore.maxImpostors) {
        throw new GameError('INVALID_INPUT', `Gli impostori vanno da 1 a ${this.opts.impostore.maxImpostors}`);
      }
      next.impostorCount = n;
    }
    if (categories !== undefined) {
      if (!Array.isArray(categories) || categories.some((c) => !CATEGORY_IDS.includes(c))) {
        throw new GameError('INVALID_INPUT', 'Categoria sconosciuta');
      }
      next.categories = CATEGORY_IDS.filter((id) => categories.includes(id));
    }
    room.settings = next;
    this.commit(room);
  }

  /** L'host scrive la parola del prossimo round (e la simile per l'altra modalità). `word` vuota = cancella. */
  setCustomWord(token, { word, similar } = {}) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.#requireBetweenRounds(room);
    if (word == null || (typeof word === 'string' && !word.trim())) {
      room.custom = null;
    } else {
      const max = this.opts.impostore.wordMaxLength;
      const w = cleanText(word, { field: 'parola', max });
      const s =
        similar == null || (typeof similar === 'string' && !similar.trim())
          ? null
          : cleanText(similar, { field: 'parola simile', max });
      if (s && nameKey(s) === nameKey(w)) throw new GameError('INVALID_INPUT', 'La parola simile deve essere diversa');
      room.custom = { word: w, similar: s, authorId: player.id };
    }
    this.commit(room);
    return { custom: room.custom && { word: room.custom.word, similar: room.custom.similar } };
  }

  // ---------- Round ----------

  startRound(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.#requireBetweenRounds(room);
    const players = [...room.players.values()];
    if (players.length < this.opts.impostore.minPlayers) {
      throw new GameError('NOT_ENOUGH_PLAYERS', `Servono almeno ${this.opts.impostore.minPlayers} giocatori`);
    }
    if (players.some((p) => !p.nickname)) throw new GameError('PROFILE_INCOMPLETE', 'Qualcuno non ha ancora scelto il nickname');
    const { mode, impostorCount, categories } = room.settings;
    const custom = room.custom;
    if (mode === MODE.SIMILAR && custom && !custom.similar) {
      throw new GameError('INVALID_INPUT', 'Nella modalità parola simile serve anche la parola simile');
    }
    if (!custom && categories.length === 0) throw new GameError('INVALID_INPUT', 'Scegli almeno una categoria');

    const pair = custom ? [custom.word, custom.similar] : this.#pickPair(room);
    // Chi ha scritto la parola la conosce già: in quel round non può essere impostore.
    const authorId = custom && room.players.has(custom.authorId) ? custom.authorId : null;
    const candidates = shuffle(players.filter((p) => p.id !== authorId).map((p) => p.id));
    const count = Math.min(impostorCount, this.maxImpostors(players.length), candidates.length - 1);
    const impostorIds = new Set(candidates.slice(0, Math.max(1, count)));
    // Comincia sempre un innocente: il primo indizio è il più difficile da inventare.
    const innocents = players.filter((p) => !impostorIds.has(p.id));
    const starterId = innocents[randomInt(innocents.length)].id;

    room.round = {
      mode, // fissata alla partenza: cambiare le impostazioni a fine round non tocca il round giocato
      word: pair[0],
      similar: pair[1],
      impostorIds,
      playerIds: players.map((p) => p.id),
      starterId,
      authorId,
      votes: new Map(),
      accusedId: null,
      guess: null,
      outcome: null,
      points: new Map(),
    };
    room.custom = null; // la parola scritta vale per un round solo
    room.roundNumber += 1;
    room.phase = PHASE.CLUES;
    this.commit(room);
  }

  /** Una coppia non ancora usata in questa stanza, dalle categorie scelte; finite tutte, si ricomincia. */
  #pickPair(room) {
    const pool = CATEGORIES.filter((c) => room.settings.categories.includes(c.id)).flatMap((c) => c.pairs);
    let fresh = pool.filter(([w]) => !room.usedWords.has(w));
    if (fresh.length === 0) {
      for (const [w] of pool) room.usedWords.delete(w);
      fresh = pool;
    }
    const pair = fresh[randomInt(fresh.length)];
    room.usedWords.add(pair[0]);
    return pair;
  }

  openVoting(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, PHASE.CLUES, 'Non è il momento di votare');
    room.phase = PHASE.VOTING;
    this.commit(room);
  }

  vote(token, targetId) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, PHASE.VOTING, 'Non è il momento di votare');
    const r = room.round;
    if (!r.playerIds.includes(player.id)) throw new GameError('NOT_PLAYING', 'Non partecipi a questo round');
    if (targetId === player.id) throw new GameError('INVALID_INPUT', 'Non puoi votare te stesso');
    if (!r.playerIds.includes(targetId) || !room.players.has(targetId)) {
      throw new GameError('PLAYER_NOT_FOUND', 'Giocatore non trovato');
    }
    r.votes.set(player.id, targetId); // si può cambiare idea finché non hanno votato tutti
    this.commit(room);
  }

  guess(token, word) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, PHASE.GUESS, 'Non è il momento di indovinare');
    const r = room.round;
    if (player.id !== r.accusedId) throw new GameError('NOT_ACCUSED', 'Indovina solo l’impostore scoperto');
    r.guess = cleanText(word, { field: 'parola', max: this.opts.impostore.wordMaxLength });
    this.#finish(room, nameKey(r.guess) === nameKey(r.word) ? 'guessed' : 'caught');
    this.commit(room);
  }

  /** L'host chiude il tentativo se l'accusato è sparito o non risponde. */
  skipGuess(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, PHASE.GUESS, 'Non è il momento di indovinare');
    this.#finish(room, 'caught');
    this.commit(room);
  }

  /** Torna in lobby e azzera la classifica. */
  resetGame(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    room.phase = LOBBY;
    room.round = null;
    room.roundNumber = 0;
    for (const p of room.players.values()) p.score = 0;
    this.commit(room);
  }

  // ---------- Transizioni ----------

  /** Voto chiuso quando hanno votato tutti i giocatori del round ancora presenti e connessi. */
  evaluate(room) {
    if (room.phase !== PHASE.VOTING) return null;
    const r = room.round;
    const voters = r.playerIds.filter((id) => room.players.get(id)?.connected);
    if (voters.length === 0 || !voters.every((id) => r.votes.has(id))) return null;

    const tally = new Map();
    for (const target of r.votes.values()) tally.set(target, (tally.get(target) ?? 0) + 1);
    const top = Math.max(...tally.values());
    const leaders = [...tally].filter(([, n]) => n === top).map(([id]) => id);
    r.accusedId = leaders.length === 1 ? leaders[0] : null; // pareggio: nessun accusato

    if (r.accusedId && r.impostorIds.has(r.accusedId)) {
      const accused = room.players.get(r.accusedId);
      // Modalità classica: l'impostore scoperto ha un'ultima chance, se è ancora qui.
      if (r.mode === MODE.CLASSIC && accused?.connected) room.phase = PHASE.GUESS;
      else this.#finish(room, 'caught');
    } else {
      this.#finish(room, 'escaped');
    }
    return null;
  }

  #finish(room, outcome) {
    const r = room.round;
    r.outcome = outcome;
    const add = (id, n) => {
      if (!n || !room.players.has(id)) return;
      r.points.set(id, (r.points.get(id) ?? 0) + n);
      room.players.get(id).score += n;
    };
    for (const id of r.playerIds) {
      const impostor = r.impostorIds.has(id);
      if (outcome === 'caught' && !impostor) {
        add(id, POINTS.caught);
        if (r.impostorIds.has(r.votes.get(id))) add(id, POINTS.rightVote);
      }
      if (outcome === 'guessed' && impostor) add(id, POINTS.guessed);
      if (outcome === 'escaped' && impostor) add(id, POINTS.escaped);
    }
    room.phase = PHASE.RESULT;
  }

  // ---------- Viste ----------

  publicState(room) {
    const r = room.round;
    const voting = room.phase === PHASE.VOTING;
    const result = room.phase === PHASE.RESULT;
    const players = [...room.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      connected: p.connected,
      score: p.score,
      playing: Boolean(r?.playerIds.includes(p.id)),
      voted: Boolean(voting && r?.votes.has(p.id)),
    }));
    return {
      ...this.baseState(room),
      minPlayers: this.opts.impostore.minPlayers,
      players,
      settings: room.settings,
      maxImpostors: this.maxImpostors(players.length),
      impostorLimit: this.opts.impostore.maxImpostors,
      wordMaxLength: this.opts.impostore.wordMaxLength,
      categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, count: c.pairs.length })),
      customWordSet: Boolean(room.custom),
      roundNumber: room.roundNumber,
      round: r && {
        starterId: r.starterId,
        // Ordine degli indizi: dalla persona che inizia, seguendo la lista dei giocatori.
        order: [...r.playerIds.slice(r.playerIds.indexOf(r.starterId)), ...r.playerIds.slice(0, r.playerIds.indexOf(r.starterId))],
        votedCount: voting ? r.votes.size : 0,
        accusedId: room.phase === PHASE.GUESS || result ? r.accusedId : null,
        // Tutto il resto si scopre solo a fine round.
        reveal: result
          ? {
              word: r.word,
              similar: r.mode === MODE.SIMILAR ? r.similar : null,
              impostorIds: [...r.impostorIds],
              guess: r.guess,
              outcome: r.outcome,
              votes: [...r.votes].map(([voterId, targetId]) => ({ voterId, targetId })),
              points: Object.fromEntries(r.points),
            }
          : null,
      },
    };
  }

  selfView(player, room) {
    const r = room?.round;
    const inRound = Boolean(r && room.phase !== LOBBY && r.playerIds.includes(player.id));
    const impostor = inRound && r.impostorIds.has(player.id);
    const classic = r?.mode === MODE.CLASSIC;
    return {
      playerId: player.id,
      nickname: player.nickname,
      // Classica: l'impostore non ha parola e sa di esserlo. Parola simile: riceve l'altra parola e non sa nulla.
      word: !inRound ? null : impostor ? (classic ? null : r.similar) : r.word,
      isImpostor: inRound && classic ? impostor : null,
      // Chi ha scritto la parola del round la conosce già, e sa di non essere impostore.
      wroteWord: inRound && r.authorId === player.id,
      vote: inRound ? (r.votes.get(player.id) ?? null) : null,
      // L'host vede la parola che ha scritto per il prossimo round (gli altri sanno solo che c'è).
      custom: room && room.hostId === player.id && room.custom ? { word: room.custom.word, similar: room.custom.similar } : null,
    };
  }
}
