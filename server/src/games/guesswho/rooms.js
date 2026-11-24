import { GameError, cleanText } from '../../errors.js';
import { LOBBY, LobbyManager, key, shuffle } from '../../core/lobby.js';
import { FALLBACK_DECOYS } from './decoys.js';

export const PHASE = Object.freeze({ LOBBY, PLAYING: 'playing' });

/**
 * Guess Who: ognuno scrive un personaggio segreto, quando tutti sono pronti la lista (mescolata,
 * con qualche nome falso) compare su tutti i telefoni. Si può rileggere se tutti votano.
 *
 * Room   + { characters: [{playerId, name}], decoyCount, rereadRound }
 * Player + { character, decoy, ready, rereadVote }
 *
 * I nomi falsi stanno in `characters` con `playerId: null`: nessuno, server compreso, li distingue
 * più da quelli veri una volta mescolati, e non vengono mai rivelati.
 */
export class GuessWhoManager extends LobbyManager {
  initRoom(room) {
    room.characters = [];
    room.decoyCount = this.opts.defaultDecoys;
    room.rereadRound = 0;
  }

  initPlayer(player) {
    player.character = null;
    player.decoy = null;
    player.ready = false;
    player.rereadVote = false;
  }

  onPlayerRemoved(room, player) {
    room.characters = room.characters.filter((c) => c.playerId !== player.id);
  }

  // ---------- Azioni di gioco ----------

  setProfile(token, { nickname, character, decoy } = {}) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, LOBBY, 'Non puoi cambiare profilo a partita iniziata');
    const nick = cleanText(nickname, { field: 'nickname', max: this.opts.nicknameMaxLength });
    const char = cleanText(character, { field: 'personaggio', max: this.opts.characterMaxLength });
    // Il nome falso è facoltativo: vuoto o assente = nessuno.
    const fake =
      decoy == null || (typeof decoy === 'string' && !decoy.trim())
        ? null
        : cleanText(decoy, { field: 'nome falso', max: this.opts.characterMaxLength });
    if (fake && key(fake) === key(char)) {
      throw new GameError('INVALID_INPUT', 'Il nome falso deve essere diverso dal tuo personaggio');
    }
    player.nickname = this.cleanNickname(room, player, nick);
    player.character = char;
    player.decoy = fake;
    player.ready = false; // modificare il profilo annulla il "sono pronto"
    this.commit(room);
    return this.selfView(player);
  }

  /** Quanti nomi falsi aggiungere alla lista (solo host, in lobby). */
  setDecoys(token, count) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    this.requirePhase(room, LOBBY);
    const n = Number(count);
    if (!Number.isInteger(n) || n < 0 || n > this.opts.maxDecoys) {
      throw new GameError('INVALID_INPUT', `I nomi falsi vanno da 0 a ${this.opts.maxDecoys}`);
    }
    room.decoyCount = n;
    this.commit(room);
  }

  setReady(token, ready) {
    const { room, player } = this.requireSession(token);
    this.requirePhase(room, LOBBY);
    if (ready && !(player.nickname && player.character)) {
      throw new GameError('PROFILE_INCOMPLETE', 'Inserisci nickname e personaggio prima di dirti pronto');
    }
    player.ready = Boolean(ready);
    this.commit(room);
  }

  voteReread(token, vote) {
    const { room, player } = this.requireSession(token);
    if (room.phase !== PHASE.PLAYING) throw new GameError('NOT_PLAYING', 'La partita non è ancora iniziata');
    player.rereadVote = Boolean(vote);
    this.commit(room);
  }

  resetGame(token) {
    const { room, player } = this.requireSession(token);
    this.requireHost(room, player);
    room.phase = PHASE.LOBBY;
    room.characters = [];
    for (const p of room.players.values()) {
      p.ready = false;
      p.rereadVote = false;
    }
    this.commit(room);
  }

  // ---------- Transizioni ----------

  /** Votazioni unanimi: tutti pronti fa partire, tutti "rileggi" rimostra la lista. */
  evaluate(room) {
    const players = [...room.players.values()];
    let show = null;

    if (room.phase === PHASE.LOBBY) {
      if (players.length >= this.opts.minPlayers && players.every((p) => p.ready)) {
        room.phase = PHASE.PLAYING;
        const real = players.map((p) => ({ playerId: p.id, name: p.character }));
        const fakes = this.#pickDecoys(room.decoyCount, players).map((name) => ({ playerId: null, name }));
        room.characters = shuffle([...real, ...fakes]);
        room.rereadRound = 0;
        for (const p of players) p.rereadVote = false;
        show = 'start';
      }
    } else if (players.length > 0 && players.every((p) => p.rereadVote)) {
      for (const p of players) p.rereadVote = false;
      room.rereadRound += 1;
      show = 'reread';
    }

    if (!show) return null;
    return () =>
      this.hooks.onShowCharacters?.(room, {
        reason: show,
        round: room.rereadRound,
        // L'ordine è mescolato una volta sola all'inizio, così le riletture mostrano la stessa lista.
        // Gli autori non vengono inviati: nessuno può risalire a chi ha scritto cosa.
        characters: room.characters.map((c) => c.name),
        // Tempi decisi dal server, così tutti i telefoni contano alla rovescia e chiudono insieme.
        countdownMs: this.opts.revealCountdownMs,
        durationMs: this.opts.revealDurationMs,
      });
  }

  /**
   * Prima i nomi falsi scritti dai giocatori (estratti a caso), poi, se non bastano, quelli di riserva.
   * Scarta i doppioni e qualunque nome uguale a un personaggio vero.
   */
  #pickDecoys(count, players) {
    if (count <= 0) return [];
    const taken = new Set(players.map((p) => key(p.character)));
    const picked = [];
    const take = (name) => {
      if (picked.length >= count || taken.has(key(name))) return;
      taken.add(key(name));
      picked.push(name);
    };
    for (const name of shuffle(players.map((p) => p.decoy).filter(Boolean))) take(name);
    for (const name of shuffle([...FALLBACK_DECOYS])) take(name);
    return picked;
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
      ...this.baseState(room),
      players,
      readyCount: players.filter((p) => p.ready).length,
      rereadCount: players.filter((p) => p.rereadVote).length,
      charactersCount: room.characters.length,
      decoyCount: room.decoyCount,
      maxDecoys: this.opts.maxDecoys,
      rereadRound: room.rereadRound,
    };
  }

  selfView(player) {
    return { playerId: player.id, nickname: player.nickname, character: player.character, decoy: player.decoy };
  }
}
