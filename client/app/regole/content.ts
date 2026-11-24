/**
 * Regole dei giochi: il testo delle pagine /regole/<gioco>, delle loro FAQ (anche come dati strutturati)
 * e di /llms.txt. Scritte per chi gioca, ma pensate anche per motori di ricerca e assistenti AI:
 * frasi complete, numeri espliciti (giocatori, durata), nessun gergo interno.
 */
export type Rules = {
  slug: "guesswho" | "funnystories" | "impostore";
  name: string;
  /** Titolo della pagina delle regole (tag <title>). */
  seoTitle: string;
  /** Meta description: una o due frasi, sotto i 160 caratteri. */
  description: string;
  /** Titolo della pagina del gioco, per la scheda del browser e i risultati di ricerca. */
  playTitle: string;
  playDescription: string;
  /** Una frase che dice cos’è il gioco. */
  /** Mezza riga per i collegamenti tra giochi. */
  tagline: string;
  summary: string;
  players: { min: number; max: number };
  minutes: string;
  color: string;
  steps: string[];
  sections: { heading: string; paragraphs?: string[]; list?: string[] }[];
  tips: string[];
  faq: { q: string; a: string }[];
};

export const RULES: Rules[] = [
  {
    slug: "impostore",
    name: "Impostore",
    tagline: "Tutti hanno la stessa parola, tranne uno",
    seoTitle: "Regole del gioco dell'impostore: come si gioca",
    description:
      "Come si gioca a Impostore su Giochi Loschi: tutti hanno la stessa parola segreta tranne uno. Regole, modalità, punteggio e consigli.",
    playTitle: "Gioco dell'impostore online, con il telefono",
    playDescription:
      "Gioca a Impostore con gli amici: tutti hanno la stessa parola segreta tranne l'impostore. Indizi a voce, voto sul telefono. Gratis, senza app.",
    summary:
      "Impostore è un gioco di gruppo in cui tutti ricevono la stessa parola segreta tranne l'impostore, che deve bluffare per non farsi scoprire.",
    players: { min: 3, max: 20 },
    minutes: "circa 5 minuti a round",
    color: "#e5625a",
    steps: [
      "Chi organizza crea una stanza e detta il codice (o condivide il link). Gli altri entrano dal loro telefono e scelgono un nickname.",
      "A ogni round il telefono mostra a ognuno la sua parola segreta: si vede solo tenendo premuta la scheda, così chi è accanto non la legge. L'impostore riceve un'altra cosa (vedi le modalità).",
      "Il telefono indica chi inizia e l'ordine. A turno, ognuno dice ad alta voce un indizio collegato alla parola: abbastanza preciso da farsi riconoscere dagli altri, ma non così chiaro da rivelarla all'impostore.",
      "Quando gli indizi sono finiti, chi ha creato la stanza apre il voto. Ognuno vota sul telefono chi secondo lui è l'impostore, e può cambiare idea finché non hanno votato tutti.",
      "Il più votato viene accusato. Se è davvero l'impostore, vincono gli innocenti; se è un innocente, o c'è un pareggio, vince l'impostore. Poi si passa al round successivo, con parola e impostore nuovi.",
    ],
    sections: [
      {
        heading: "Le due modalità",
        list: [
          "Classica: l'impostore sa di esserlo e non conosce la parola. Ascolta gli indizi e cerca di confondersi. Se viene scoperto ha un'ultima possibilità: scrivere la parola segreta. Se indovina, vince lui.",
          "Parola simile: l'impostore riceve una parola vicina a quella degli altri (per esempio \"Mimo\" invece di \"Clown\") e non sa di essere l'impostore. Se ne accorge solo quando gli indizi degli altri non tornano.",
        ],
      },
      {
        heading: "Quanti impostori",
        paragraphs: [
          "Da 1 a 3, a scelta di chi crea la stanza, ma sempre con almeno due innocenti per ogni impostore: con 3 o 4 giocatori c'è un solo impostore, da 5 giocatori possono essere due, da 7 tre.",
        ],
      },
      {
        heading: "Le parole",
        paragraphs: [
          "Le parole vengono pescate da 8 categorie (cibo, animali, luoghi, oggetti, mestieri, sport e giochi, feste e occasioni, fantasia), circa 15 coppie ciascuna, senza ripetizioni finché non sono finite. Chi crea la stanza può scegliere le categorie oppure scrivere una parola sua per il round successivo: in quel round non potrà essere l'impostore, perché la parola la conosce già.",
        ],
      },
      {
        heading: "Il punteggio",
        list: [
          "Impostore scoperto: 1 punto a ogni innocente, più 1 punto a chi lo ha votato.",
          "Impostore scoperto che indovina la parola (modalità classica): 3 punti a ogni impostore.",
          "Accusato un innocente, o pareggio: 2 punti a ogni impostore.",
        ],
        paragraphs: ["La classifica resta da un round all'altro finché chi ha creato la stanza non chiude la partita."],
      },
    ],
    tips: [
      "Da innocente, scegli indizi che chi conosce la parola capisce al volo, ma che da soli non bastano a indovinarla.",
      "Da impostore nella modalità classica, ascolta i primi indizi prima di parlare e resta sul vago senza sembrare vago.",
      "Nella modalità parola simile nessuno può essere sicuro di sé: se gli indizi degli altri ti sembrano strani, forse l'impostore sei tu.",
    ],
    faq: [
      {
        q: "Quante persone servono per giocare a Impostore?",
        a: "Servono almeno 3 giocatori, fino a 20. Il gioco rende meglio da 4 a 10 persone. Ognuno usa il proprio telefono.",
      },
      {
        q: "Si può giocare all'impostore a distanza?",
        a: "Il gioco è pensato per stare nella stessa stanza, perché gli indizi si dicono a voce. A distanza funziona se siete in videochiamata: le parole e il voto restano sul telefono di ognuno.",
      },
      {
        q: "Che differenza c'è tra la modalità classica e la parola simile?",
        a: "Nella classica l'impostore sa di esserlo e non ha la parola. Nella parola simile riceve una parola vicina a quella degli altri e non sa di essere l'impostore.",
      },
      {
        q: "Bisogna scaricare un'app o registrarsi?",
        a: "No. Si gioca dal browser del telefono, basta un nickname. È gratis.",
      },
    ],
  },
  {
    slug: "funnystories",
    name: "Funny Stories",
    tagline: "Il foglio piegato, sul telefono",
    seoTitle: "Regole di Funny Stories: il gioco del foglio piegato",
    description:
      "Come si gioca a Funny Stories su Giochi Loschi: il gioco del foglio piegato sul telefono. Si risponde alla cieca e nascono storie assurde.",
    playTitle: "Funny Stories: il gioco del foglio piegato online",
    playDescription:
      "Gioca al foglio piegato con il telefono: rispondi alla domanda senza vedere le righe degli altri, passa il foglio e leggete storie assurde. Gratis, senza app.",
    summary:
      "Funny Stories è la versione per telefono del gioco del foglio piegato: ogni giocatore aggiunge una riga a una storia senza vedere cosa hanno scritto gli altri.",
    players: { min: 2, max: 20 },
    minutes: "10–20 minuti",
    color: "#e8691f",
    steps: [
      "Chi organizza crea una stanza e detta il codice (o condivide il link). Gli altri entrano dal loro telefono e scelgono un nickname.",
      "Chi ha creato la stanza sceglie le domande che formano la storia, partendo da un modello (\"La coppia\", \"Notizia del TG\", \"Il colloquio\") e cambiandole come vuole: da 2 a 12 domande, per esempio \"Lui è:\", \"Lei è:\", \"Si incontrano:\", \"Alla fine:\".",
      "Ognuno parte con un foglio. A ogni turno tutti rispondono alla stessa domanda, sul foglio che hanno in mano, senza vedere le righe già scritte: la parte sopra del foglio è \"piegata\".",
      "Quando hanno risposto tutti, ogni foglio passa al giocatore successivo e si passa alla domanda dopo. Così su ogni foglio ogni riga la scrive una persona diversa.",
      "Alla fine solo chi ha creato la stanza vede le storie complete e le legge ad alta voce, una alla volta; sugli altri telefoni compare a quale storia si è arrivati.",
    ],
    sections: [
      {
        heading: "Le domande",
        paragraphs: [
          "Le domande sono uguali per tutti i fogli e si possono riscrivere, spostare, togliere o aggiungere prima di iniziare. Più sono concrete, più le storie vengono assurde: \"Lui le dice:\" funziona meglio di \"Cosa succede:\".",
        ],
      },
      {
        heading: "Se qualcuno si disconnette",
        paragraphs: [
          "Se un telefono va in standby durante la partita, chi ha creato la stanza può saltare il suo turno: quella riga resta vuota. Chi esce del tutto lascia il suo posto vuoto e non blocca gli altri.",
        ],
      },
    ],
    tips: [
      "Rispondi con la prima cosa che ti viene in mente: le storie migliori nascono dalle risposte più concrete.",
      "Chi legge può fare le voci: le storie rendono molto di più recitate.",
      "Con tanti giocatori, scegli meno domande: ogni foglio resta comunque scritto da persone diverse.",
    ],
    faq: [
      {
        q: "Quante persone servono per Funny Stories?",
        a: "Da 2 a 20 giocatori, ognuno con il suo telefono. Il gioco rende meglio da 4 persone in su.",
      },
      {
        q: "È come il cadavere squisito?",
        a: "Sì, è lo stesso principio del foglio piegato (o cadavere squisito): ognuno scrive una parte senza vedere le altre, e solo alla fine si legge il risultato.",
      },
      {
        q: "Chi legge le storie?",
        a: "Solo chi ha creato la stanza riceve le storie complete e le legge ad alta voce. Gli altri vedono a che punto è la lettura.",
      },
      {
        q: "Bisogna scaricare un'app o registrarsi?",
        a: "No. Si gioca dal browser del telefono, basta un nickname. È gratis.",
      },
    ],
  },
  {
    slug: "guesswho",
    name: "Guess Who",
    tagline: "Personaggi segreti da riconoscere",
    seoTitle: "Regole di Guess Who: il gioco dei personaggi segreti",
    description:
      "Come si gioca a Guess Who su Giochi Loschi: ognuno sceglie un personaggio segreto, la lista compare mescolata per 30 secondi, poi si indovina chi è chi.",
    playTitle: "Guess Who online: il gioco dei personaggi segreti",
    playDescription:
      "Gioca a Guess Who con gli amici: ognuno sceglie un personaggio segreto, la lista compare mescolata e con nomi falsi, poi indovinate chi è chi. Gratis, senza app.",
    summary:
      "Guess Who è un gioco di memoria e deduzione: ognuno sceglie un personaggio segreto, la lista di tutti i personaggi compare per pochi secondi e poi si cerca di capire chi ha scelto quale.",
    players: { min: 2, max: 20 },
    minutes: "15–30 minuti",
    color: "#6a5ae0",
    steps: [
      "Chi organizza crea una stanza e detta il codice (o condivide il link). Gli altri entrano dal loro telefono.",
      "Ognuno scrive un nickname e un personaggio segreto, reale o inventato. Si può aggiungere anche un nome falso, per confondere le idee. Due giocatori non possono scegliere lo stesso personaggio.",
      "Quando tutti hanno premuto \"Sono pronto\", parte un conto alla rovescia di 5 secondi e su tutti i telefoni compare la lista dei personaggi: mescolata, senza autori e con qualche nome falso. Resta visibile per 30 secondi, poi si chiude.",
      "Da qui si gioca a voce: bisogna ricordare i nomi della lista e capire chi ha scelto quale personaggio.",
      "Se serve, la lista si può rileggere: ricompare solo se tutti premono \"Rileggi i nomi\".",
    ],
    sections: [
      {
        heading: "I nomi falsi",
        paragraphs: [
          "Chi crea la stanza sceglie quanti nomi falsi aggiungere alla lista, da 0 a 3. Vengono presi prima tra quelli proposti dai giocatori e, se non bastano, da un elenco di personaggi famosi. Non vengono mai rivelati: nessuno, nemmeno il gioco, sa più quali sono una volta mescolati.",
        ],
      },
    ],
    tips: [
      "Scegli un personaggio che tutti conoscono ma che nessuno si aspetta da te.",
      "Durante i 30 secondi, non provare a ricordare tutto: concentrati sui nomi che non riconosci.",
      "Un buon nome falso assomiglia a un personaggio vero che qualcuno del gruppo potrebbe aver scelto.",
    ],
    faq: [
      {
        q: "Quante persone servono per Guess Who?",
        a: "Da 2 a 20 giocatori, ognuno con il suo telefono. Più si è, più la lista è lunga e più il gioco è difficile.",
      },
      {
        q: "Per quanto tempo si vede la lista dei personaggi?",
        a: "Per 30 secondi, dopo un conto alla rovescia di 5 secondi. Si può rileggere solo se tutti sono d'accordo.",
      },
      {
        q: "Due persone possono scegliere lo stesso personaggio?",
        a: "No: se un personaggio è già stato scelto, il gioco chiede di sceglierne un altro, senza dire chi l'ha preso.",
      },
      {
        q: "Bisogna scaricare un'app o registrarsi?",
        a: "No. Si gioca dal browser del telefono, basta un nickname. È gratis.",
      },
    ],
  },
];

