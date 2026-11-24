import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { pageMetadata } from "../lib/meta";
import { rulesFor } from "../regole/content";

const rules = rulesFor("funnystories")!;

export const metadata: Metadata = pageMetadata({
  path: "/funnystories",
  title: rules.playTitle,
  description: rules.playDescription,
  shareTitle: "Funny Stories · Giochi Loschi",
  shareDescription: "Ti hanno invitato a Funny Stories: rispondi alla cieca, passa il foglio e ridi delle storie alla fine.",
});

// Suspense serve alla pagina per leggere ?code= dal link di invito.
export default function FunnyStoriesLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
