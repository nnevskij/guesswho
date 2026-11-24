# Giochi Loschi — game server (giochiloschi.com)

Backend realtime per la raccolta di giochi: **Node.js 20+, Express 5, Socket.IO 4**, stato in memoria.
Un solo server per tutti i giochi: ognuno ha il suo **namespace** Socket.IO (`/guesswho`, `/funnystories`, `/impostore`), con stanze, codici ed eventi separati.

## Perché queste tecnologie

- **Socket.IO** invece di `ws` puro: ti dà gratis stanze (`io.to(code)`), namespace, ack (richiesta/risposta), riconnessione automatica e heartbeat. Per un party game l'overhead è trascurabile.
- **Express** solo per `/health` (healthcheck di Railway) e `/:game/rooms/:code`.
- **Stato in memoria** (Map), senza database: le partite durano poco e ogni azione costa O(numero giocatori). Una sola istanza regge facilmente migliaia di stanze.
- Il client si connette **solo via WebSocket** (`transports: ['websocket']`), senza long-polling: meno latenza e meno richieste.

## Struttura

```
src/
  app.js                 server HTTP + Socket.IO; elenco dei giochi (GAMES) e loro namespace
  core/lobby.js          LobbyManager: stanze, codici, token, riconnessione, host, espulsioni, scadenze
  core/handlers.js       eventi comuni (room:create/join/leave, player:kick, sessioni)
  games/guesswho/        GuessWhoManager + eventi + nomi falsi di riserva
  games/funnystories/    FunnyStoriesManager + eventi
  games/impostore/       ImpostoreManager + eventi + parole per categoria (words.js)
```

**Aggiungere un gioco:** una classe che estende `LobbyManager` (ridefinisce `initRoom`, `initPlayer`, `evaluate`, `publicState`, `selfView`), una funzione che registra i suoi eventi, e una voce in `GAMES` dentro `app.js`.

## Avvio locale

```bash
npm install
npm run dev     # http://localhost:3001
npm test
```

## Deploy su Railway

