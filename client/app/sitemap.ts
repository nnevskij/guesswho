import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/meta";
import { RULES } from "./regole/content";

/** Pagine da far trovare: la home, i giochi e le loro regole. Gli inviti (?code=) restano fuori. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...RULES.flatMap((r) => [
      { url: `${SITE_URL}/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.8 },
      { url: `${SITE_URL}/regole/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.9 },
    ]),
  ];
}
