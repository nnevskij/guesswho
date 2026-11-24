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

const client = () => {
  const c = connect(`${url}/impostore`, { transports: ['websocket'], forceNew: true });
  clients.push(c);
  c.on('room:me', (me) => (c.me = me));
  c.on('room:state', (s) => (c.state = s));
  return c;
};
const call = (c, event, payload) => c.timeout(2000).emitWithAck(event, payload);
const tick = () => new Promise((r) => setTimeout(r, 50));

/** Stanza con 4 giocatori con nickname; il primo è l'host. */
async function room4() {
  const players = [client(), client(), client(), client()];
  const created = await call(players[0], 'room:create');
  for (const p of players.slice(1)) await call(p, 'room:join', { code: created.roomCode });
  for (const [i, p] of players.entries()) await call(p, 'player:profile', { nickname: `P${i}` });
  await tick();
  return players;
}
const scores = (c) => Object.fromEntries(c.state.players.map((p) => [p.id, p.score]));

test('classica: parola a tutti tranne l impostore, voto, ultima chance e punti', async () => {
  const ps = await room4();
  const [host, other] = ps;

  assert.equal((await call(other, 'room:settings', { mode: 'similar' })).error.code, 'NOT_HOST');
  assert.equal((await call(host, 'room:settings', { mode: 'boh' })).error.code, 'INVALID_INPUT');
  assert.equal((await call(host, 'room:settings', { categories: ['cibo'] })).ok, true);
  assert.equal((await call(other, 'game:start')).error.code, 'NOT_HOST');

  assert.equal((await call(host, 'game:start')).ok, true);
  await tick();
  assert.equal(host.state.phase, 'clues');

  const impostors = ps.filter((p) => p.me.isImpostor);
  const innocents = ps.filter((p) => !p.me.isImpostor);
  assert.equal(impostors.length, 1, 'con 4 giocatori c è un solo impostore');
  const [imp] = impostors;
  assert.equal(imp.me.word, null, 'l impostore non vede la parola');
  const word = innocents[0].me.word;
  assert.ok(word);
  assert.ok(innocents.every((p) => p.me.word === word && p.me.isImpostor === false));
  assert.ok(!JSON.stringify(host.state).includes(word), 'la parola non passa nello stato pubblico');
  assert.notEqual(host.state.round.starterId, imp.me.playerId, 'inizia sempre un innocente');
  assert.equal(host.state.round.order[0], host.state.round.starterId);

  // Voto: lo apre l'host; nessuno vota sé stesso; si può cambiare idea.
  assert.equal((await call(imp, 'game:castVote', { targetId: innocents[0].me.playerId })).error.code, 'WRONG_PHASE');
  await call(host, 'game:vote');
  assert.equal((await call(imp, 'game:castVote', { targetId: imp.me.playerId })).error.code, 'INVALID_INPUT');
  await call(imp, 'game:castVote', { targetId: innocents[0].me.playerId });
  await call(imp, 'game:castVote', { targetId: innocents[1].me.playerId });
  for (const p of innocents) await call(p, 'game:castVote', { targetId: imp.me.playerId });
  await tick();

  // Scoperto nella classica: ultima chance. Indovina lui solo, e il confronto ignora maiuscole e accenti.
  assert.equal(host.state.phase, 'guess');
  assert.equal(host.state.round.accusedId, imp.me.playerId);
  assert.equal((await call(innocents[0], 'game:guess', { word })).error.code, 'NOT_ACCUSED');
  const fuzzy = word.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '') + '!';
  assert.equal((await call(imp, 'game:guess', { word: fuzzy })).ok, true);
  await tick();

  assert.equal(host.state.phase, 'result');
  const reveal = host.state.round.reveal;
  assert.equal(reveal.outcome, 'guessed');
  assert.equal(reveal.word, word);
  assert.deepEqual(reveal.impostorIds, [imp.me.playerId]);
  assert.equal(scores(host)[imp.me.playerId], 3);
  assert.ok(innocents.every((p) => scores(host)[p.me.playerId] === 0));

  // Cambiare modalità a fine round non riscrive il round appena giocato.
  await call(host, 'room:settings', { mode: 'similar' });
  await tick();
  assert.equal(imp.me.word, null);
  assert.equal(imp.me.isImpostor, true);
  assert.equal(host.state.round.reveal.similar, null);
  await call(host, 'room:settings', { mode: 'classic' });

  // Round 2: accusato un innocente, l'impostore scappa (+2). Classifica cumulativa.
  await call(host, 'game:start');
  await tick();
  const imp2 = ps.find((p) => p.me.isImpostor);
  const inn2 = ps.filter((p) => p !== imp2);
  assert.notEqual(inn2[0].me.word, word, 'parola nuova a ogni round');
  await call(host, 'game:vote');
  const scapegoat = inn2[0].me.playerId;
  for (const p of ps) await call(p, 'game:castVote', { targetId: p === inn2[0] ? inn2[1].me.playerId : scapegoat });
  await tick();
  assert.equal(host.state.round.reveal.outcome, 'escaped');
  assert.equal(host.state.round.reveal.points[imp2.me.playerId], 2);
  assert.equal(host.state.roundNumber, 2);

  // Fine partita: lobby e classifica azzerata.
  await call(host, 'game:reset');
  await tick();
  assert.equal(other.state.phase, 'lobby');
  assert.ok(other.state.players.every((p) => p.score === 0));
  assert.equal(other.me.word, null);
});

