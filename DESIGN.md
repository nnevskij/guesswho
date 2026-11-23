# Design

## World
Un gioco da tavolo casual sul telefono: scatola di gettoni colorati, tasti morbidi e pastiglie dei punteggi.
- **Ingresso (connessione, home):** fondo viola pieno, wordmark minuscolo bianco, scheda bianca con cornice chiara e illustrazione di gettoni misteriosi.
- **Partita (lobby, in gioco):** fondo crema, scheda menta con il codice stanza, righe giocatore a due tinte, barra dei comandi che galleggia in basso.
- **Rivelazione:** conto alla rovescia su viola, lista dei personaggi su crema.

Ogni giocatore ha una coppia di colori (faccia + bordo scuro della stessa tinta) e un gettone con le iniziali in un colore sfalsato.

## Tokens (app/globals.css)
| Ruolo | Valore |
|---|---|
| cream (fondo partita) | `#f6f4ee`, cream-deep `#ebe7dc` (input, binari) |
| violet (fondo ingresso) | `#6a5ae0` |
| panel | `#ffffff` |
| ink / ink-soft | `#1d1b22` / `#5d5a66` |
| mint (scheda codice) | `#dfeae3`, bordo `#b9d7c8`, testo teal `#216656` |
| tasti (faccia / bordo) | giallo `#fcd95c`/`#d9ad2c`, verde `#4fd483`/`#2fa862`, blu `#3f4ff0`/`#2b37c2`, corallo `#e5625a`/`#b94740`, teal `#2f8a76`/`#216656` |
| colori giocatori | corallo, teal, verde, blu, giallo, viola, arancio, rosa (`PLAYER_COLORS` in `Toy.tsx`) |
| profondità tasto | 6px (lg), 5px (md), 4px (sm) |

Niente bordi neri: la profondità è sempre una tinta più scura dello stesso colore. Testo bianco sulle facce scure, ink su giallo e verde.

## Type
- **Unbounded (800/900):** titoli, codice stanza, etichette dei tasti (maiuscolo), nickname, personaggi, pastiglie.
- **Nunito (700/800):** testi, stati, input.

## Components
- **Tasto giocattolo (`.toy-btn`):** faccia piena, bordo 3D sotto della stessa tinta, filo di luce in alto. Scende alla pressione; i toggle attivi restano giù (`aria-pressed`). Disabilitato: grigio caldo.
- **Tasto morbido (`.soft-btn`):** pillola piatta e traslucida per azioni secondarie e icone; i tasti di conferma diventano corallo al primo tocco.
- **Riga giocatore:** a sinistra "P1" sul tono scuro, a destra gettone + nome + stato; pastiglie scure appese in basso a destra ("TU", "✓ PRONTO", "RILEGGI").
- **Pastiglia scura (`.pill-dark`):** testo bianco su nero all'82%.
- **Dock (`.dock`):** bianco traslucido con sfocatura e ombra morbida, raggio 32px.
- **Input (`.toy-input`):** campo crema senza bordo, bordo viola al focus.
- **Icone:** tratto 2.6 con estremità arrotondate (`app/components/Icon.tsx`), mai emoji.

## Motion
Tasti che scendono, righe e gettoni che entrano con un pop, gettoni della home che galleggiano, numeri del conto alla rovescia che rimbalzano, lista rivelata a cascata (70ms). Con `prefers-reduced-motion` resta solo il cambio di stato.
