import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { shareMetadata } from "../lib/meta";

export const metadata: Metadata = {
  title: "Funny Stories",
  description: "Il foglio piegato sul telefono: rispondi, passa, e alla fine leggi storie senza senso.",
  ...shareMetadata("Funny Stories · Giochi Loschi", "Ti hanno invitato a Funny Stories: rispondi alla cieca, passa il foglio e ridi delle storie alla fine."),
};

// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function FunnyStoriesLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
