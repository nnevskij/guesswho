/** La faccina di Giochi Loschi (gettone con la mascherina e il sorrisetto), la stessa della favicon. */
export function Mascot({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="6 6 52 54" aria-hidden="true" className="shrink-0">
      <circle cx="32" cy="35" r="22" fill="#d9ad2c" />
      <circle cx="32" cy="30" r="22" fill="#fcd95c" />
      <path d="M8.5 25.5 Q32 15 55.5 25.5 L53.5 34.5 Q43 39.5 32 33.5 Q21 39.5 10.5 34.5 Z" fill="#1d1b22" />
      <ellipse cx="22.5" cy="28.5" rx="5.2" ry="3.6" fill="#fcd95c" />
      <ellipse cx="41.5" cy="28.5" rx="5.2" ry="3.6" fill="#fcd95c" />
      <path d="M23 42.5 Q33 47.5 42 40.5" fill="none" stroke="#1d1b22" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
