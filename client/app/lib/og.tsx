import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { PAGE_COLORS } from "./colors";

/**
 * Copertine che compaiono quando si condivide un link (WhatsApp, Telegram, iMessage...).
 * Le usano i file opengraph-image.tsx della home e dei giochi: 1200×630, PNG.
 * Satori (dietro ImageResponse) capisce solo flexbox e un sottoinsieme di CSS: niente grid né classi.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#1d1b22";
const TOKENS = [
  { face: "#4fd483", edge: "#2fa862", ink: INK },
  { face: "#3f4ff0", edge: "#2b37c2", ink: "#fff" },
  { face: "#fcd95c", edge: "#d9ad2c", ink: INK },
  { face: "#e0589a", edge: "#b33c77", ink: "#fff" },
];

/**
 * I font del sito (Unbounded per i titoli, Nunito per i testi) presi da Google Fonts in TTF
 * (Satori non legge woff2) e solo con i caratteri usati. Se la rete non risponde si usa il font di default di next/og.
 */
async function googleFont(family: string, weight: 700 | 900, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return [];
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return [{ name: family, data, weight, style: "normal" as const }];
  } catch {
    return [];
  }
}

export async function ogImage({
  background,
  eyebrow,
  title,
  subtitle,
  art,
}: {
  background: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  art: ReactNode;
}) {
  const [display, body] = await Promise.all([
    googleFont("Unbounded", 900, `${eyebrow}${title}?`),
    googleFont("Nunito", 700, subtitle),
  ]);
  const fonts = [...display, ...body];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background, fontFamily: "Unbounded" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 640 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.22)",
              color: "#fff",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", marginTop: 28, color: "#fff", fontSize: 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 26, color: "rgba(255,255,255,0.9)", fontSize: 34, lineHeight: 1.3, fontFamily: "Nunito", fontWeight: 700 }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, position: "relative" }}>{art}</div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** Gettoni "?" che galleggiano, come l'illustrazione di Guess Who. */
export function TokensArt() {
  const spots = [
    { x: 40, y: 70, s: 190, r: -10 },
    { x: 250, y: 150, s: 230, r: 6 },
    { x: 70, y: 330, s: 170, r: 12 },
    { x: 300, y: 400, s: 150, r: -8 },
  ];
  return (
    <>
      {spots.map((p, i) => {
        const c = TOKENS[i % TOKENS.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.s,
              height: p.s,
              borderRadius: 999,
              background: c.face,
              color: c.ink,
              boxShadow: `0 ${Math.round(p.s / 12)}px 0 ${c.edge}`,
              transform: `rotate(${p.r}deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: p.s * 0.5,
              fontWeight: 900,
            }}
          >
            ?
          </div>
        );
      })}
    </>
  );
}

/** Fogli a righe con la piega in alto, come l'illustrazione di Funny Stories. */
export function SheetsArt() {
  const sheets = [
    { x: 30, y: 120, r: -12, lines: 3 },
    { x: 190, y: 70, r: 4, lines: 4 },
    { x: 340, y: 150, r: 13, lines: 2 },
  ];
  return (
    <>
      {sheets.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: 190,
            height: 300,
            borderRadius: 26,
            background: "#fff",
            boxShadow: "0 14px 0 #b84f12",
            transform: `rotate(${s.r}deg)`,
            display: "flex",
            flexDirection: "column",
            padding: "70px 26px 0",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: 190, height: 46, borderRadius: "26px 26px 0 0", background: "#ebe7dc" }} />
          {Array.from({ length: s.lines }, (_, j) => (
            <div
              key={j}
              style={{
                height: 14,
                marginBottom: 20,
                borderRadius: 999,
                width: `${92 - j * 18}%`,
                background: j === s.lines - 1 ? "#e5625a" : "#d9d6cd",
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/** Per la home: un gettone e un foglio, cioè i due giochi del catalogo. */
export function CatalogueArt() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 110,
          width: 230,
          height: 230,
          borderRadius: 999,
          background: TOKENS[0].face,
          color: INK,
          boxShadow: `0 18px 0 ${TOKENS[0].edge}`,
          transform: "rotate(-10deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontWeight: 900,
        }}
      >
        ?
      </div>
      <div
        style={{
          position: "absolute",
          left: 300,
          top: 230,
          width: 200,
          height: 290,
          borderRadius: 26,
          background: "#fff",
          boxShadow: `0 14px 0 ${PAGE_COLORS.orange}`,
          transform: "rotate(10deg)",
          display: "flex",
          flexDirection: "column",
          padding: "70px 28px 0",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 200, height: 46, borderRadius: "26px 26px 0 0", background: "#ebe7dc" }} />
        {[92, 74, 56].map((w, j) => (
          <div key={j} style={{ height: 14, marginBottom: 20, borderRadius: 999, width: `${w}%`, background: j === 2 ? "#e5625a" : "#d9d6cd" }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 40, top: 430, width: 26, height: 26, borderRadius: 999, background: "#fcd95c" }} />
      <div style={{ position: "absolute", left: 420, top: 90, width: 22, height: 22, borderRadius: 999, background: "#fff" }} />
    </>
  );
}
