import type { Metadata, Viewport } from "next";
import { Nunito, Unbounded } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: { default: "ACpicchia!", template: "%s · ACpicchia!" },
  description: "Giochi da fare insieme, ognuno con il suo telefono.",
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
