import { SITE_NAME, SITE_URL } from "../lib/meta";
import { RULES, SITE_FAQ } from "../regole/content";

/**
 * /llms.txt: il sito in breve, in Markdown, per assistenti AI e motori generativi
 * (convenzione proposta su llmstxt.org). Generato dagli stessi testi delle pagine delle regole.
 */
export function GET() {
  const games = RULES.map(
    (r) =>
      `- [${r.name}](${SITE_URL}/${r.slug}): ${r.summary} ${r.players.min}–${r.players.max} giocatori, ${r.minutes}. Regole: ${SITE_URL}/regole/${r.slug}`,
  ).join("\n");

  const rules = RULES.map((r) =>
    [
      `## ${r.name}`,
      "",
      r.summary,
      "",
      ...r.steps.map((s, i) => `${i + 1}. ${s}`),
      "",
      ...r.sections.flatMap((s) => [`### ${s.heading}`, "", ...(s.list ?? []).map((l) => `- ${l}`), ...(s.paragraphs ?? []), ""]),
    ].join("\n"),
  ).join("\n");

  const faq = SITE_FAQ.map((f) => `- **${f.q}** ${f.a}`).join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_NAME} (${SITE_URL}) è una raccolta di giochi di gruppo da fare nella stessa stanza, ognuno con il proprio telefono. Si gioca gratis dal browser, senza app e senza registrazione: una persona crea una stanza e gli altri entrano con un codice di 5 caratteri o con il link d'invito. Lingua: italiano.

## Giochi

${games}

## Domande frequenti

${faq}

${rules}`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
