import type { Metadata } from "next";

/** Dominio pubblico: base degli indirizzi assoluti (canonici, anteprime, sitemap, dati strutturati). */
export const SITE_URL = "https://giochiloschi.com";
export const SITE_NAME = "Giochi Loschi";

/**
 * Metadati di una pagina: titolo e descrizione per i risultati di ricerca, indirizzo canonico
 * (così i link d'invito con ?code= non diventano pagine doppie) e anteprima dei link condivisi.
 * L'immagine dell'anteprima arriva dal file opengraph-image.tsx della stessa cartella.
 * Next non unisce i campi openGraph tra layout padre e figlio (il figlio li sostituisce tutti),
 * quindi ogni pagina li passa interi da qui.
 */
export function pageMetadata({
  path,
  title,
  description,
  shareTitle = title,
  shareDescription = description,
}: {
  path: string;
  title: string;
  description: string;
  /** Titolo dell'anteprima del link, se diverso da quello per la ricerca. */
  shareTitle?: string;
  shareDescription?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      url: path,
      siteName: SITE_NAME,
      locale: "it_IT",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription },
  };
}

/**
 * Dati strutturati (schema.org, JSON-LD). `<` diventa < perché il contenuto vive in un <script>.
 * Li leggono motori di ricerca e assistenti AI per capire cosa c'è nella pagina.
 */
export const jsonLd = (data: object) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
