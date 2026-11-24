# guesswho-server

Backend realtime per il gioco: **Node.js 20+, Express 5, Socket.IO 4**, stato in memoria.

## Perché queste tecnologie

- **Socket.IO** invece di `ws` puro: ti dà gratis stanze (`io.to(code)`), ack (richiesta/risposta), riconnessione automatica e heartbeat. Per un party game l'overhead è trascurabile.
- **Express** solo per `/health` (healthcheck di Railway) e `/rooms/:code`.
- **Stato in memoria** (Map), senza database: le partite durano poco e ogni azione costa O(numero giocatori). Una sola istanza regge facilmente migliaia di stanze.
- Il client si connette **solo via WebSocket** (`transports: ['websocket']`), senza long-polling: meno latenza e meno richieste.

## Avvio locale

```bash
npm install
npm run dev     # http://localhost:3001
npm test
```

## Deploy su Railway

1. Crea un nuovo servizio dal repo e imposta **Root Directory = `server`**.
2. Variabili: `CLIENT_ORIGIN=https://tuo-client.vercel.app` (più origini separate da virgola). `PORT` lo imposta Railway.
3. Genera un dominio pubblico. Nel client Next.js metti `NEXT_PUBLIC_SERVER_URL=https://<dominio>.up.railway.app`.

`railway.json` imposta già start command, healthcheck su `/health` e **1 replica**. Lo stato è in memoria, quindi un redeploy chiude le partite in corso. Per scalare su più istanze servono `@socket.io/redis-adapter` e lo stato spostato su Redis.

## Flusso di gioco

```
lobby ──(tutti "sono pronto", almeno MIN_PLAYERS)──▶ playing
  ▲                                                  │  tutti "voglio rileggere" ⇒ characters:show (reread), voti azzerati
  └──────────────── game:reset (host) ───────────────┘
```

- Per dirsi pronti servono nickname e personaggio. Modificare il profilo annulla il "pronto".
- All'avvio i personaggi vengono mescolati **una volta sola**: ogni rilettura mostra la stessa lista, **senza gli autori**.
- I personaggi non passano mai in `room:state`: arrivano solo con `characters:show`.
- Se un giocatore esce o viene rimosso, l'unanimità viene ricontrollata (chi resta non rimane bloccato).
- A partita iniziata non può entrare nessuno di nuovo, ma chi era già dentro può riconnettersi.

## Nomi falsi

Per rendere il gioco più difficile, alla partenza alla lista si aggiungono dei nomi falsi (da 0 a 3, default 2, li sceglie l'host in lobby; default configurabile con `DEFAULT_DECOYS`). Ogni giocatore può scrivere un nome falso facoltativo nel profilo: il server ne estrae a caso quanti ne servono e, se non bastano, completa con l'elenco di riserva in `src/decoys.js`. Scarta i doppioni e i nomi uguali a un personaggio vero. I falsi vengono mescolati con gli altri e non vengono mai rivelati.

## Riconnessione

Alla creazione o all'ingresso il server restituisce un `token` segreto. Il client lo salva in `localStorage` e lo passa in `auth` ad ogni connessione. Il server riaggancia la sessione da solo ed emette `session:resumed`. Un giocatore disconnesso resta nella stanza per `DISCONNECT_GRACE_MS` (default 5 min, così un telefono in standby non perde la partita), poi viene rimosso. Se l'host cade, il ruolo passa a un altro giocatore connesso.

## Protocollo

Client → server. Ogni evento ha un ack con `{ ok: true, ... }` oppure `{ ok: false, error: { code, message } }`.

| Evento | Payload | Risposta |
|---|---|---|
| `room:create` | – | `{ roomCode, token, me, state }` |
| `room:join` | `{ code }` | `{ roomCode, token, me, state }` |
| `room:leave` | – | |
| `player:profile` | `{ nickname, character, decoy? }` (`decoy` = nome falso facoltativo) | `{ me }` |
| `room:decoys` | `{ count: 0..3 }` (solo host, in lobby) | |
| `player:ready` | `{ ready: boolean }` | |
| `game:reread` | `{ vote: boolean }` | |
| `game:reset` | – (solo host) | |
| `player:kick` | `{ playerId }` (solo host) | |

Server → client:

| Evento | Payload |
|---|---|
| `room:state` | `{ code, phase, hostId, players[{id, nickname, hasCharacter, ready, rereadVote, connected}], readyCount, rereadCount, charactersCount, decoyCount, maxDecoys, rereadRound, minPlayers, maxPlayers }` |
| `characters:show` | `{ reason: 'start' \| 'reread', round, characters: string[], countdownMs, durationMs }`: conto alla rovescia di `countdownMs`, poi lista visibile per `durationMs` |
| `session:resumed` | `{ roomCode, token, me, state }` |
| `session:invalid` / `session:replaced` | – |
| `room:removed` | `{ reason: 'kicked' \| 'timeout' \| 'expired' }` |

Codici di errore: `ROOM_NOT_FOUND`, `ROOM_FULL`, `GAME_IN_PROGRESS`, `NOT_IN_ROOM`, `NOT_PLAYING`, `PROFILE_INCOMPLETE`, `NICKNAME_TAKEN`, `NOT_HOST`, `PLAYER_NOT_FOUND`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL`.

HTTP: `GET /health`, `GET /rooms/:code` → `{ exists, joinable, phase, playerCount }`.

## Client Next.js

[`examples/useGameSocket.ts`](examples/useGameSocket.ts) è un hook React già pronto e tipizzato: copialo nel progetto Next.js (`npm i socket.io-client`) e usa `createRoom`, `joinRoom`, `setProfile`, `setReady`, `voteReread`. Quando `shown` è valorizzato, mostra la lista dei personaggi.
