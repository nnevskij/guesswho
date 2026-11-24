"use client";
import { useEffect, useState } from "react";

const SCREEN_MS = 200;

function screenMs() {
  if (typeof window === "undefined") return SCREEN_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCREEN_MS;
}

export function screenClass(phase: "in" | "out") {
  return phase === "in"
    ? "animate-screen-in motion-reduce:animate-none"
    : "animate-screen-out pointer-events-none motion-reduce:animate-none";
}

/**
 * Tiene a schermo la schermata uscente (con i suoi dati "congelati") per la durata
 * dell'animazione di uscita, poi passa alla nuova.
 * `data` deve essere stabile tra un render e l'altro (useMemo), altrimenti si aggiorna a ogni render.
 */
export function useScreen<T>(id: string, data: T) {
  const [shownId, setShownId] = useState(id);
  const [frozen, setFrozen] = useState(data);
  const exiting = id !== shownId;
  // Aggiornamento di stato durante il render (pattern consigliato da React al posto di ref/effect).
  if (!exiting && frozen !== data) setFrozen(data);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setShownId(id), screenMs());
    return () => clearTimeout(t);
  }, [exiting, id]);

  return {
    id: shownId,
    data: exiting ? frozen : data,
    phase: exiting ? ("out" as const) : ("in" as const),
  };
}

/** Come useScreen ma per un overlay: resta montato durante l'uscita dopo che `value` torna null. */
export function usePresence<T>(value: T | null) {
  const [shown, setShown] = useState<T | null>(value);
  if (value && value !== shown) setShown(value);

  useEffect(() => {
    if (value) return;
    const t = setTimeout(() => setShown(null), screenMs());
    return () => clearTimeout(t);
  }, [value]);

  const visible = value ?? shown;
  if (!visible) return null;
  return { value: visible, phase: value ? ("in" as const) : ("out" as const) };
}

/**
 * Invito a una stanza: condivisione nativa con il link, altrimenti copia il link.
 * Ritorna il messaggio da mostrare (o null se ci ha pensato il telefono).
 */
export async function shareInvite(game: string, title: string, code: string): Promise<string | null> {
  const url = `${window.location.origin}/${game}?code=${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ text: `Entra in ${title} con il codice ${code}`, url });
    } catch {}
    return null;
  }
  try {
    await navigator.clipboard.writeText(url);
    return "Link copiato";
  } catch {
    return code;
  }
}