export const rulesFor = (slug: string) => RULES.find((r) => r.slug === slug);

/** Domande frequenti sul sito, in home (anche come dati strutturati) e in /llms.txt. */
export const SITE_FAQ: { q: string; a: string }[] = [
  {
    q: "Cos'è Giochi Loschi?",
    a: "Giochi Loschi è una raccolta di giochi di gruppo da fare nella stessa stanza, ognuno con il suo telefono: Impostore, Funny Stories e Guess Who. Il telefono tiene i segreti, il resto si fa parlando.",
  },
  {
    q: "È gratis? Serve un'app o un account?",
    a: "È gratis e si gioca dal browser, senza scaricare app e senza registrarsi: basta scegliere un nickname.",
  },
  {
    q: "Come si inizia una partita?",
    a: "Una persona crea la stanza e riceve un codice di 5 caratteri. Gli altri lo scrivono sul loro telefono, oppure aprono il link d'invito, ed entrano nella stessa stanza.",
  },
  {
    q: "Funziona su iPhone e Android?",
    a: "Sì, su qualunque telefono con un browser aggiornato (Safari, Chrome e simili). Funziona anche da computer.",
  },
  {
    q: "Si può giocare a distanza?",
    a: "I giochi sono pensati per stare nella stessa stanza, perché molte cose si dicono a voce. A distanza funzionano se siete anche in videochiamata.",
  },
];
