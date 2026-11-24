import type { Metadata } from "next";

/**
 * Anteprima dei link condivisi (WhatsApp, Telegram, iMessage...). L'immagine arriva dal file
 * opengraph-image.tsx della stessa cartella; qui titolo e testo.
 * Next non unisce i campi openGraph tra layout padre e figlio (il figlio li sostituisce tutti),
 * quindi ogni pagina li passa interi da qui.
 * L'URL assoluto dell'immagine parte da SITE_URL (metadataBase in layout.tsx).
 */
export const SITE_URL = "https://giochiloschi.com";

export function shareMetadata(title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, siteName: "Giochi Loschi", locale: "it_IT", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
