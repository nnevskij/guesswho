import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../src/app.js';
import { loadConfig } from '../src/config.js';

let server;
let url;
const clients = [];

before(async () => {
  server = createGameServer({ ...loadConfig({}), disconnectGraceMs: 300 });
  const { port } = await server.listen(0, '127.0.0.1');
  url = `http://127.0.0.1:${port}`;
});

after(async () => {
  for (const c of clients) c.disconnect();
  await server.close();
});

const client = (auth) => {
  const c = connect(`${url}/funnystories`, { transports: ['websocket'], forceNew: true, auth });
  clients.push(c);
  // Tiene l'ultima vista privata ricevuta, per controllare cosa arriva a chi.
  c.on('room:me', (me) => (c.me = me));
  c.on('room:state', (s) => (c.state = s));
  return c;
};
const call = (c, event, payload) => c.timeout(2000).emitWithAck(event, payload);
const tick = () => new Promise((r) => setTimeout(r, 50));

test('partita completa: domande, turni a fogli passati, lettura solo per l host', async () => {
  const a = client();
  const b = client();
  const c = client();

  const created = await call(a, 'room:create');
  const code = created.roomCode;
  assert.equal(created.state.phase, 'lobby');
  assert.ok(created.state.questions.length >= 2, 'la stanza nasce con le domande di default');

  await call(b, 'room:join', { code });
  await call(c, 'room:join', { code });

  // Le domande le cambia solo l'host, tra 2 e 12.
  assert.equal((await call(b, 'room:questions', { questions: ['A:', 'B:'] })).error.code, 'NOT_HOST');
  assert.equal((await call(a, 'room:questions', { questions: ['Solo una:'] })).error.code, 'INVALID_INPUT');
  assert.equal((await call(a, 'room:questions', { questions: ['Lui è:', 'Lei è:', 'Alla fine:'] })).ok, true);

  // Senza nickname non si parte.
  assert.equal((await call(a, 'game:start')).error.code, 'PROFILE_INCOMPLETE');
  await call(a, 'player:profile', { nickname: 'Anna' });
  await call(b, 'player:profile', { nickname: 'Bruno' });
  assert.equal((await call(c, 'player:profile', { nickname: 'anna' })).error.code, 'NICKNAME_TAKEN');
  await call(c, 'player:profile', { nickname: 'Carla' });

  assert.equal((await call(b, 'game:start')).error.code, 'NOT_HOST');
  assert.equal((await call(a, 'game:start')).ok, true);
  await tick();
  assert.equal(a.state.phase, 'writing');
  assert.equal(a.state.question, 'Lui è:');

  // A partita iniziata non entra nessuno.
  const late = client();
  assert.equal((await call(late, 'room:join', { code })).error.code, 'GAME_IN_PROGRESS');

  // Tre turni: a ogni turno ognuno risponde una volta sola, poi il foglio passa.
  const writers = [
    [a, 'A'],
    [b, 'B'],
    [c, 'C'],
  ];
  for (let round = 0; round < 3; round++) {
    for (const [p, name] of writers) {
      assert.equal((await call(p, 'game:answer', { text: `${name}${round}` })).ok, true);
      if (p !== c) assert.equal((await call(p, 'game:answer', { text: 'di nuovo' })).error.code, 'ALREADY_ANSWERED');
    }
    await tick();
    // Le risposte non viaggiano mai nello stato pubblico, né nelle viste private durante la scrittura.
    assert.ok(!JSON.stringify(b.state).includes(`A${round}`));
    assert.equal(b.me.stories, null);
  }

  assert.equal(a.state.phase, 'reading');
  assert.equal(a.state.storyCount, 3);
  assert.equal(b.me.stories, null, 'chi non è host non legge le storie');
  const stories = a.me.stories;
  assert.equal(stories.length, 3);

  // Ogni foglio ha una risposta per domanda, ognuna scritta da un giocatore diverso.
  for (const story of stories) {
    assert.deepEqual(
      story.map((l) => l.question),
      ['Lui è:', 'Lei è:', 'Alla fine:'],
    );
    const authors = story.map((l) => l.answer[0]);
    assert.equal(new Set(authors).size, 3, `foglio con autori ripetuti: ${authors}`);
    story.forEach((l, round) => assert.equal(l.answer.slice(1), String(round)));
  }
  // Il foglio di Anna: lei scrive la prima riga, poi lo passa a Bruno, poi a Carla.
  assert.deepEqual(
    stories[0].map((l) => l.answer),
    ['A0', 'B1', 'C2'],
  );

  // Solo l'host sfoglia le storie, e tutti vedono a che punto è.
  assert.equal((await call(b, 'story:show', { index: 1 })).error.code, 'NOT_HOST');
  assert.equal((await call(a, 'story:show', { index: 5 })).error.code, 'INVALID_INPUT');
  await call(a, 'story:show', { index: 2 });
  await tick();
  assert.equal(c.state.storyIndex, 2);

  // Nuova partita: si torna in lobby con le stesse domande.
  await call(a, 'game:reset');
  await tick();
  assert.equal(b.state.phase, 'lobby');
  assert.deepEqual(b.state.questions, ['Lui è:', 'Lei è:', 'Alla fine:']);
  assert.equal(a.me.stories, null);
});

test('chi si disconnette si può saltare; chi esce lascia il posto vuoto', async () => {
  const a = client();
  const b = client();
  const c = client();
  const { roomCode: code } = await call(a, 'room:create');
  await call(b, 'room:join', { code });
  await call(c, 'room:join', { code });
  await call(a, 'room:questions', { questions: ['Uno:', 'Due:'] });
  for (const [p, n] of [
    [a, 'Ada'],
    [b, 'Bea'],
    [c, 'Cia'],
  ]) {
    await call(p, 'player:profile', { nickname: n });
  }
  await call(a, 'game:start');

  await call(a, 'game:answer', { text: 'a0' });
  await call(b, 'game:answer', { text: 'b0' });
  c.disconnect(); // telefono in standby: il turno resta bloccato
  await tick();
  assert.equal(a.state.round, 0);
  assert.equal((await call(b, 'game:skip')).error.code, 'NOT_HOST');
  await call(a, 'game:skip');
  await tick();
  assert.equal(a.state.round, 1, "saltato chi manca, il turno passa");

  await call(a, 'game:answer', { text: 'a1' });
  await call(b, 'room:leave'); // Bea esce: il suo posto non blocca più il turno
  await tick();
  // Carla è ancora disconnessa: va saltata anche in questo turno.
  await call(a, 'game:skip');
  await tick();
  assert.equal(a.state.phase, 'reading');
  const answers = a.me.stories.flat().map((l) => l.answer);
  assert.deepEqual(answers.filter(Boolean).sort(), ['a0', 'a1', 'b0']);
  assert.equal(answers.filter((x) => x === null).length, 3);
});

test('chi ha creato la stanza torna host quando si riconnette', async () => {
  const a = client();
  const b = client();
  const created = await call(a, 'room:create');
  await call(b, 'room:join', { code: created.roomCode });
  const ownerId = created.me.playerId;

  a.disconnect(); // ricarica della pagina
  await tick();
  assert.notEqual(b.state.hostId, ownerId, 'mentre è offline comanda un altro');

  const back = client({ token: created.token });
  await new Promise((r) => back.once('session:resumed', r));
  await tick();
  assert.equal(b.state.hostId, ownerId);
});
