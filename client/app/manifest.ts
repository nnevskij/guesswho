import type { MetadataRoute } from "next";
import { PAGE_COLORS } from "./lib/colors";

/** Manifest dell'app: nome e icona quando il sito viene aggiunto alla schermata Home. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Giochi Loschi",
    short_name: "Giochi Loschi",
    description: "Giochi di gruppo da fare nella stessa stanza, ognuno con il suo telefono.",
    start_url: "/",
    display: "standalone",
    background_color: PAGE_COLORS.violet,
    theme_color: PAGE_COLORS.violet,
    lang: "it",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
