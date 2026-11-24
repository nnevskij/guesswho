import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "../../components/button";
import { Icon } from "../../components/Icon";
import { Mascot } from "../../components/Mascot";
import { PAGE_COLORS } from "../../lib/colors";
import { PageColor } from "../../lib/pageColor";
import { SITE_NAME, SITE_URL, jsonLd, pageMetadata } from "../../lib/meta";
import { RULES, rulesFor } from "../content";

/**
 * Regole di un gioco: la pagina con il testo vero che le pagine di gioco non hanno
 * (lì il gioco parte nel browser, e un crawler vede solo "Connessione…").
 * Tutto statico, generato in build per ogni gioco; un gioco sconosciuto dà 404 (notFound).
 */
export function generateStaticParams() {
  return RULES.map((r) => ({ game: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const rules = rulesFor((await params).game);
  if (!rules) return {};
  return pageMetadata({ path: `/regole/${rules.slug}`, title: rules.seoTitle, description: rules.description });
}

export default async function RulesPage({ params }: { params: Promise<{ game: string }> }) {
  const rules = rulesFor((await params).game);
  if (!rules) notFound();
  const others = RULES.filter((r) => r.slug !== rules.slug);
  const playUrl = `${SITE_URL}/${rules.slug}`;
  const pageUrl = `${SITE_URL}/regole/${rules.slug}`;

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Game", "WebApplication"],
        "@id": `${playUrl}#gioco`,
        name: rules.name,
        description: rules.summary,
        url: playUrl,
        inLanguage: "it",
        applicationCategory: "GameApplication",
        operatingSystem: "Qualsiasi browser (iPhone, Android, computer)",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        numberOfPlayers: { "@type": "QuantitativeValue", minValue: rules.players.min, maxValue: rules.players.max },
        isPartOf: { "@id": `${SITE_URL}/#sito` },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: rules.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `Regole di ${rules.name}`, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-cream">
      <PageColor color={PAGE_COLORS.cream} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav aria-label="Percorso" className="flex h-14 items-center">
          <Link href="/" className="font-display -ml-1 flex items-center gap-2 rounded-2xl pr-2 text-lg font-black text-ink">
            <Icon name="back" size={22} strokeWidth={3.2} className="opacity-70" />
            <Mascot size={28} />
            {SITE_NAME}
          </Link>
        </nav>

        <header className="flex flex-col gap-4 rounded-[30px] px-6 py-7 text-white" style={{ background: rules.color, boxShadow: `0 7px 0 color-mix(in oklab, ${rules.color} 72%, black)` }}>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-white/80">Regole</p>
          <h1 className="font-display text-[2.2rem] font-black leading-[1.05]">Come si gioca a {rules.name}</h1>
          <p className="text-lg font-bold leading-snug text-white/95">{rules.summary}</p>
          <ul className="flex flex-wrap gap-2" aria-label="In breve">
            <li className="pill-dark px-3 py-1.5 text-sm">
              {rules.players.min}–{rules.players.max} giocatori
            </li>
            <li className="pill-dark px-3 py-1.5 text-sm">{rules.minutes}</li>
            <li className="pill-dark px-3 py-1.5 text-sm">un telefono a testa</li>
          </ul>
          <ButtonLink href={`/${rules.slug}`} tone="yellow" className="mt-1">
            Gioca a {rules.name}
            <Icon name="arrow" size={24} strokeWidth={3.2} />
          </ButtonLink>
        </header>

        <article className="flex flex-col gap-6 text-[1.0625rem] leading-relaxed">
          <section className="card flex flex-col gap-4 p-6">
            <h2 className="font-display text-2xl font-extrabold">Come si gioca</h2>
            <ol className="flex flex-col gap-4">
              {rules.steps.map((s, i) => (
                <li key={i} className="flex gap-3.5">
                  <span
                    className="font-display flex size-9 shrink-0 items-center justify-center rounded-full text-base font-black text-white"
                    style={{ background: rules.color }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <p className="pt-1 font-semibold">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          {rules.sections.map((sec) => (
            <section key={sec.heading} className="card flex flex-col gap-3 p-6">
              <h2 className="font-display text-xl font-extrabold">{sec.heading}</h2>
              {sec.list && (
                <ul className="flex list-disc flex-col gap-2 pl-5 font-semibold marker:text-ink-soft">
                  {sec.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {sec.paragraphs?.map((p) => (
                <p key={p} className="font-semibold">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <section className="card flex flex-col gap-3 p-6">
            <h2 className="font-display text-xl font-extrabold">Consigli</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 font-semibold marker:text-ink-soft">
              {rules.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="faq">
            <h2 id="faq" className="font-display px-1 text-xl font-extrabold">
              Domande frequenti
            </h2>
            {rules.faq.map((f) => (
              <div key={f.q} className="card flex flex-col gap-1.5 p-5">
                <h3 className="font-display text-base font-extrabold">{f.q}</h3>
                <p className="font-semibold text-ink-soft">{f.a}</p>
              </div>
            ))}
          </section>
        </article>

        <ButtonLink href={`/${rules.slug}`} tone="yellow">
          Gioca a {rules.name}
          <Icon name="arrow" size={24} strokeWidth={3.2} />
        </ButtonLink>

        <nav aria-label="Altri giochi" className="flex flex-col gap-2 pt-2">
          <h2 className="font-display px-1 text-lg font-extrabold">Altri giochi</h2>
          <ul className="flex flex-col gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/regole/${o.slug}`} className="card flex items-center justify-between gap-3 !rounded-[22px] px-5 py-4 font-bold">
                  <span>
                    <span className="font-display block text-base font-extrabold">{o.name}</span>
                    <span className="block text-sm text-ink-soft">{o.tagline}</span>
                  </span>
                  <Icon name="next" size={22} strokeWidth={3} className="text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
