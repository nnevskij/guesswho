import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { pageMetadata } from "../lib/meta";
import { rulesFor } from "../regole/content";

const rules = rulesFor("impostore")!;

export const metadata: Metadata = pageMetadata({
  path: "/impostore",
  title: rules.playTitle,
  description: rules.playDescription,
  shareTitle: "Impostore · Giochi Loschi",
  shareDescription: "Ti hanno invitato a Impostore: tutti hanno la stessa parola, tranne uno. Riuscirete a scoprirlo?",
});

// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function ImpostoreLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
