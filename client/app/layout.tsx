import type { Metadata, Viewport } from "next";
import { Nunito, Unbounded } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, pageMetadata } from "./lib/meta";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const HOME_DESCRIPTION =
  "Giochi di gruppo da fare nella stessa stanza, ognuno con il suo telefono: Impostore, Funny Stories e Guess Who. Gratis, dal browser, senza app né registrazione.";

export const metadata: Metadata = {
  ...pageMetadata({
    path: "/",
    title: "Giochi Loschi",
    description: HOME_DESCRIPTION,
    shareDescription: "Giochi da fare nella stessa stanza, ognuno con il suo telefono.",
  }),
  // Dominio pubblico: gli indirizzi assoluti (canonici, anteprime dei link) partono da qui.
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "Giochi Loschi · Giochi di gruppo da fare con il telefono", template: "%s · Giochi Loschi" },
  keywords: [
    "giochi di gruppo",
    "giochi da fare in compagnia",
    "giochi per feste",
    "gioco dell'impostore",
    "foglio piegato",
    "giochi con il telefono",
    "party game",
  ],
  category: "games",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Niente themeColor qui: Next riscriverebbe il meta a ogni navigazione.
  // Lo gestisce ogni pagina con usePageColor (lib/pageColor.ts).
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${nunito.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        {children}
        {/* Campionatori invisibili da cui Safari 26 su iPhone prende il colore delle barre (vedi lib/pageColor.ts) */}
        <div className="chrome-sample chrome-sample-top" aria-hidden="true" />
        <div className="chrome-sample chrome-sample-bottom" aria-hidden="true" />
      </body>
    </html>
  );
}
