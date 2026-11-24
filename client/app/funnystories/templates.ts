/** Sequenze di domande pronte: l'host ne sceglie una e poi la modifica come vuole. */
export const TEMPLATES: { id: string; name: string; questions: string[] }[] = [
  {
    id: "coppia",
    name: "La coppia",
    questions: ["Lui è:", "Lei è:", "Si incontrano:", "Lui le dice:", "Lei gli risponde:", "Insieme fanno:", "La gente dice:", "Alla fine:"],
  },
  {
    id: "tg",
    name: "Notizia del TG",
    questions: ["Chi:", "Ha fatto:", "Dove:", "Quando:", "Perché:", "Un testimone dice:", "Il sindaco commenta:", "Conseguenze:"],
  },
  {
    id: "colloquio",
    name: "Il colloquio",
    questions: [
      "Il candidato è:",
      "Si presenta con:",
      "Il capo gli chiede:",
      "Lui risponde:",
      "Il suo pregio:",
      "Il suo difetto:",
      "Il capo decide:",
      "Il primo giorno:",
    ],
  },
];
