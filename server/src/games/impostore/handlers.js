/**
 * Eventi di Impostore (namespace /impostore), oltre a quelli comuni di core/handlers.js:
 *   player:profile  { nickname }                                  -> { me }
 *   room:settings   { mode?, impostorCount?, categories? }        (solo host, tra un round e l'altro)
 *   room:customWord { word, similar? }  (word vuota = cancella)   -> { custom } (solo host, tra un round e l'altro)
 *   game:start                                                     (solo host: nuovo round)
 *   game:vote       ...                                            (solo host: dagli indizi al voto)
 *   game:castVote   { targetId }                                   (durante il voto, si può cambiare)
 *   game:guess      { word }                                       (solo l'impostore scoperto, modalità classica)
 *   game:skipGuess                                                 (solo host)
 *   game:reset                                                     (solo host: lobby e classifica azzerata)
 *
 * `room:me` porta a ognuno la sua parola (o `isImpostor` nella classica) e il suo voto.
 */
export const registerImpostore = (manager) => (on) => {
  on('player:profile', (data, token) => ({ me: manager.setProfile(token, data) }));
  on('room:settings', (data, token) => void manager.setSettings(token, data));
  on('room:customWord', (data, token) => manager.setCustomWord(token, data));
  on('game:start', (_data, token) => void manager.startRound(token));
  on('game:vote', (_data, token) => void manager.openVoting(token));
  on('game:castVote', ({ targetId }, token) => void manager.vote(token, targetId));
  on('game:guess', ({ word }, token) => void manager.guess(token, word));
  on('game:skipGuess', (_data, token) => void manager.skipGuess(token));
  on('game:reset', (_data, token) => void manager.resetGame(token));
};
