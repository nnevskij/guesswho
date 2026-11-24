"use client";
import { useState } from "react";

export const CODE_LENGTH = 5;
const ALLOWED = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;
/** Maiuscolo, solo caratteri ammessi, lunghezza massima del codice. */
export const cleanCode = (raw: string) => raw.toUpperCase().replace(ALLOWED, "").slice(0, CODE_LENGTH);

/**
 * Cinque gettoni per il codice stanza.
 * Sotto c'è un vero <input> trasparente, così tastiera mobile, incolla e screen reader funzionano.
 */
export function CodeEntry({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  const chars = value.split("");

  return (
    <label className="relative block">
      <span className="sr-only">Codice stanza di {CODE_LENGTH} caratteri</span>
      <input
        value={value}
        onChange={(e) => onChange(cleanCode(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && value.length === CODE_LENGTH && onSubmit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        className="absolute inset-0 z-10 h-full w-full cursor-text text-base opacity-0"
      />
      <div className="grid grid-cols-5 gap-2" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(chars.length, CODE_LENGTH - 1);
          const ch = chars[i];
          return (
            <div
              key={i}
              className="font-display relative flex aspect-[4/5] items-center justify-center rounded-[18px] text-[1.7rem] font-extrabold transition-[background-color,box-shadow] duration-150"
              style={{
                background: ch ? "var(--yellow)" : "var(--cream-deep)",
                boxShadow: ch
                  ? "0 4px 0 var(--yellow-edge)"
                  : active
                    ? "inset 0 0 0 2.5px var(--violet)"
                    : "none",
              }}
            >
              {ch ? (
                <span key={ch + i} className="animate-pop motion-reduce:animate-none">
                  {ch}
                </span>
              ) : (
                active && <span className="animate-blink text-violet">_</span>
              )}
            </div>
          );
        })}
      </div>
    </label>
  );
}
