"use client";
import { useEffect } from "react";
import { PAGE_COLORS } from "./colors";

const DEFAULT = PAGE_COLORS.cream;

/**
 * Il meta theme-color è solo nostro (non in viewport di layout.tsx).
 * Safari su iPhone spesso ignora il cambio di `content` di un meta esistente: lo sostituiamo con uno
 * nuovo a ogni cambio. Coloriamo anche html e body, da cui Safari ricava la tinta quando non usa il meta.
 */
const apply = (color: string) => {
  const root = document.documentElement;
  root.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  // Letta dai campionatori .chrome-sample (layout.tsx + globals.css) per Safari 26 su iPhone.
  root.style.setProperty("--chrome-color", color);
  refreshSafariTint();

  // Per gli altri browser (Chrome su Android ecc.) vale ancora il meta theme-color.
  const old = document.querySelectorAll('meta[name="theme-color"]');
  if (old.length === 1 && old[0].getAttribute("content") === color) return;
  old.forEach((m) => m.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = color;
  document.head.appendChild(meta);
};

/**
 * Safari 26 su iPhone ignora theme-color e tinge le barre con lo sfondo degli elementi fissi a filo
 * del bordo, ma tiene in cache il colore letto: cambiare solo il colore non basta. Allungare per
 * un attimo i campionatori (11px → 12px) gli presenta una geometria nuova e lo costringe a rileggerli.
 */
let refreshFrame = 0;
function refreshSafariTint() {
  const root = document.documentElement;
  cancelAnimationFrame(refreshFrame);
  root.setAttribute("data-chrome-refresh", "");
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = requestAnimationFrame(() => root.removeAttribute("data-chrome-refresh"));
  });
}

/**
 * Colora lo sfondo del documento (si vede nel rimbalzo dello scroll) e la barra del browser
 * sul telefono. Quando la pagina si smonta torna al colore di default, così passando da un gioco
 * all'altro o alla home non resta il colore della pagina precedente.
 */
export function usePageColor(color: string) {
  useEffect(() => {
    // Nella navigazione la pulizia della pagina uscente può arrivare dopo l'effetto di quella nuova:
    // rimette il default solo se nel frattempo nessun'altra pagina ha preso il controllo.
    const owner = Symbol();
    current = owner;
    apply(color);
    return () => {
      if (current !== owner) return;
      current = null;
      apply(DEFAULT);
    };
  }, [color]);
}

let current: symbol | null = null;

/** Per i componenti server (la home): stesso effetto, come componente vuoto. */
export function PageColor({ color }: { color: string }) {
  usePageColor(color);
  return null;
}
