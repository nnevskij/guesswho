"use client";
import { useEffect, useRef, useState } from "react";
import type { CharactersShow } from "../hooks/useGameSocket";
import { buzz, sfx } from "../lib/feedback";
import { playerColor } from "./Toy";

/**
 * Due fasi, con i tempi decisi dal server così tutti i telefoni vanno insieme:
 * 1. conto alla rovescia su viola pieno (5 s di default);
 * 2. lista dei personaggi su crema, visibile per un tempo fisso (30 s di default), poi si chiude da sola.
 */
export function RevealOverlay({
  show,
  decoys = 0,
  className,
  onDone,
}: {
  show: CharactersShow;
  /** Quanti nomi falsi sono mescolati nella lista (mai quali). */
  decoys?: number;
  className: string;
  onDone: () => void;
}) {
  const { countdownMs, durationMs, receivedAt } = show;
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    const tick = setInterval(() => setNow(Date.now()), 200);
    const done = setTimeout(onDone, receivedAt + countdownMs + durationMs - Date.now());
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [receivedAt, countdownMs, durationMs, onDone]);

  const elapsed = now - receivedAt;
  const counting = elapsed < countdownMs;
  const toReveal = Math.max(1, Math.ceil((countdownMs - elapsed) / 1000));
  const listLeftMs = Math.max(0, countdownMs + durationMs - elapsed);
  const listLeft = Math.ceil(listLeftMs / 1000);

  // Bip a ogni secondo del conto alla rovescia, jingle quando compare la lista,
  // bip leggeri negli ultimi 5 secondi prima che si chiuda.
  useEffect(() => {
    if (counting) sfx.tick();
  }, [counting, toReveal]);
  useEffect(() => {
    if (counting) return;
    if (show.reason === "start") sfx.start();
    else sfx.reread();
    buzz([40, 60, 40, 60, 80]);
  }, [counting, show.reason]);
  useEffect(() => {
    if (!counting && listLeft > 0 && listLeft <= 5) sfx.tick();
  }, [counting, listLeft]);

  const title = show.reason === "start" ? "I personaggi" : `Rilettura ${show.round}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
      tabIndex={-1}
      className={`fixed inset-0 z-20 overflow-y-auto outline-none transition-colors duration-300 ${className}`}
      style={{ background: counting ? "var(--violet)" : "var(--cream)" }}
    >
      {counting ? (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center text-white">
          <span className="font-display rounded-full bg-white/20 px-5 py-2 text-base font-extrabold uppercase tracking-wide">
            {show.reason === "start" ? "Tutti pronti!" : "Si rilegge!"}
          </span>
          <p
            key={toReveal}
            className="font-display shadow-text animate-pop text-[10rem] font-black leading-none motion-reduce:animate-none"
            aria-live="assertive"
          >
            {toReveal}
          </p>
          <p className="max-w-[24ch] text-lg font-bold text-white/85">
            Occhi sullo schermo: la lista resta visibile per {Math.round(durationMs / 1000)} secondi.
          </p>
        </div>
      ) : (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="text-center">
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">
              {show.characters.length} personaggi
            </p>
            <h2 id="reveal-title" className="font-display mt-1 text-[2rem] font-black leading-none">
              {title}
            </h2>
            <p className="mt-2 text-base font-bold text-ink-soft">
              {decoys > 0 ? `Mescolati, senza autore e con ${decoys} ${decoys === 1 ? "falso" : "falsi"}.` : "Mescolati e senza autore."}
            </p>
          </div>

          <ul className="flex flex-1 flex-col gap-3.5">
            {show.characters.map((name, i) => {
              const c = playerColor(i);
              return (
                <li
                  key={`${i}-${name}`}
                  className="animate-pop flex rounded-[24px] motion-reduce:animate-none"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    background: c.edge,
                    boxShadow: `0 5px 0 color-mix(in oklab, ${c.edge} 78%, black)`,
                  }}
                >
                  <span className="font-display flex w-14 shrink-0 items-center justify-center text-lg font-extrabold" style={{ color: c.ink }}>
                    {i + 1}
                  </span>
                  <span
                    className="font-display min-w-0 flex-1 rounded-[22px] px-4 py-4 text-xl font-extrabold leading-tight break-words"
                    style={{ background: c.face, color: c.ink }}
                  >
                    {name}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Timer: la barra si svuota fino alla chiusura automatica */}
          <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5 px-5 py-4">
            <p className="flex items-baseline justify-between text-base font-extrabold">
              <span>Si chiude tra</span>
              <span className="font-display text-2xl font-black tabular-nums">{listLeft}s</span>
            </p>
            <div className="h-4 overflow-hidden rounded-full bg-cream-deep" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full transition-transform duration-200 ease-linear motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${listLeftMs / durationMs})`,
                  background: listLeft <= 5 ? "var(--red)" : "var(--violet)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
