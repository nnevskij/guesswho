/**
 * Eventi di Guess Who (namespace /guesswho), oltre a quelli comuni di core/handlers.js:
 *   player:profile { nickname, character, decoy? } -> { me }   (decoy = nome falso facoltativo)
 *   room:decoys   { count: 0..3 }         (solo host, in lobby: quanti nomi falsi aggiungere)
 *   player:ready  { ready: boolean }
 *   game:reread   { vote: boolean }
 *   game:reset                            (solo host: torna in lobby)
 *
 * Server -> client:
 *   characters:show  { reason: 'start' | 'reread', round, characters: string[], countdownMs, durationMs }
 */
export const registerGuessWho = (manager) => (on) => {
  on('player:profile', (data, token) => ({ me: manager.setProfile(token, data) }));
  on('room:decoys', ({ count }, token) => void manager.setDecoys(token, count));
  on('player:ready', ({ ready = true }, token) => void manager.setReady(token, ready));
  on('game:reread', ({ vote = true }, token) => void manager.voteReread(token, vote));
  on('game:reset', (_data, token) => void manager.resetGame(token));
};
