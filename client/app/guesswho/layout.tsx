import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { pageMetadata } from "../lib/meta";
import { rulesFor } from "../regole/content";
import { GameProvider } from "./GameProvider";

const rules = rulesFor("guesswho")!;

export const metadata: Metadata = pageMetadata({
  path: "/guesswho",
  title: rules.playTitle,
  description: rules.playDescription,
  shareTitle: "Guess Who · Giochi Loschi",
  shareDescription: "Ti hanno invitato a Guess Who: scegli un personaggio segreto e indovina chi ha scelto cosa.",
});

// La connessione al server si apre solo dentro questo gioco, non nel catalogo.
// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function GuessWhoLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <Suspense>{children}</Suspense>
    </GameProvider>
  );
}