1. Crea un nuovo servizio dal repo e imposta **Root Directory = `server`**.
2. Variabili: `CLIENT_ORIGIN=https://giochiloschi.com,https://www.giochiloschi.com` (le origini da cui si aprono i giochi, separate da virgola; aggiungi l'indirizzo `.vercel.app` se lo usi ancora). `PORT` lo imposta Railway.
3. Genera un dominio pubblico. Nel client Next.js metti `NEXT_PUBLIC_SERVER_URL=https://<dominio>.up.railway.app` (senza namespace: lo aggiunge il client).

`railway.json` imposta già start command, healthcheck su `/health` e **1 replica**. Lo stato è in memoria, quindi un redeploy chiude le partite in corso. Per scalare su più istanze servono `@socket.io/redis-adapter` e lo stato spostato su Redis.

## Parte comune (tutti i giochi)

- **Host:** chi crea la stanza. Se cade, il ruolo passa temporaneamente a un altro giocatore connesso e torna a lui appena si riconnette. Se esce davvero, il ruolo passa per sempre.
- **Riconnessione:** alla creazione o all'ingresso il server restituisce un `token` segreto. Il client lo salva in `localStorage` (una chiave per gioco) e lo passa in `auth` a ogni connessione: il server riaggancia la sessione da solo ed emette `session:resumed`. Un giocatore disconnesso resta nella stanza per `DISCONNECT_GRACE_MS` (default 5 min), poi viene rimosso.
- A partita iniziata non può entrare nessuno di nuovo, ma chi era già dentro può riconnettersi.

Client → server, con ack `{ ok: true, ... }` oppure `{ ok: false, error: { code, message } }`:

| Evento | Payload | Risposta |
|---|---|---|
| `room:create` | – | `{ roomCode, token, me, state }` |
| `room:join` | `{ code }` | `{ roomCode, token, me, state }` |
| `room:leave` | – | |
| `player:kick` | `{ playerId }` (solo host) | |

Server → client:

| Evento | Payload |
|---|---|
| `room:state` | stato pubblico della stanza (vedi i singoli giochi) |
| `room:me` | vista privata del giocatore (vedi i singoli giochi) |
| `session:resumed` | `{ roomCode, token, me, state }` |
| `session:invalid` / `session:replaced` | – |
| `room:removed` | `{ reason: 'kicked' \| 'timeout' \| 'expired' }` |

Codici di errore: `ROOM_NOT_FOUND`, `ROOM_FULL`, `GAME_IN_PROGRESS`, `WRONG_PHASE`, `NOT_IN_ROOM`, `NOT_PLAYING`, `PROFILE_INCOMPLETE`, `NICKNAME_TAKEN`, `CHARACTER_TAKEN`, `NOT_HOST`, `NOT_ENOUGH_PLAYERS`, `ALREADY_ANSWERED`, `NOT_ACCUSED`, `PLAYER_NOT_FOUND`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL`.

HTTP: `GET /health` → `{ status, rooms: { guesswho, funnystories, impostore }, sockets, uptime }`; `GET /:game/rooms/:code` → `{ exists, joinable, phase, playerCount }`.

## Guess Who (`/guesswho`)

```
lobby ──(tutti "sono pronto", almeno MIN_PLAYERS)──▶ playing
  ▲                                                  │  tutti "voglio rileggere" ⇒ characters:show (reread), voti azzerati
  └──────────────── game:reset (host) ───────────────┘
```

- Per dirsi pronti servono nickname e personaggio. Modificare il profilo annulla il "pronto".
- Ogni personaggio una volta sola per stanza (`CHARACTER_TAKEN`): il confronto ignora maiuscole, accenti, punteggiatura e spazi doppi.
- All'avvio i personaggi vengono mescolati **una volta sola**: ogni rilettura mostra la stessa lista, **senza gli autori**. I personaggi non passano mai in `room:state`: arrivano solo con `characters:show`.
- **Nomi falsi:** alla partenza si aggiungono da 0 a 3 nomi falsi (default 2, `DEFAULT_DECOYS`; li sceglie l'host). Prima quelli scritti dai giocatori nel profilo, poi quelli di riserva in `games/guesswho/decoys.js`. Mai rivelati.

| Evento | Payload |
|---|---|
| `player:profile` | `{ nickname, character, decoy? }` → `{ me }` |
| `room:decoys` | `{ count: 0..3 }` (solo host, in lobby) |
| `player:ready` | `{ ready: boolean }` |
| `game:reread` | `{ vote: boolean }` |
| `game:reset` | – (solo host) |
| ⇐ `characters:show` | `{ reason: 'start' \| 'reread', round, characters: string[], countdownMs, durationMs }` |

## Funny Stories (`/funnystories`)

Il foglio piegato. L'host sceglie le domande (2–12); ogni giocatore parte con un foglio. A ogni turno tutti rispondono alla stessa domanda senza vedere cosa c'è già scritto, poi i fogli passano al giocatore successivo. Alla fine **solo l'host** riceve le storie e le legge una alla volta; gli altri vedono a che punto è.

```
lobby ──game:start (host)──▶ writing ──(tutti hanno risposto all'ultima domanda)──▶ reading
  ▲                                                                                   │
  └──────────────────────────────── game:reset (host) ────────────────────────────────┘
```

- Al turno `r` il giocatore in posizione `i` scrive sul foglio `(i - r) mod N`: ogni foglio raccoglie risposte di giocatori diversi.
- Le risposte non passano mai in `room:state`. `room:me` porta a ognuno `answered`, e all'host in lettura anche `stories: [[{ question, answer }]]`.
- Se qualcuno è offline l'host può saltarlo (`game:skip`): la sua riga resta vuota. Chi esce durante la partita lascia il posto vuoto e non blocca i turni.

| Evento | Payload |
|---|---|
| `player:profile` | `{ nickname }` → `{ me }` |
| `room:questions` | `{ questions: string[] }` (solo host, in lobby) |
| `game:start` | – (solo host, in lobby, tutti con nickname) |
| `game:answer` | `{ text }` (una volta per turno) |
| `game:skip` | – (solo host: salta chi è disconnesso) |
| `story:show` | `{ index }` (solo host, in lettura) |
| `game:reset` | – (solo host) |

## Impostore (`/impostore`)

Tutti ricevono la stessa parola segreta, tranne gli impostori (da 1 a 3, mai più di uno ogni due innocenti). Gli indizi si danno a voce; il telefono mostra la parola, chi inizia (sempre un innocente) e raccoglie il voto. Due modalità, scelte dall'host e fissate all'avvio di ogni round:

- **classica**: l'impostore sa di esserlo e non conosce la parola. Se viene scoperto ha un'ultima chance (`guess`): se indovina la parola vince lui.
- **parola simile**: l'impostore riceve una parola vicina (le coppie in `games/impostore/words.js`) e non sa di essere l'impostore.

```
lobby ──game:start──▶ clues ──game:vote (host)──▶ voting ──(hanno votato tutti i connessi)──▶ result
                        ▲                            │ classica, accusato un impostore ──▶ guess ──▶ result
                        └──────── game:start (host): round successivo, da result ─────────────────────┘
game:reset (host) riporta in lobby da qualunque fase e azzera la classifica.
```

- Voto: si vota un altro giocatore e si può cambiare idea finché non hanno votato tutti. Pareggio = nessun accusato.
- Punti: impostore scoperto → +1 a ogni innocente e +1 a chi l'ha votato; impostore che indovina → +3 agli impostori; innocente accusato o pareggio → +2 agli impostori.
- L'host può scrivere la parola del prossimo round (e la simile); in quel round non può essere impostore. Altrimenti si pesca dalle categorie scelte, senza ripetere parole finché non sono finite.
- Parole e ruoli non passano mai in `room:state`: ognuno riceve la sua in `room:me` (`word`, `isImpostor` solo nella classica, `wroteWord`); tutto si rivela in `round.reveal` a fine round.

| Evento | Payload |
|---|---|
| `player:profile` | `{ nickname }` → `{ me }` |
| `room:settings` | `{ mode?: 'classic' \| 'similar', impostorCount?, categories? }` (solo host, tra un round e l'altro) |
| `room:customWord` | `{ word, similar? }`, `word` vuota cancella (solo host) |
| `game:start` | – (solo host: nuovo round) |
| `game:vote` | – (solo host: dagli indizi al voto) |
| `game:castVote` | `{ targetId }` |
| `game:guess` | `{ word }` (solo l'impostore scoperto, classica) |
| `game:skipGuess` | – (solo host, se l'accusato è offline) |
| `game:reset` | – (solo host: lobby e classifica azzerata) |
