import { ImageResponse } from "next/og";

/**
 * Icona per la schermata Home dell'iPhone (180×180): lo stesso gettone di icon.svg.
 * Il fondo è pieno e senza angoli arrotondati, perché la maschera la applica iOS.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#6a5ae0" }}>
        <div style={{ position: "relative", width: 118, height: 132, display: "flex" }}>
          <div style={{ position: "absolute", left: 0, top: 14, width: 118, height: 118, borderRadius: 999, background: "#d9ad2c" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 118, height: 118, borderRadius: 999, background: "#fcd95c" }} />
          <div style={{ position: "absolute", left: 48, top: 18, width: 22, height: 52, borderRadius: 11, background: "#1d1b22" }} />
          <div style={{ position: "absolute", left: 47, top: 78, width: 24, height: 24, borderRadius: 999, background: "#1d1b22" }} />
        </div>
      </div>
    ),
    size,
  );
}
