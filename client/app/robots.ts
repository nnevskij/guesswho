import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/meta";

/**
 * Tutto il sito è aperto a motori di ricerca, assistenti AI (GPTBot, ClaudeBot, PerplexityBot...)
 * e app che generano le anteprime dei link: niente da nascondere, e le immagini delle anteprime
 * devono restare raggiungibili (alcune app rispettano robots.txt anche per quelle).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
