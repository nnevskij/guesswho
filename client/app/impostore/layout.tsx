import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { shareMetadata } from "../lib/meta";

export const metadata: Metadata = {
  title: "Impostore",
  description: "Tutti hanno la stessa parola segreta, tranne l'impostore. Indizi a voce, voto sul telefono.",
  ...shareMetadata("Impostore · ACpicchia!", "Ti hanno invitato a Impostore: tutti hanno la stessa parola, tranne uno. Riuscirete a scoprirlo?"),
};

// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function ImpostoreLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
