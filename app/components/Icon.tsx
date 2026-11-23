// Icone a tratto spesso con estremità arrotondate, in linea con i tasti morbidi.
const PATHS = {
  crown: "M4 17h16M5 17 3.5 8l5 3.5L12 5l3.5 6.5 5-3.5L19 17",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  sound: "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4ZM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11",
  mute: "M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4ZM16.5 9.5l5 5M21.5 9.5l-5 5",
  share: "M12 3.5v11M8 7.5l4-4 4 4M5.5 12v6.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V12",
  edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z",
  eyeOff:
    "M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.4 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.6-1.3M10 10a2.8 2.8 0 0 0 4 4",
  exit: "M14 4H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5",
  reread: "M4 12a8 8 0 0 1 14-5.3M20 4.5v4h-4M20 12a8 8 0 0 1-14 5.3M4 19.5v-4h4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className = "", strokeWidth = 2.6 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
