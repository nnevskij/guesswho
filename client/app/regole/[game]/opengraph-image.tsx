import type { ReactNode } from "react";
import { CardsArt, OG_SIZE, SheetsArt, TokensArt, ogImage } from "../../lib/og";
import { RULES, rulesFor } from "../content";

export const alt = "Regole del gioco su Giochi Loschi";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return RULES.map((r) => ({ game: r.slug }));
}

const ART: Record<string, ReactNode> = {
  impostore: <CardsArt />,
  funnystories: <SheetsArt />,
  guesswho: <TokensArt />,
};

/** Anteprima delle pagine delle regole: la copertina del gioco, con "Regole" in alto. */
export default async function Image({ params }: { params: Promise<{ game: string }> }) {
  const rules = rulesFor((await params).game) ?? RULES[0];
  return ogImage({
    background: rules.color,
    eyebrow: "Regole · Giochi Loschi",
    title: rules.name,
    subtitle: `Come si gioca, in breve. ${rules.players.min}–${rules.players.max} giocatori, un telefono a testa.`,
    art: ART[rules.slug],
  });
}
