/**
 * Copertina di Funny Stories: fogli a righe piegati che passano di mano, su campo arancio.
 * Solo forme e costanti, così va bene anche nel catalogo (componente server).
 */
const SHEETS = [
  { x: 20, y: 54, r: -12, d: 0, lines: 3 },
  { x: 50, y: 48, r: 4, d: 0.5, lines: 4 },
  { x: 80, y: 56, r: 13, d: 1, lines: 2 },
];
const DOTS = [
  { x: 6, y: 20, c: "#fcd95c" },
  { x: 36, y: 12, c: "#ffffff" },
  { x: 64, y: 86, c: "#4fd483" },
  { x: 93, y: 16, c: "#fcd95c" },
  { x: 8, y: 86, c: "#ffffff" },
];

export function SheetsCover() {
  return (
    <div className="relative h-32 overflow-hidden" style={{ background: "#e8691f" }} aria-hidden="true">
      {DOTS.map((d, i) => (
        <span key={i} className="absolute size-2.5 rounded-full" style={{ left: `${d.x}%`, top: `${d.y}%`, background: d.c, opacity: 0.9 }} />
      ))}
      {SHEETS.map((s, i) => (
        <span
          key={i}
          className="float absolute flex w-[68px] flex-col gap-[7px] rounded-[10px] bg-white px-2.5 pb-3 pt-6"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            marginLeft: -34,
            marginTop: -44,
            boxShadow: "0 6px 0 #b84f12",
            animationDelay: `${s.d}s`,
            ["--r" as string]: `${s.r}deg`,
          }}
        >
          {/* la piega in alto: ciò che hanno scritto gli altri resta nascosto */}
          <span className="absolute inset-x-0 top-0 h-4 rounded-t-[10px]" style={{ background: "#ebe7dc", boxShadow: "0 2px 0 #d9d6cd" }} />
          {Array.from({ length: s.lines }, (_, j) => (
            <span key={j} className="h-[5px] rounded-full" style={{ width: `${90 - j * 18}%`, background: j === s.lines - 1 ? "#e5625a" : "#d9d6cd" }} />
          ))}
        </span>
      ))}
    </div>
  );
}
