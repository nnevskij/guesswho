"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { AvatarStack, ConfirmButton, IconButton, MuteButton, type LobbyPlayer } from "./Toy";

/** Pezzi comuni alle schermate di stanza dei giochi: intestazioni, nome, scheda del codice. */

/** Nome del gioco in minuscolo; la freccia riporta al catalogo. */
export function GameWordmark({ title }: { title: string }) {
  return (
    <Link href="/" className="-ml-1.5 flex items-center gap-1 rounded-2xl pr-2 text-white" aria-label={`${title}, torna a tutti i giochi`}>
      <Icon name="back" size={26} strokeWidth={3.2} className="opacity-80" />
      <h1 className="font-display text-[1.75rem] font-black lowercase tracking-tight">{title}</h1>
    </Link>
  );
}

/** Intestazione delle schermate d'ingresso (fondo colorato): esci, codice stanza, suoni. */
export function EntryHeader({ code, onLeave }: { code: string; onLeave: () => void }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center">
      <div className="justify-self-start">
        <ConfirmButton icon="exit" on="violet" ariaLabel="Esci dalla stanza" confirmLabel="Esco?" onConfirm={onLeave} className="!size-12 !min-h-12" />
      </div>
      <span className="font-display rounded-full bg-white/20 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white">Stanza {code}</span>
      <div className="justify-self-end">
        <MuteButton on="violet" />
      </div>
    </header>
  );
}

/** Intestazione delle schermate di gioco (fondo crema): esci, gettoni o un'etichetta al centro, condividi, suoni. */
export function GameHeader({
  players,
  onLeave,
  onShare,
  center,
}: {
  players: LobbyPlayer[];
  onLeave: () => void;
  onShare?: () => void;
  center?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center">
      <div className="justify-self-start">
        <ConfirmButton icon="exit" ariaLabel="Esci dalla stanza" confirmLabel="Esco?" onConfirm={onLeave} className="!size-12 !min-h-12" />
      </div>
      {center ?? <AvatarStack players={players} max={4} />}
      <div className="flex gap-1.5 justify-self-end">
        {onShare && <IconButton icon="share" label="Condividi il codice" onClick={onShare} />}
        <MuteButton />
      </div>
    </header>
  );
}

export function NicknameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-sm font-extrabold text-ink-soft">Nickname</span>
      <input
        className="toy-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        autoComplete="nickname"
        placeholder="Come ti chiamano"
        required
      />
    </label>
  );
}

/** Scheda menta con il codice stanza: toccarla condivide il link d'invito. */
export function RoomCodeCard({ code, label = "Stanza", note, onShare }: { code: string; label?: string; note: string; onShare: () => void }) {
  return (
    <button
      type="button"
      onClick={onShare}
      className="relative flex flex-col items-center gap-1 rounded-[30px] border-[2.5px] bg-mint px-5 pb-5 pt-4 text-center transition-transform active:scale-[0.98]"
      style={{ borderColor: "var(--mint-edge)" }}
      aria-label={`Codice stanza ${code.split("").join(" ")}, tocca per condividere`}
    >
      <span
        className="font-display rounded-full px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white"
        style={{ background: "var(--teal)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--teal) 55%, white)" }}
      >
        {label}
      </span>
      <span className="font-display shadow-text mt-2 text-[3.4rem] font-black leading-none tracking-[0.04em]" style={{ color: "var(--teal-edge)" }}>
        {code}
      </span>
      <span className="font-display mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--teal)" }}>
        Tocca per condividere
      </span>
      <span className="mt-1 h-6 text-base font-bold" style={{ color: "var(--teal-edge)" }} aria-live="polite">
        {note}
      </span>
    </button>
  );
}
