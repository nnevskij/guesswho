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
  const c = connect(url, { transports: ['websocket'], forceNew: true, auth });
  clients.push(c);
  return c;
};
const call = (c, event, payload) => c.timeout(2000).emitWithAck(event, payload);
const next = (c, event) => new Promise((resolve) => c.once(event, resolve));

test('flusso completo: crea, entra, profilo, pronto, rileggi, riconnessione', async () => {
  const a = client();
  const b = client();
  const c = client();

  const created = await call(a, 'room:create');
  assert.equal(created.ok, true);
  assert.match(created.roomCode, /^[A-Z0-9]{5}$/);
  const code = created.roomCode;

  assert.equal((await call(b, 'room:join', { code: code.toLowerCase() })).ok, true);
  const joinC = await call(c, 'room:join', { code });
  assert.equal(joinC.state.players.length, 3);

  assert.equal((await call(a, 'room:join', { code: 'ZZZZZ' })).error.code, 'ROOM_NOT_FOUND');
  // a ha provato a entrare altrove ed è fallito: è ancora nella stanza originale
  const notReady = await call(a, 'player:ready', { ready: true });
  assert.equal(notReady.error.code, 'PROFILE_INCOMPLETE');

  // nomi falsi: 2 di default, li cambia solo l'host, tra 0 e 3
  assert.equal(created.state.decoyCount, 2);
  assert.equal((await call(b, 'room:decoys', { count: 1 })).error.code, 'NOT_HOST');
  assert.equal((await call(a, 'room:decoys', { count: 4 })).error.code, 'INVALID_INPUT');
  assert.equal((await call(a, 'room:decoys', { count: 3 })).ok, true);

  const sameAsMine = await call(a, 'player:profile', { nickname: 'Anna', character: 'Napoleone', decoy: 'napoleone' });
  assert.equal(sameAsMine.error.code, 'INVALID_INPUT');
  const profA = await call(a, 'player:profile', { nickname: 'Anna', character: 'Napoleone', decoy: 'Garibaldi' });
  assert.equal(profA.me.decoy, 'Garibaldi');
  const dup = await call(b, 'player:profile', { nickname: 'anna', character: 'X' });
  assert.equal(dup.error.code, 'NICKNAME_TAKEN');
  // il falso di Bruno coincide con il personaggio vero di Carla: va scartato
  await call(b, 'player:profile', { nickname: 'Bruno', character: 'Topolino', decoy: 'cleopatra' });
  await call(c, 'player:profile', { nickname: '  Carla  ', character: 'Cleopatra', decoy: '' });

  // reread non permesso in lobby
  assert.equal((await call(a, 'game:reread', { vote: true })).error.code, 'NOT_PLAYING');

  await call(a, 'player:ready', { ready: true });
  await call(b, 'player:ready', { ready: true });

  const shows = [a, b, c].map((s) => next(s, 'characters:show'));
  await call(c, 'player:ready', { ready: true });
  const [showA, showB] = await Promise.all(shows);
  assert.equal(showA.reason, 'start');
  assert.equal(showA.countdownMs, 5000);
  assert.equal(showA.durationMs, 30000);
  // 3 veri + 3 falsi: Garibaldi (scritto da Anna) + 2 di riserva, niente doppioni
  assert.equal(showA.characters.length, 6);
  for (const name of ['Cleopatra', 'Napoleone', 'Topolino', 'Garibaldi']) assert.ok(showA.characters.includes(name), name);
  const keys = showA.characters.map((n) => n.toLowerCase());
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(showA.characters, showB.characters);
  assert.equal((await call(a, 'room:decoys', { count: 0 })).error.code, 'GAME_IN_PROGRESS');

  // nuovi giocatori non possono entrare a partita iniziata
  const late = client();
  assert.equal((await call(late, 'room:join', { code })).error.code, 'GAME_IN_PROGRESS');

  // rileggere: solo quando tutti hanno votato
  let shownEarly = false;
  a.once('characters:show', () => (shownEarly = true));
  await call(a, 'game:reread', { vote: true });
  await call(b, 'game:reread', { vote: true });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(shownEarly, false);
  a.off('characters:show');

  const reread = next(b, 'characters:show');
  await call(c, 'game:reread', { vote: true });
  const r = await reread;
  assert.equal(r.reason, 'reread');
  assert.equal(r.round, 1);
  assert.deepEqual(r.characters, showA.characters); // stesso ordine

  // dopo la rilettura i voti si azzerano e serve di nuovo l'unanimità
  const st = await new Promise((resolve) => {
    a.once('room:state', resolve);
    call(a, 'game:reread', { vote: true });
  });
  assert.equal(st.rereadCount, 1);

  // profilo bloccato a partita iniziata
  assert.equal((await call(a, 'player:profile', { nickname: 'X', character: 'Y' })).error.code, 'GAME_IN_PROGRESS');
});

test('riconnessione via auth.token e rimozione dopo il grace period', async () => {
  const a = client();
  const b = client();
  const { roomCode, token: tokenA } = await call(a, 'room:create');
  const joined = await call(b, 'room:join', { code: roomCode });

  // b cade e torna con il suo token
  const offline = next(a, 'room:state');
  b.disconnect();
  const s1 = await offline;
  assert.equal(s1.players.find((p) => p.id === joined.me.playerId).connected, false);

  const b2 = client({ token: joined.token });
  const resumed = await next(b2, 'session:resumed');
  assert.equal(resumed.me.playerId, joined.me.playerId);
  assert.equal(resumed.state.players.length, 2);

  // token invalido
  const ghost = client({ token: 'nope' });
  await next(ghost, 'session:invalid');

  // host (a) cade e non torna: dopo il grace period viene rimosso e b diventa host
  a.disconnect();
  const st = await new Promise((resolve) => {
    b2.on('room:state', (s) => s.players.length === 1 && resolve(s));
  });
  assert.equal(st.hostId, joined.me.playerId);
  assert.equal(server.manager.getSession(tokenA), null);
});

test('chi se ne va sblocca il "sono pronto" degli altri', async () => {
  const a = client();
  const b = client();
  const c = client();
  const { roomCode } = await call(a, 'room:create');
  await call(b, 'room:join', { code: roomCode });
  await call(c, 'room:join', { code: roomCode });
  await call(a, 'room:decoys', { count: 0 });
  await call(a, 'player:profile', { nickname: 'A', character: 'Zorro' });
  await call(b, 'player:profile', { nickname: 'B', character: 'Batman' });
  await call(a, 'player:ready', { ready: true });
  await call(b, 'player:ready', { ready: true });

  const show = next(a, 'characters:show');
  await call(c, 'room:leave');
  const s = await show;
  assert.deepEqual([...s.characters].sort(), ['Batman', 'Zorro']);

  // host resetta: torna in lobby
  await call(a, 'game:reset');
  const info = await fetch(`${url}/rooms/${roomCode}`).then((r) => r.json());
  assert.deepEqual(info, { exists: true, phase: 'lobby', playerCount: 2, joinable: true });
  assert.equal((await call(b, 'game:reset')).error.code, 'NOT_HOST');
});
