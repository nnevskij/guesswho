"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { buzz, sfx } from "../lib/feedback";

export type ButtonTone = "yellow" | "blue" | "red" | "green" | "teal" | "white";

/** Faccia, bordo 3D (stessa tinta, più scura) e colore dell'etichetta. */
const TONES: Record<ButtonTone, [face: string, edge: string, label: string]> = {
  yellow: ["var(--yellow)", "var(--yellow-edge)", "var(--ink)"],
  green: ["var(--green)", "var(--green-edge)", "var(--ink)"],
  blue: ["var(--blue)", "var(--blue-edge)", "#fff"],
  red: ["var(--red)", "var(--red-edge)", "#fff"],
  teal: ["var(--teal)", "var(--teal-edge)", "#fff"],
  white: ["var(--panel)", "var(--muted-face)", "var(--ink)"],
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  onClick?: () => void;
  tone?: ButtonTone;
  size?: "lg" | "md" | "sm";
  /** Toggle: se definito il tasto resta abbassato quando è true. */
  pressed?: boolean;
  /** Retrocompatibilità con il primo bottone: primary = blu, secondary = bianco. */
  variant?: "primary" | "secondary";
};

/**
 * Tasto giocattolo: faccia piena su un bordo della stessa tinta più scura, che scende quando lo premi.
 * È l'evoluzione del bottone custom originale, come vero <button> (tastiera e screen reader).
 */
export function Button({
  children,
  onClick,
  tone,
  variant,
  size = "lg",
  pressed,
  className = "",
  type = "button",
  style,
  ...rest
}: Props) {
  const key = tone ?? (variant === "secondary" ? "white" : variant === "primary" ? "blue" : "yellow");
  const [face, edge, label] = TONES[key];

  const handle = () => {
    if (pressed === undefined) sfx.press();
    else if (pressed) sfx.toggleOff();
    else sfx.toggleOn();
    buzz(12);
    onClick?.();
  };

  return (
    <button
      type={type}
      data-size={size}
      aria-pressed={pressed}
      onClick={handle}
      className={`toy-btn font-display font-extrabold uppercase ${className}`}
      style={{ ["--face" as string]: face, ["--edge" as string]: edge, ["--label" as string]: label, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Stesso tasto giocattolo, ma è un link: per andare a un'altra pagina, per esempio un gioco del catalogo. */
export function ButtonLink({
  href,
  children,
  tone = "yellow",
  size = "lg",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
  size?: "lg" | "md" | "sm";
  className?: string;
}) {
  const [face, edge, label] = TONES[tone];
  return (
    <Link
      href={href}
      data-size={size}
      onClick={() => {
        sfx.press();
        buzz(12);
      }}
      className={`toy-btn font-display font-extrabold uppercase ${className}`}
      style={{ ["--face" as string]: face, ["--edge" as string]: edge, ["--label" as string]: label }}
    >
      {children}
    </Link>
  );
}
