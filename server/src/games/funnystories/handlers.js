/**
 * Eventi di Funny Stories (namespace /funnystories), oltre a quelli comuni di core/handlers.js:
 *   player:profile { nickname }         -> { me }
 *   room:questions { questions: string[] }  (solo host, in lobby)
 *   game:start                              (solo host, in lobby)
 *   game:answer    { text }                 (scrittura: risposta alla domanda del turno)
 *   game:skip                               (solo host: salta chi è disconnesso in questo turno)
 *   story:show     { index }                (solo host, in lettura: quale storia è sullo schermo)
 *   game:reset                              (solo host: torna in lobby)
 *
 * `room:me` porta a ognuno se ha già risposto; all'host, in lettura, anche `stories`.
 */
export const registerFunnyStories = (manager) => (on) => {
  on('player:profile', (data, token) => ({ me: manager.setProfile(token, data) }));
  on('room:questions', ({ questions }, token) => void manager.setQuestions(token, questions));
  on('game:start', (_data, token) => void manager.start(token));
  on('game:answer', ({ text }, token) => void manager.answer(token, text));
  on('game:skip', (_data, token) => void manager.skipMissing(token));
  on('story:show', ({ index }, token) => void manager.showStory(token, index));
  on('game:reset', (_data, token) => void manager.resetGame(token));
};
