import { avatarColor } from "./Toy";

/** Illustrazione della home: gettoni-personaggio misteriosi che galleggiano su un campo blu, con coriandoli. */
const TOKENS = [
  { x: 12, y: 30, s: 64, r: -10, label: "?", c: 0, d: 0 },
  { x: 36, y: 56, s: 78, r: 6, label: "?", c: 2, d: 0.6 },
  { x: 60, y: 24, s: 70, r: -4, label: "?", c: 4, d: 1.1 },
  { x: 84, y: 54, s: 60, r: 12, label: "?", c: 5, d: 0.3 },
];
const CONFETTI = [
  { x: 6, y: 78, c: "#4fd483" },
  { x: 25, y: 14, c: "#fcd95c" },
  { x: 49, y: 10, c: "#e8691f" },
  { x: 72, y: 82, c: "#4fd483" },
  { x: 94, y: 18, c: "#ffffff" },
  { x: 54, y: 88, c: "#ffffff" },
];

export function MysteryField() {
  return (
    <div className="relative h-32 overflow-hidden bg-blue" aria-hidden="true">
      {CONFETTI.map((d, i) => (
        <span
          key={i}
          className="absolute size-2.5 rounded-full"
          style={{ left: `${d.x}%`, top: `${d.y}%`, background: d.c, opacity: 0.9 }}
        />
      ))}
      {TOKENS.map((t, i) => {
        const c = avatarColor(t.c);
        return (
          <span
            key={i}
            className="float font-display absolute flex items-center justify-center rounded-full font-black"
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.s,
              height: t.s,
              marginLeft: -t.s / 2,
              marginTop: -t.s / 2,
              fontSize: t.s * 0.48,
              background: c.face,
              color: c.ink,
              boxShadow: `0 ${Math.round(t.s / 12)}px 0 ${c.edge}`,
              animationDelay: `${t.d}s`,
              ["--r" as string]: `${t.r}deg`,
            }}
          >
            {t.label}
          </span>
        );
      })}
    </div>
  );
}
