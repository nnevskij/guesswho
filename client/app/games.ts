/**
 * Catalogo dei giochi. Per aggiungerne uno:
 * 1. crea la cartella app/<slug>/ con layout.tsx e page.tsx;
 * 2. aggiungi qui la sua voce (e, se vuoi, la copertina in app/page.tsx): la home lo mostra.
 */
export type Game = {
  slug: string;
  title: string;
  pitch: string;
  /** Solo etichette per la scheda del catalogo. */
  players: string;
  minutes: string;
};

export const GAMES: Game[] = [
  {
    slug: "guesswho",
    title: "Guess Who",
    pitch:
      "Ognuno scrive un personaggio segreto. La lista compare per 30 secondi, mescolata e con qualche nome falso: poi si indovina chi è chi.",
    players: "2–20 giocatori",
    minutes: "15–30 min",
  },
  {
    slug: "funnystories",
    title: "Funny Stories",
    pitch:
      "Il foglio piegato, sul telefono. Rispondi alla domanda senza vedere le righe degli altri e passa il foglio. Alla fine escono storie senza senso, da leggere ad alta voce.",
    players: "2–20 giocatori",
    minutes: "10–20 min",
  },
];
