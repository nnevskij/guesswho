/**
 * Copertina di Impostore: carte con la parola segreta, una è scura e ha solo un punto di domanda.
 * Solo forme e costanti, così va bene anche nel catalogo (componente server).
 */
const CARDS = [
  { x: 16, y: 52, r: -14, d: 0, odd: false },
  { x: 39, y: 46, r: -4, d: 0.4, odd: false },
  { x: 62, y: 50, r: 6, d: 0.8, odd: true },
  { x: 85, y: 56, r: 15, d: 0.2, odd: false },
];
const DOTS = [
  { x: 5, y: 16, c: "#fcd95c" },
  { x: 30, y: 88, c: "#ffffff" },
  { x: 52, y: 12, c: "#4fd483" },
  { x: 95, y: 22, c: "#ffffff" },
];

export function CardsCover() {
  return (
    <div className="relative h-32 overflow-hidden" style={{ background: "#e5625a" }} aria-hidden="true">
      {DOTS.map((d, i) => (
        <span key={i} className="absolute size-2.5 rounded-full" style={{ left: `${d.x}%`, top: `${d.y}%`, background: d.c, opacity: 0.9 }} />
      ))}
      {CARDS.map((c, i) => (
        <span
          key={i}
          className="float font-display absolute flex h-[84px] w-[60px] flex-col items-center justify-center gap-1.5 rounded-[12px]"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            marginLeft: -30,
            marginTop: -42,
            background: c.odd ? "#1d1b22" : "#fff",
            boxShadow: `0 6px 0 ${c.odd ? "#000" : "#b94740"}`,
            animationDelay: `${c.d}s`,
            ["--r" as string]: `${c.r}deg`,
          }}
        >
          {c.odd ? (
            <span className="text-3xl font-black text-white">?</span>
          ) : (
            <>
              <span className="h-[6px] w-9 rounded-full" style={{ background: "#e5625a" }} />
              <span className="h-[5px] w-6 rounded-full" style={{ background: "#d9d6cd" }} />
            </>
          )}
        </span>
      ))}
    </div>
  );
}