test('parola simile: l impostore riceve l altra parola e non lo sa; parola scritta dall host', async () => {
  const ps = await room4();
  const [host, other] = ps;
  await call(host, 'room:settings', { mode: 'similar' });

  assert.equal((await call(other, 'room:customWord', { word: 'Mare' })).error.code, 'NOT_HOST');
  assert.equal((await call(host, 'room:customWord', { word: 'Mare', similar: 'mare!' })).error.code, 'INVALID_INPUT');
  await call(host, 'room:customWord', { word: 'Mare' });
  assert.equal((await call(host, 'game:start')).error.code, 'INVALID_INPUT', 'nella simile serve anche l altra parola');
  const set = await call(host, 'room:customWord', { word: 'Mare', similar: 'Lago' });
  assert.deepEqual(set.custom, { word: 'Mare', similar: 'Lago' });
  await tick();
  assert.equal(other.state.customWordSet, true);
  assert.equal(other.me.custom, null, 'la parola dell host la vede solo lui');

  await call(host, 'game:start');
  await tick();
  assert.ok(ps.every((p) => p.me.isImpostor === null), 'nella simile nessuno sa se è impostore');
  const imp = ps.find((p) => p.me.word === 'Lago');
  assert.ok(imp, 'un giocatore ha la parola simile');
  assert.notEqual(imp, host, 'chi ha scritto la parola non può essere impostore');
  assert.equal(ps.filter((p) => p.me.word === 'Mare').length, 3);
  assert.equal(host.state.customWordSet, false, 'la parola scritta vale un round solo');

  // Scoperto nella simile: niente ultima chance, punti agli innocenti (+1, +1 a chi l'ha votato).
  await call(host, 'game:vote');
  const innocents = ps.filter((p) => p !== imp);
  await call(imp, 'game:castVote', { targetId: innocents[0].me.playerId });
  await call(innocents[0], 'game:castVote', { targetId: innocents[1].me.playerId });
  for (const p of innocents.slice(1)) await call(p, 'game:castVote', { targetId: imp.me.playerId });
  await tick();
  const reveal = host.state.round.reveal;
  assert.equal(reveal.outcome, 'caught');
  assert.equal(reveal.similar, 'Lago');
  assert.equal(reveal.points[innocents[0].me.playerId], 1, 'innocente che ha sbagliato voto');
  assert.equal(reveal.points[innocents[1].me.playerId], 2, 'innocente che ha votato l impostore');
  assert.equal(reveal.points[imp.me.playerId], undefined);
});

test('pareggio: nessun accusato, vince l impostore; servono 3 giocatori', async () => {
  const a = client();
  const b = client();
  const { roomCode } = await call(a, 'room:create');
  await call(b, 'room:join', { code: roomCode });
  await call(a, 'player:profile', { nickname: 'A' });
  await call(b, 'player:profile', { nickname: 'B' });
  assert.equal((await call(a, 'game:start')).error.code, 'NOT_ENOUGH_PLAYERS');

  const ps = await room4();
  const [host] = ps;
  await call(host, 'room:settings', { impostorCount: 3 }); // con 4 giocatori se ne usa comunque 1
  await call(host, 'game:start');
  await tick();
  assert.equal(ps.filter((p) => p.me.isImpostor).length, 1);
  await call(host, 'game:vote');
  // 2 voti a testa per due giocatori: pareggio
  const [p0, p1, p2, p3] = ps;
  await call(p0, 'game:castVote', { targetId: p1.me.playerId });
  await call(p1, 'game:castVote', { targetId: p0.me.playerId });
  await call(p2, 'game:castVote', { targetId: p0.me.playerId });
  await call(p3, 'game:castVote', { targetId: p1.me.playerId });
  await tick();
  assert.equal(host.state.round.accusedId, null);
  assert.equal(host.state.round.reveal.outcome, 'escaped');
});
