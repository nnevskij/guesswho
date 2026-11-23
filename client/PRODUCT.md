# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Gruppi di amici seduti nella stessa stanza, ognuno con il proprio telefono in mano come controller. Giocano in presenza: il telefono serve a entrare nella stanza, scrivere un nickname e un personaggio, dirsi pronti e rivedere la lista dei personaggi quando serve. L'attenzione è sulle persone intorno, non sullo schermo.

## Product Purpose
Webapp realtime per una partita a indovinare personaggi. Un giocatore crea una stanza e gli altri entrano con il codice. Ognuno inserisce un nickname e un personaggio. Quando tutti premono "sono pronto" compare a tutti la lista mescolata dei personaggi, senza autori. Durante la partita chiunque può votare "voglio rileggere i nomi" e la lista ricompare solo quando l'hanno votato tutti.

## Positioning
Ogni passaggio collettivo (avvio, rilettura) scatta solo all'unanimità: il telefono è un tasto di voto, non uno schermo da leggere a lungo.

## Operating Context
- Uso quasi esclusivo da telefono, in verticale, con una mano, in una stanza illuminata.
- Backend Socket.IO su Railway (`../server`), stato in memoria, riconnessione automatica tramite token in localStorage.
- Hook client: `app/hooks/useGameSocket.ts`, condiviso tramite `app/GameProvider.tsx`.

## Capabilities and Constraints
- Fasi: `lobby` → `playing`. Codice stanza di 5 caratteri (alfabeto senza 0/O/1/I/L).
- Nickname massimo 24 caratteri, unico nella stanza. Personaggio massimo 60 caratteri.
- Minimo 2 giocatori (config server), massimo 20.
- Host: può espellere i giocatori e riportare la stanza in lobby.
- Lingua dell'interfaccia: italiano.

## Brand Commitments
- Titolo del gioco: "Guess Who" (scelto dall'utente; è un marchio Hasbro, quindi niente riferimenti visivi al gioco da tavolo).
- Bottone custom dell'utente come seme dello stile: tasto a blocco con base nera solida, che scende quando premuto.
- Stile arcade "tasti giocattolo", fondo chiaro e colori pieni, font pixel solo per titoli, codici e tasti.
- Feedback: animazioni vivaci, vibrazione e suoni 8-bit (disattivabili).

## Evidence on Hand
Nessuna immagine, logo o contenuto promozionale. Non inventare recensioni o numeri.

## Product Principles
1. Il pollice prima di tutto: le azioni stanno in basso, grandi, una principale per schermata.
2. Lo stato di tutti si legge a colpo d'occhio: chi c'è, chi è pronto, chi vuole rileggere.
3. Ogni tocco risponde subito: tasto, suono, vibrazione.
4. Il segreto resta segreto: la lista non mostra mai chi ha scritto cosa.
