import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { GameProvider } from "./GameProvider";

export const metadata: Metadata = {
  title: "Guess Who",
  description: "Entra nella stanza, scegli un personaggio, premi pronto.",
};

// La connessione al server si apre solo dentro questo gioco, non nel catalogo.
// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function GuessWhoLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <Suspense>{children}</Suspense>
    </GameProvider>
  );
}
