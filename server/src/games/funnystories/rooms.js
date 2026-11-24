import { GameError, cleanText } from '../../errors.js';
import { LOBBY, LobbyManager } from '../../core/lobby.js';

export const PHASE = Object.freeze({ LOBBY, WRITING: 'writing', READING: 'reading' });

/** Domande con cui nasce ogni stanza; l'host può cambiarle in lobby. */
export const DEFAULT_QUESTIONS = Object.freeze([
  'Lui è:',
  'Lei è:',
  'Si incontrano:',
  'Lui le dice:',
  'Lei gli risponde:',
  'Insieme fanno:',
  'La gente dice:',
  'Alla fine:',
]);

/**
 * Funny Stories: il foglio piegato. L'host sceglie le domande; ogni giocatore parte con un foglio,
 * a ogni turno tutti rispondono alla stessa domanda senza vedere cosa c'è già scritto, poi i fogli
 * passano al giocatore successivo. Alla fine solo l'host legge le storie, una alla volta.
 *
 * Room   + { questions: string[], order: playerId[], sheets: [{ answers: (string|null)[] }], round, storyIndex }
 * Player + { answered }
 *
 * Al turno r il giocatore in posizione i dell'ordine scrive sul foglio (i - r) mod N:
 * dopo ogni turno ognuno passa il foglio a chi gli sta dopo.
 * Le risposte non escono mai dal server se non verso l'host, in fase di lettura.
 */
export class FunnyStoriesManager extends LobbyManager {
  initRoom(room) {
    room.questions = [...DEFAULT_QUESTIONS];
    this.#clearGame(room);
  }

  initPlayer(player) {
    player.answered = false;
  }

  #clearGame(room) {
    room.order = [];
    room.sheets = [];
    room.round = 0;
    room.storyIndex = 0;
  }

  /** Chi esce a partita in corso lascia il posto vuoto: i suoi turni restano senza risposta. */
  onPlayerRemoved() {}

  // ---------- Lobby ----------

  setProfile(token, { nickname } = {}) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, LOBBY, 'Non puoi cambiare nickname a partita iniziata');
    const nick = cleanText(nickname, { field: 'nickname', max: this.opts.nicknameMaxLength });
    player.nickname = this.cleanNickname(room, player, nick);
    this.commit(room);
    return this.selfView(player, room);
  }

  setQuestions(token, questions) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, LOBBY);
    const { questionsMin: min, questionsMax: max, questionMaxLength } = this.opts.funny;
    if (!Array.isArray(questions) || questions.length < min || questions.length > max) {
      throw new GameError('INVALID_INPUT', `Servono da ${min} a ${max} domande`);
    }
    room.questions = questions.map((q, i) => cleanText(q, { field: `domanda ${i + 1}`, max: questionMaxLength }));
    this.commit(room);
  }

  start(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, LOBBY);
    const players = [...room.players.values()];
    if (players.length < this.opts.minPlayers) {
      throw new GameError('NOT_ENOUGH_PLAYERS', `Servono almeno ${this.opts.minPlayers} giocatori`);
    }
    if (players.some((p) => !p.nickname)) {
      throw new GameError('PROFILE_INCOMPLETE', 'Qualcuno non ha ancora scelto il nickname');
    }
    room.phase = PHASE.WRITING;
    room.order = players.map((p) => p.id);
    room.sheets = players.map(() => ({ answers: room.questions.map(() => null) }));
    room.round = 0;
    room.storyIndex = 0;
    for (const p of players) p.answered = false;
    this.commit(room);
  }

  // ---------- Scrittura ----------

  answer(token, text) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, PHASE.WRITING, 'Non è il momento di scrivere');
    const slot = room.order.indexOf(player.id);
    if (slot < 0) throw new GameError('NOT_PLAYING', 'Non partecipi a questa partita');
    if (player.answered) throw new GameError('ALREADY_ANSWERED', 'Hai già risposto, aspetta gli altri');
    const answer = cleanText(text, { field: 'risposta', max: this.opts.funny.answerMaxLength });
    room.sheets[this.#sheetOf(room, slot)].answers[room.round] = answer;
    player.answered = true;
    this.commit(room);
  }

  /** L'host salta chi è disconnesso: per loro il foglio di questo turno resta vuoto. */
  skipMissing(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, PHASE.WRITING, 'Non è il momento di scrivere');
    for (const id of room.order) {
      const p = room.players.get(id);
      if (p && !p.connected) p.answered = true;
    }
    this.commit(room);
  }

  #sheetOf(room, slot) {
    const n = room.order.length;
    return (((slot - room.round) % n) + n) % n;
  }

  // ---------- Lettura ----------

  showStory(token, index) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, PHASE.READING, 'Le storie non sono ancora pronte');
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= room.sheets.length) throw new GameError('INVALID_INPUT', 'Storia inesistente');
    room.storyIndex = i;
    this.commit(room);
  }

  /** Torna in lobby (anche a metà partita), tenendo giocatori e domande. */
  resetGame(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    room.phase = PHASE.LOBBY;
    this.#clearGame(room);
    for (const p of room.players.values()) p.answered = false;
    this.commit(room);
  }

  // ---------- Transizioni ----------

  /** Quando tutti i posti hanno risposto (chi è uscito conta come fatto) il turno passa. */
  evaluate(room) {
    if (room.phase !== PHASE.WRITING) return null;
    const done = room.order.every((id) => {
      const p = room.players.get(id);
      return !p || p.answered;
    });
    if (!done) return null;
    room.round += 1;
    for (const p of room.players.values()) p.answered = false;
    if (room.round >= room.questions.length) {
      room.phase = PHASE.READING;
      room.storyIndex = 0;
    }
    return null;
  }

  publicState(room) {
    const writing = room.phase === PHASE.WRITING;
    const players = [...room.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      connected: p.connected,
      playing: room.order.includes(p.id),
      answered: writing && p.answered,
    }));
    return {
      ...this.baseState(room),
      players,
      questions: room.questions,
      questionsMin: this.opts.funny.questionsMin,
      questionsMax: this.opts.funny.questionsMax,
      questionMaxLength: this.opts.funny.questionMaxLength,
      answerMaxLength: this.opts.funny.answerMaxLength,
      round: room.round,
      // Tutti rispondono alla stessa domanda nello stesso turno: la domanda è pubblica, le risposte no.
      question: writing ? room.questions[room.round] : null,
      answeredCount: players.filter((p) => p.answered).length,
      playingCount: room.order.filter((id) => room.players.has(id)).length,
      storyCount: room.sheets.length,
      storyIndex: room.storyIndex,
    };
  }

  selfView(player, room) {
    const reading = room?.phase === PHASE.READING && room.hostId === player.id;
    return {
      playerId: player.id,
      nickname: player.nickname,
      answered: player.answered,
      // Solo l'host, solo a fine partita: le storie complete, senza autori.
      stories: reading
        ? room.sheets.map((s) => s.answers.map((answer, i) => ({ question: room.questions[i], answer })))
        : null,
    };
  }
}
