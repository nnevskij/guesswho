import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "./components/button";
import { Icon } from "./components/Icon";
import { MysteryField } from "./components/MysteryField";
import { MuteButton } from "./components/Toy";
import { SheetsCover } from "./funnystories/SheetsCover";
import { CardsCover } from "./impostore/CardsCover";
import { GAMES } from "./games";
import { PAGE_COLORS } from "./lib/colors";
import { PageColor } from "./lib/pageColor";

/** Copertina di ogni gioco nel catalogo. */
const COVERS: Record<string, ReactNode> = {
  guesswho: <MysteryField />,
  funnystories: <SheetsCover />,
  impostore: <CardsCover />,
};

export default function Catalogue() {
  return (
    <div className="min-h-dvh bg-violet">
      <PageColor color={PAGE_COLORS.violet} />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex h-14 items-center justify-between">
          <h1 className="font-display text-[1.75rem] font-black tracking-tight text-white">ACpicchia!</h1>
          <MuteButton on="violet" />
        </header>

        <p className="text-lg font-bold leading-snug text-white/85">
          Giochi da fare nella stessa stanza, ognuno con il suo telefono. Scegline uno e apri una stanza.
        </p>

        <ul className="flex flex-col gap-5">
          {GAMES.map((game) => (
            <li key={game.slug} className="rounded-[36px] bg-white/25 p-2">
              <article className="card overflow-hidden rounded-[30px]!">
                <Link href={`/${game.slug}`} tabIndex={-1} aria-hidden="true" className="block">
                  {COVERS[game.slug]}
                </Link>
                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <h2 className="font-display text-[1.6rem] font-extrabold leading-tight">{game.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="pill-dark px-3 py-1 text-sm">{game.players}</span>
                      <span className="pill-dark px-3 py-1 text-sm">{game.minutes}</span>
                    </div>
                    <p className="mt-3 text-base font-bold text-ink-soft">{game.pitch}</p>
                  </div>
                  <ButtonLink href={`/${game.slug}`} tone="yellow">
                    Gioca
                    <Icon name="arrow" size={24} strokeWidth={3.2} />
                  </ButtonLink>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-auto rounded-[26px] border-[3px] border-dashed border-white/70 bg-white/15 px-5 py-4 text-white">
          <p className="font-display text-lg font-extrabold">Altri giochi in arrivo</p>
          <p className="mt-1 text-base font-bold text-white/85">Il prossimo comparirà qui.</p>
        </div>
      </div>
    </div>
  );
}
