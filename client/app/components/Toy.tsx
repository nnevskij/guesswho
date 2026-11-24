"use client";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { PublicPlayer } from "../hooks/useGameSocket";
import { buzz, sfx, soundStore } from "../lib/feedback";
import { Icon, type IconName } from "./Icon";

/** Colori dei giocatori: faccia, bordo 3D della stessa tinta e colore del testo sopra. */
export const PLAYER_COLORS = [
  { face: "#e5625a", edge: "#b94740", ink: "#fff" }, // corallo
  { face: "#2f8a76", edge: "#216656", ink: "#fff" }, // verde petrolio
  { face: "#4fd483", edge: "#2fa862", ink: "#1d1b22" }, // verde
  { face: "#3f4ff0", edge: "#2b37c2", ink: "#fff" }, // blu
  { face: "#fcd95c", edge: "#d9ad2c", ink: "#1d1b22" }, // giallo
  { face: "#7b5ce6", edge: "#5b40c0", ink: "#fff" }, // viola
  { face: "#e8691f", edge: "#b84f12", ink: "#fff" }, // arancio
  { face: "#e0589a", edge: "#b33c77", ink: "#fff" }, // rosa
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];
export const playerColor = (i: number): PlayerColor => PLAYER_COLORS[i % PLAYER_COLORS.length];
/** L'avatar usa un colore sfalsato rispetto alla riga, così risalta (corallo → verde, petrolio → blu...). */
export const avatarColor = (i: number): PlayerColor => playerColor(i + 2);

export function initials(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const words = clean.split(/\s+/);
  const two = words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2);
  return two.toUpperCase();
}

/** Gettone tondo con le iniziali, con il bordo 3D sotto. */
export function Avatar({ name, index, size = 48, ring }: { name: string | null; index: number; size?: number; ring?: string }) {
  const c = avatarColor(index);
  return (
    <span
      className="font-display flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: c.face,
        color: c.ink,
        boxShadow: `0 ${Math.round(size / 14)}px 0 ${c.edge}${ring ? `, 0 0 0 3px ${ring}` : ""}`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Gettoni sovrapposti dei giocatori presenti. */
export function AvatarStack({ players, max = 5, ring = "var(--cream)" }: { players: PublicPlayer[]; max?: number; ring?: string }) {
  const shown = players.slice(0, max);
  const extra = players.length - shown.length;
  return (
    <div className="flex items-center" aria-label={`${players.length} giocatori nella stanza`} role="img">
      {shown.map((p, i) => (
        <span key={p.id} className="-ml-3 first:ml-0" style={{ zIndex: max - i, opacity: p.connected ? 1 : 0.5 }}>
          <Avatar name={p.nickname} index={i} size={46} ring={ring} />
        </span>
      ))}
      {extra > 0 && (
        <span className="pill-dark -ml-2 px-2.5 py-1.5 text-xs" style={{ zIndex: 0 }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

type Surface = "cream" | "violet" | "color";
const SOFT: Record<Surface, CSSProperties> = {
  cream: { ["--soft-bg" as string]: "rgb(29 27 34 / 0.07)", ["--soft-ink" as string]: "var(--ink)" },
  violet: { ["--soft-bg" as string]: "rgb(255 255 255 / 0.18)", ["--soft-ink" as string]: "#fff" },
  color: { ["--soft-bg" as string]: "rgb(0 0 0 / 0.16)", ["--soft-ink" as string]: "#fff" },
};

export function IconButton({
  icon,
  label,
  onClick,
  on = "cream",
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  on?: Surface;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.press();
        buzz(10);
        onClick();
      }}
      aria-label={label}
      title={label}
      className="soft-btn size-12 !p-0"
      style={SOFT[on]}
    >
      <Icon name={icon} size={24} />
    </button>
  );
}

export function MuteButton({ on = "cream" }: { on?: Surface }) {
  const muted = useSyncExternalStore(soundStore.subscribe, soundStore.get, soundStore.getServer);
  return (
    <button
      type="button"
      onClick={soundStore.toggle}
      aria-label={muted ? "Attiva suoni e vibrazione" : "Disattiva suoni e vibrazione"}
      title={muted ? "Attiva suoni" : "Disattiva suoni"}
      className="soft-btn size-12 !p-0"
      style={SOFT[on]}
    >
      <Icon name={muted ? "mute" : "sound"} size={24} />
    </button>
  );
}

/** Pulsante morbido e piatto per le azioni secondarie. */
export function SoftButton({
  children,
  onClick,
  on = "cream",
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  on?: Surface;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.press();
        buzz(10);
        onClick();
      }}
      className={`soft-btn text-base ${className}`}
      style={SOFT[on]}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={`card p-5 ${className}`} style={style}>
      {children}
    </section>
  );
}

/** Un pallino per giocatore: pieno se ha votato. */
export function VoteDots({ total, lit, color }: { total: number; lit: number; color: string }) {
  return (
    <div className="flex max-w-[7.5rem] shrink-0 flex-wrap justify-end gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const on = i < lit;
        return (
          <span
            key={`${i}-${on}`}
            className={`size-3.5 rounded-full ${on ? "bump" : ""}`}
            style={{ background: on ? color : "var(--cream-deep)", boxShadow: on ? "0 2px 0 rgb(0 0 0 / 0.18)" : "none" }}
          />
        );
      })}
    </div>
  );
}

export function Alert({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "yellow" }) {
  return (
    <p
      role="alert"
      className="animate-pop rounded-[22px] px-4 py-3 text-base font-bold leading-snug motion-reduce:animate-none"
      style={tone === "red" ? { background: "#fde1de", color: "#8e2a23" } : { background: "#fff1bd", color: "#5c4500" }}
    >
      {children}
    </p>
  );
}

/** Pulsante che chiede una seconda pressione entro 3 secondi (uscire, espellere, ricominciare). */
export function ConfirmButton({
  children,
  confirmLabel = "Sicuro?",
  onConfirm,
  on = "cream",
  icon,
  ariaLabel,
  className = "",
}: {
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  on?: Surface;
  icon?: IconName;
  ariaLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      data-armed={armed}
      className={`soft-btn text-base ${children ? "" : "size-10 !min-h-10 !p-0"} ${armed && !children ? "!w-auto !px-3" : ""} ${className}`}
      style={SOFT[on]}
      aria-label={armed ? `${confirmLabel} Premi di nuovo per confermare` : ariaLabel}
      onClick={() => {
        sfx.press();
        buzz(12);
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {icon && !(armed && !children) && <Icon name={icon} size={children ? 20 : 18} />}
      {armed ? <span className="text-sm font-black">{confirmLabel}</span> : children}
    </button>
  );
}
