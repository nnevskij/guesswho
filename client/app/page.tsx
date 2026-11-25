import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "./components/button";
import { Icon } from "./components/Icon";
import { Mascot } from "./components/Mascot";
import { MysteryField } from "./components/MysteryField";
import { MuteButton } from "./components/Toy";
import { SheetsCover } from "./funnystories/SheetsCover";
import { CardsCover } from "./impostore/CardsCover";
import { GAMES } from "./games";
import { PAGE_COLORS } from "./lib/colors";
import { PageColor } from "./lib/pageColor";
import { SITE_NAME, SITE_URL, jsonLd } from "./lib/meta";
import { RULES, SITE_FAQ } from "./regole/content";
import Credits from "./components/Credits";

/** Copertina di ogni gioco nel catalogo. */
const COVERS: Record<string, ReactNode> = {
  guesswho: <MysteryField />,
  funnystories: <SheetsCover />,
  impostore: <CardsCover />,
};

/** Dati strutturati della home: il sito, i suoi giochi e le domande frequenti. */
const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#sito`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "it",
      description: "Giochi di gruppo da fare nella stessa stanza, ognuno con il suo telefono. Gratis, dal browser, senza app né registrazione.",
    },
    {
      "@type": "ItemList",
      name: "Giochi",
      itemListElement: RULES.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": ["Game", "WebApplication"],
          "@id": `${SITE_URL}/${r.slug}#gioco`,
          name: r.name,
          description: r.summary,
          url: `${SITE_URL}/${r.slug}`,
          applicationCategory: "GameApplication",
          isAccessibleForFree: true,
          numberOfPlayers: { "@type": "QuantitativeValue", minValue: r.players.min, maxValue: r.players.max },
        },
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: SITE_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function Catalogue() {
  return (
    <div className="min-h-dvh bg-violet">
      <PageColor color={PAGE_COLORS.violet} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(STRUCTURED)} />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex h-14 items-center justify-between">
          {/* Sotto i 400px il titolo si stringe, così non tocca il tasto dei suoni sui telefoni da 360px */}
          <h1 className="font-display flex items-center gap-2 text-[1.5rem] font-black tracking-tight text-white min-[400px]:gap-2.5 min-[400px]:text-[1.75rem]">
            <Mascot size={36} />
            Giochi Loschi
          </h1>
          <MuteButton on="violet" />
        </header>

        <p className="text-lg font-bold leading-snug text-white/85">
          Giochi da fare nella stessa stanza, ognuno con il suo telefono. Scegline uno e apri una stanza.
        </p>

        <ul className="flex flex-col gap-5">
          {GAMES.map((game) => (
            <li key={game.slug} className="rounded-[36px] bg-white/25 p-2">
              <article className="card overflow-hidden rounded-[30px]!">
                <Link href={`/${game.slug}`} tabIndex={-1} aria-hidden="true" className="block">
                  {COVERS[game.slug]}
                </Link>
                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <h2 className="font-display text-[1.6rem] font-extrabold leading-tight">{game.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="pill-dark px-3 py-1 text-sm">{game.players}</span>
                      <span className="pill-dark px-3 py-1 text-sm">{game.minutes}</span>
                    </div>
                    <p className="mt-3 text-base font-bold text-ink-soft">{game.pitch}</p>
                  </div>
                  <ButtonLink href={`/${game.slug}`} tone="yellow">
                    Gioca
                    <Icon name="arrow" size={24} strokeWidth={3.2} />
                  </ButtonLink>
                  <Link href={`/regole/${game.slug}`} className="soft-btn self-center text-base">
                    Come si gioca a {game.title}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="rounded-[26px] border-[3px] border-dashed border-white/70 bg-white/15 px-5 py-4 text-white">
          <p className="font-display text-lg font-extrabold">Altri giochi in arrivo</p>
          <p className="mt-1 text-base font-bold text-white/85">Il prossimo comparirà qui.</p>
        </div>

        <section aria-labelledby="faq" className="flex flex-col gap-3 pt-3 text-white">
          <h2 id="faq" className="font-display px-1 text-xl font-extrabold">
            Domande frequenti
          </h2>
          {SITE_FAQ.map((f) => (
            <div key={f.q} className="rounded-3xl bg-white/15 px-5 py-4">
              <h3 className="font-display text-base font-extrabold">{f.q}</h3>
              <p className="mt-1 text-base font-bold leading-snug text-white/85">{f.a}</p>
            </div>
          ))}
        </section>
        <Credits />
      </div>
    </div>
  );
}
