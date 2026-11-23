"use client";
import type { RoomState } from "../hooks/useGameSocket";
import { Icon } from "./Icon";
import { Avatar, ConfirmButton, playerColor } from "./Toy";

/** Righe a due tinte: a sinistra il numero del giocatore sul tono scuro, a destra gettone e nome. */
export function PlayerList({
  room,
  meId,
  isHost,
  onKick,
}: {
  room: RoomState;
  meId?: string;
  isHost: boolean;
  onKick: (id: string) => void;
}) {
  const lobby = room.phase === "lobby";

  return (
    <ul className="flex flex-col gap-4">
      {room.players.map((p, i) => {
        const isMe = p.id === meId;
        const lit = lobby ? p.ready : p.rereadVote;
        const c = playerColor(i);
        const status = !p.connected
          ? "Offline"
          : lobby
            ? !p.nickname
              ? "Sceglie il nome"
              : !p.hasCharacter
                ? "Sceglie il personaggio"
                : p.ready
                  ? "Pronto a giocare"
                  : "Ci sta pensando"
            : p.rereadVote
              ? "Vuole rileggere"
              : "In gioco";

        return (
          <li
            key={p.id}
            className="animate-pop relative flex rounded-[26px] motion-reduce:animate-none"
            style={{
              background: c.edge,
              boxShadow: `0 5px 0 color-mix(in oklab, ${c.edge} 78%, black)`,
              animationDelay: `${i * 50}ms`,
              opacity: p.connected ? 1 : 0.6,
            }}
          >
            <span className="font-display flex w-14 shrink-0 items-center justify-center text-lg font-extrabold" style={{ color: c.ink }}>
              P{i + 1}
            </span>

            <div
              className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] py-3 pl-3 pr-3"
              style={{ background: c.face, color: c.ink }}
            >
              <Avatar name={p.nickname} index={i} size={50} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className={`font-display truncate text-lg font-extrabold leading-tight ${p.nickname ? "" : "opacity-70"}`}>
                    {p.nickname ?? "Senza nome"}
                  </span>
                  {p.id === room.hostId && (
                    <span title="Host" className="shrink-0">
                      <Icon name="crown" size={18} />
                      <span className="sr-only">(host)</span>
                    </span>
                  )}
                </p>
                <p className="truncate text-[15px] font-bold opacity-90">{status}</p>
              </div>

              {isHost && !isMe && (
                <ConfirmButton
                  icon="close"
                  on={c.ink === "#fff" ? "color" : "cream"}
                  confirmLabel="Via?"
                  ariaLabel={`Espelli ${p.nickname ?? `P${i + 1}`}`}
                  onConfirm={() => onKick(p.id)}
                />
              )}
            </div>

            {/* Pastiglie appese in basso a destra, come i punteggi */}
            {(isMe || lit) && (
              <div className="absolute -bottom-3 right-3 flex gap-1.5">
                {isMe && <span className="pill-dark px-2.5 py-1.5 text-[11px]">TU</span>}
                {lit && (
                  <span key={String(lit)} className="pill-dark bump px-2.5 py-1.5 text-[11px]">
                    <Icon name={lobby ? "check" : "reread"} size={13} strokeWidth={3.2} className={lobby ? "text-green" : "text-yellow"} />
                    {lobby ? "PRONTO" : "RILEGGI"}
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
