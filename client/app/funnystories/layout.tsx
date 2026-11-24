import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Funny Stories",
  description: "Il foglio piegato sul telefono: rispondi, passa, e alla fine leggi storie senza senso.",
};

// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function FunnyStoriesLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
