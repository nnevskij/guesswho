import { ImageResponse } from "next/og";

/**
 * Icona per la schermata Home dell'iPhone (180×180): la stessa faccina mascherata di icon.svg.
 * Il fondo è pieno e senza angoli arrotondati, perché la maschera la applica iOS.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#6a5ae0" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <circle cx="32" cy="35" r="22" fill="#d9ad2c" />
          <circle cx="32" cy="30" r="22" fill="#fcd95c" />
          <path d="M8.5 25.5 Q32 15 55.5 25.5 L53.5 34.5 Q43 39.5 32 33.5 Q21 39.5 10.5 34.5 Z" fill="#1d1b22" />
          <ellipse cx="22.5" cy="28.5" rx="5.2" ry="3.6" fill="#fcd95c" />
          <ellipse cx="41.5" cy="28.5" rx="5.2" ry="3.6" fill="#fcd95c" />
          <path d="M23 42.5 Q33 47.5 42 40.5" fill="none" stroke="#1d1b22" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
