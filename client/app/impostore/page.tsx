"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../components/button";
import { CODE_LENGTH, CodeEntry, cleanCode } from "../components/CodeEntry";
import { Icon } from "../components/Icon";
import { EntryHeader, GameHeader, GameWordmark, NicknameField, RoomCodeCard } from "../components/Lobby";
import { Alert, Avatar, AvatarStack, Card, ConfirmButton, IconButton, MuteButton, SoftButton, VoteDots } from "../components/Toy";
import { PAGE_COLORS } from "../lib/colors";
import { buzz, sfx } from "../lib/feedback";
import { usePageColor } from "../lib/pageColor";
import { screenClass, shareInvite, useScreen } from "../lib/screens";
import { CardsCover } from "./CardsCover";
import { useImpostore, type ImpMe, type ImpPlayer, type ImpRoom, type Mode } from "./useImpostore";

type Result = { ok: boolean; error?: { message: string } };

/** Corallo: colore d'ingresso di Impostore (Guess Who viola, Funny Stories arancio). */
const ENTRY = PAGE_COLORS.coral;
const ENTRY_EDGE = "#b94740";
const INK = "#1d1b22";

const MODES: Record<Mode, { name: string; text: string }> = {
  classic: { name: "Classica", text: "L'impostore sa di esserlo e non conosce la parola. Se viene scoperto, può ancora indovinarla." },
  similar: { name: "Parola simile", text: "L'impostore riceve una parola vicina e non sa di essere l'impostore." },
};

const nameOf = (room: ImpRoom, id: string | null | undefined) => room.players.find((p) => p.id === id)?.nickname ?? "Qualcuno";

export default function Impostore() {
  const g = useImpostore();
  const params = useSearchParams();
  const [code, setCode] = useState(() => cleanCode(params.get("code") ?? ""));
  const [nickname, setNickname] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const busy = useRef(false);

  const run = async (p: Promise<Result>) => {
    if (busy.current) return false;
    busy.current = true;
    try {
      const res = await p;
      setError(res.ok ? null : res.error!.message);
      if (!res.ok) {
        sfx.error();
        buzz([30, 50, 30]);
      }
      return res.ok;
    } finally {
      busy.current = false;
    }
  };

  // Suoni: qualcuno entra; cambia fase (parola, voto, risultato).
  const playerCount = g.room?.players.length ?? 0;
  const prevCount = useRef(playerCount);
  useEffect(() => {
    if (playerCount > prevCount.current && prevCount.current > 0) sfx.join();
    prevCount.current = playerCount;
  }, [playerCount]);
  const beat = g.room ? `${g.room.phase}:${g.room.roundNumber}` : "";
  const prevBeat = useRef(beat);
  useEffect(() => {
    const was = prevBeat.current;
    prevBeat.current = beat;
    if (!was || was === beat || beat.startsWith("lobby")) return;
    if (beat.startsWith("clues") || beat.startsWith("result")) sfx.start();
    else sfx.tick();
    buzz([30, 40, 30]);
  }, [beat]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  const needsSignup = Boolean(g.room?.phase === "lobby" && (editing || (!g.me?.nickname && !g.isHost)));
  const screenId = !g.connected ? "connect" : !g.room ? "home" : needsSignup ? "signup" : g.room.phase;
  const screenData = useMemo(
    () => ({ notice: g.notice, error, room: g.room, me: g.me, isHost: g.isHost }),
    [g.notice, error, g.room, g.me, g.isHost],
  );
  const frame = useScreen(screenId, screenData);
  const { room, me, isHost } = frame.data;

  const entry = frame.id === "connect" || frame.id === "home" || frame.id === "signup";
  usePageColor(entry ? ENTRY : PAGE_COLORS.cream);

  const share = async (roomCode: string) => {
    const msg = await shareInvite("impostore", "Impostore", roomCode);
    if (msg) setFlash(msg);
  };
  const resetForm = () => {
    setEditing(false);
    setNickname("");
  };
  const join = async () => {
    if (code.length !== CODE_LENGTH) return;
    resetForm();
    await run(g.joinRoom(code));
  };
  const create = async () => {
    resetForm();
    await run(g.createRoom());
  };
  const leave = () => {
    resetForm();
    void g.leaveRoom();
  };
  const saveNickname = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(g.setNickname(nickname))) setEditing(false);
  };
  const startEdit = () => {
    setNickname(me?.nickname ?? "");
    setEditing(true);
  };

  const host = room?.players.find((p) => p.id === room.hostId);

  return (
    <div className="min-h-dvh transition-colors duration-300" style={{ background: entry ? ENTRY : "var(--cream)" }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <main key={frame.id} className={`flex flex-1 flex-col gap-5 ${screenClass(frame.phase)}`}>
          {/* ---------- CONNESSIONE ---------- */}
          {frame.id === "connect" && (
            <>
              <header className="flex h-14 items-center">
                <GameWordmark title="impostore" />
              </header>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-white">
                <p className="font-display text-2xl font-extrabold">
                  Connessione<span className="animate-blink">…</span>
                </p>
                <p className="max-w-[28ch] text-lg font-bold text-white/85">Sto raggiungendo il server. Se ci mette troppo, controlla la rete.</p>
              </div>
            </>
          )}

          {/* ---------- HOME ---------- */}
          {frame.id === "home" && (
            <>
              <header className="flex h-14 items-center justify-between">
                <GameWordmark title="impostore" />
                <MuteButton on="violet" />
              </header>
              {frame.data.notice && <Alert tone="yellow">{frame.data.notice}</Alert>}
              <div className="rounded-[36px] bg-white/25 p-2">
                <div className="card overflow-hidden !rounded-[30px]">
                  <CardsCover />
                  <div className="flex flex-col gap-4 p-5">
                    <div>
                      <h2 className="font-display text-[1.6rem] font-extrabold leading-tight">Entra in una stanza</h2>
                      <p className="mt-1 text-base font-bold text-ink-soft">Scrivi il codice di chi ha aperto la stanza.</p>
                    </div>
                    <CodeEntry value={code} onChange={setCode} onSubmit={join} />
                    <Button tone="blue" disabled={code.length < CODE_LENGTH} onClick={join}>
                      Entra
                    </Button>
                  </div>
                </div>
              </div>
              {frame.data.error && <Alert>{frame.data.error}</Alert>}
              <div className="mt-auto flex flex-col gap-4 pt-1">
                <div className="rounded-[26px] border-[3px] border-dashed border-white/70 bg-white/15 px-5 py-4 text-white">
                  <p className="font-display text-lg font-extrabold">Come si gioca</p>
                  <p className="mt-1 text-base font-bold text-white/90">
                    Tutti hanno la stessa parola segreta, tranne l&apos;impostore. A turno dite un indizio a voce, poi votate sul telefono chi vi sembra fuori posto.
                  </p>
                  <Link href="/regole/impostore" className="mt-2 inline-flex items-center gap-1 text-base font-extrabold underline underline-offset-4">
                    Regole complete
                    <Icon name="next" size={18} strokeWidth={3} />
                  </Link>
                </div>
                <Button tone="yellow" onClick={create}>
                  <Icon name="plus" size={24} strokeWidth={3.4} />
                  Crea stanza
                </Button>
              </div>
            </>
          )}

          {/* ---------- ISCRIZIONE ---------- */}
          {room && frame.id === "signup" && (
            <>
              <EntryHeader code={room.code} onLeave={leave} />
              <div className="flex flex-col items-center gap-3 pt-2 text-center text-white">
                <AvatarStack players={room.players} max={5} ring={ENTRY} />
                <h1 className="font-display text-[1.75rem] font-black leading-tight">{editing ? "Cambia nome" : "Chi sei?"}</h1>
                <p className="max-w-[30ch] text-base font-bold text-white/90">
                  {room.players.length > 1
                    ? `${room.players.length - 1} ${room.players.length === 2 ? "giocatore ti aspetta" : "giocatori ti aspettano"} nella lobby.`
                    : "Scegli un nome per entrare nella lobby."}
                </p>
              </div>
              <form onSubmit={saveNickname} className="flex flex-1 flex-col gap-5">
                <div className="rounded-[36px] bg-white/25 p-2">
                  <div className="card !rounded-[30px] p-5">
                    <NicknameField value={nickname} onChange={setNickname} />
                  </div>
                </div>
                {frame.data.error && <Alert>{frame.data.error}</Alert>}
                <div className="mt-auto flex flex-col items-center gap-3">
                  <Button type="submit" tone="yellow" disabled={!nickname.trim()}>
                    {editing ? "Salva" : "Entra nella lobby"}
                  </Button>
                  {editing && (
                    <SoftButton on="violet" onClick={() => setEditing(false)}>
                      Annulla
                    </SoftButton>
                  )}
                </div>
              </form>
            </>
          )}

          {/* ---------- LOBBY ---------- */}
          {room && frame.id === "lobby" && (
            <>
              <GameHeader players={room.players} onLeave={leave} onShare={() => share(room.code)} />
              <RoomCodeCard code={room.code} note={flash ?? "Detta il codice agli altri"} onShare={() => share(room.code)} />

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="font-display text-xl font-extrabold">Giocatori</h2>
                  <span className="font-display text-base font-bold text-ink-soft">
                    {room.players.length}/{room.maxPlayers}
                  </span>
                </div>
                <Players room={room} meId={me?.playerId} isHost={isHost} onKick={(id) => run(g.kick(id))} onEditMe={startEdit} />
              </section>

              {isHost && !me?.nickname && (
                <Card>
                  <h2 className="font-display mb-4 text-xl font-extrabold">Il tuo nome</h2>
                  <form onSubmit={saveNickname} className="flex flex-col gap-4">
                    <NicknameField value={nickname} onChange={setNickname} />
                    <Button type="submit" size="md" tone="teal" disabled={!nickname.trim()}>
                      Salva
                    </Button>
                  </form>
                </Card>
              )}

              {isHost ? (
                <Settings room={room} me={me} run={run} g={g} />
              ) : (
                <SettingsSummary room={room} hostName={host?.nickname} />
              )}

              {frame.data.error && <Alert>{frame.data.error}</Alert>}

              <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 p-3 pt-4">
                <StartDock room={room} isHost={isHost} hostName={host?.nickname} onStart={() => run(g.start())} label="Inizia il round" />
              </div>
            </>
          )}

          {/* ---------- PAROLA E INDIZI ---------- */}
          {room && me && frame.id === "clues" && (
            <>
              <GameHeader players={room.players} onLeave={leave} center={<span className="pill-dark px-4 py-2 text-sm">Round {room.roundNumber}</span>} />
              <SecretCard room={room} me={me} />
              <ClueOrder room={room} meId={me.playerId} />
              {frame.data.error && <Alert>{frame.data.error}</Alert>}
              <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 p-3 pt-4">
                <p className="px-2 text-base font-extrabold leading-tight">
                  Indizi a voce, uno a testa
                  <span className="block text-sm font-bold text-ink-soft">
                    {isHost ? "Quando avete finito, apri il voto." : `Quando avete finito, ${host?.nickname ?? "l'host"} apre il voto.`}
                  </span>
                </p>
                {isHost && (
                  <Button tone="green" onClick={() => run(g.openVoting())}>
                    Si vota
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ---------- VOTO ---------- */}
          {room && me && frame.id === "voting" && (
            <>
              <GameHeader players={room.players} onLeave={leave} center={<span className="pill-dark px-4 py-2 text-sm">Si vota</span>} />
              <div className="text-center">
                <h1 className="font-display text-[1.75rem] font-black leading-tight">Chi è l&apos;impostore?</h1>
                <p className="mt-1 text-base font-bold text-ink-soft">Puoi cambiare idea finché non hanno votato tutti.</p>
              </div>
              <SecretCard room={room} me={me} compact />
              <VoteList room={room} me={me} onVote={(id) => run(g.vote(id))} />
              {frame.data.error && <Alert>{frame.data.error}</Alert>}
              <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex items-center justify-between gap-3 p-4">
                <p className="text-base font-extrabold leading-tight">
                  {room.round?.votedCount ?? 0} su {room.players.filter((p) => p.playing && p.connected).length} hanno votato
                  <span className="block text-sm font-bold text-ink-soft">{me.vote ? `Hai votato ${nameOf(room, me.vote)}` : "Tocca un giocatore"}</span>
                </p>
                <VoteDots total={room.players.filter((p) => p.playing && p.connected).length} lit={room.round?.votedCount ?? 0} color="var(--green)" />
              </div>
            </>
          )}

          {/* ---------- ULTIMA CHANCE ---------- */}
          {room && me && frame.id === "guess" && (
            <GuessScreen room={room} me={me} isHost={isHost} error={frame.data.error} onLeave={leave} onGuess={(w) => run(g.guess(w))} onSkip={() => run(g.skipGuess())} />
          )}

          {/* ---------- RISULTATO ---------- */}
          {room && me && frame.id === "result" && (
            <>
              <GameHeader players={room.players} onLeave={leave} onShare={() => share(room.code)} center={<span className="pill-dark px-4 py-2 text-sm">Round {room.roundNumber}</span>} />
              <ResultCard room={room} />
              <Scoreboard room={room} meId={me.playerId} />
              {isHost && (
                <details className="card group p-4">
                  <summary className="font-display flex cursor-pointer list-none items-center justify-between text-lg font-extrabold">
                    Cambia impostazioni
                    <Icon name="down" size={22} strokeWidth={3} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4">
                    <Settings room={room} me={me} run={run} g={g} bare />
                  </div>
                </details>
              )}
              {frame.data.error && <Alert>{frame.data.error}</Alert>}
              {/* Qui la pulsantiera non galleggia: coprirebbe la classifica, che è la cosa da guardare */}
              <div className="dock mt-auto flex flex-col gap-3 p-3 pt-4">
                <StartDock room={room} isHost={isHost} hostName={host?.nickname} onStart={() => run(g.start())} label="Prossimo round" />
                {isHost && (
                  <div className="flex justify-center">
                    <ConfirmButton icon="close" confirmLabel="Chiudo la partita?" onConfirm={() => run(g.resetGame())}>
                      Fine partita
                    </ConfirmButton>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- Pezzi delle schermate ----------

type Game = ReturnType<typeof useImpostore>;

function Players({
  room,
  meId,
  isHost,
  onKick,
  onEditMe,
}: {
  room: ImpRoom;
  meId?: string;
  isHost: boolean;
  onKick?: (id: string) => void;
  onEditMe?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {room.players.map((p, i) => {
        const mine = p.id === meId;
        const status = !p.connected ? "offline" : p.nickname ? null : "sceglie il nome";
        return (
          <li key={p.id} className="card flex items-center gap-3 !rounded-[24px] px-3 py-2.5" style={{ opacity: p.connected ? 1 : 0.6 }}>
            <Avatar name={p.nickname} index={i} size={42} />
            <div className="min-w-0 flex-1">
              <p className="font-display flex items-center gap-1.5 truncate text-base font-extrabold leading-tight">
                <span className="truncate">{p.nickname ?? "Senza nome"}</span>
                {p.id === room.hostId && <Icon name="crown" size={16} strokeWidth={2.6} className="shrink-0" />}
              </p>
              {status && <p className="text-sm font-bold text-ink-soft">{status}</p>}
            </div>
            {mine && <span className="pill-dark px-2.5 py-1 text-xs">TU</span>}
            {mine && p.nickname && onEditMe && <IconButton icon="edit" label="Cambia nome" onClick={onEditMe} />}
            {isHost && !mine && onKick && (
              <ConfirmButton icon="close" ariaLabel={`Espelli ${p.nickname ?? "giocatore"}`} confirmLabel="Via?" onConfirm={() => onKick(p.id)} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Impostazioni dell'host: modalità, impostori, categorie, parola propria. In lobby e tra un round e l'altro. */
function Settings({ room, me, run, g, bare }: { room: ImpRoom; me: ImpMe | null; run: (p: Promise<Result>) => Promise<boolean>; g: Game; bare?: boolean }) {
  const { mode, impostorCount, categories } = room.settings;
  const content = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="font-display px-1 text-lg font-extrabold">Modalità</h3>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Modalità">
          {(Object.keys(MODES) as Mode[]).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  sfx.press();
                  if (!on) void run(g.setSettings({ mode: m }));
                }}
                className="flex items-start gap-3 rounded-[20px] border-[2.5px] px-4 py-3 text-left transition-colors"
                style={{ borderColor: on ? "var(--teal)" : "var(--cream-deep)", background: on ? "var(--mint)" : "var(--panel)" }}
              >
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[2.5px]"
                  style={{ borderColor: on ? "var(--teal)" : "var(--muted-edge)", background: on ? "var(--teal)" : "transparent" }}
                >
                  {on && <Icon name="check" size={14} strokeWidth={3.6} className="text-white" />}
                </span>
                <span>
                  <span className="font-display block text-base font-extrabold">{MODES[m].name}</span>
                  <span className="block text-sm font-bold text-ink-soft">{MODES[m].text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
          <h3 className="font-display text-lg font-extrabold">Impostori</h3>
          {room.maxImpostors < room.impostorLimit && (
            <span className="text-sm font-bold text-ink-soft">
              con {room.players.length} giocatori al massimo {room.maxImpostors}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Quanti impostori">
          {Array.from({ length: room.impostorLimit }, (_, i) => i + 1).map((n) => {
            const on = impostorCount === n;
            return (
              <Button
                key={n}
                size="md"
                tone={on ? "teal" : "white"}
                role="radio"
                aria-checked={on}
                disabled={n > room.maxImpostors && !on}
                className="!text-lg"
                onClick={() => !on && run(g.setSettings({ impostorCount: n }))}
              >
                {n}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-display px-1 text-lg font-extrabold">Categorie</h3>
        <div className="flex flex-wrap gap-2">
          {room.categories.map((c) => {
            const on = categories.includes(c.id);
            return (
              <Button
                key={c.id}
                size="sm"
                tone={on ? "teal" : "white"}
                pressed={on}
                className="!normal-case !text-sm"
                onClick={() =>
                  run(g.setSettings({ categories: on ? categories.filter((id) => id !== c.id) : [...categories, c.id] }))
                }
              >
                {c.name}
              </Button>
            );
          })}
        </div>
        {categories.length === 0 && !room.customWordSet && (
          <p className="px-1 text-sm font-bold" style={{ color: ENTRY_EDGE }}>
            Scegli almeno una categoria, o scrivi una parola tua.
          </p>
        )}
      </div>

      <CustomWord room={room} me={me} run={run} g={g} />
    </div>
  );
  if (bare) return content;
  return (
    <Card className="!p-4">
      <h2 className="font-display mb-4 text-xl font-extrabold">Impostazioni</h2>
      {content}
    </Card>
  );
}

/** Parola scritta dall'host per il prossimo round; nella "parola simile" serve anche la seconda. */
function CustomWord({ room, me, run, g }: { room: ImpRoom; me: ImpMe | null; run: (p: Promise<Result>) => Promise<boolean>; g: Game }) {
  const saved = me?.custom ?? null;
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [similar, setSimilar] = useState("");
  const needSimilar = room.settings.mode === "similar";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(g.setCustomWord(word, similar))) setOpen(false);
  };

  if (!open) {
    return (
      <div className="flex flex-col gap-2 rounded-[20px] bg-cream-deep px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold">Parola tua</p>
            <p className="text-sm font-bold text-ink-soft">
              {saved
                ? `Prossimo round: “${saved.word}”${saved.similar ? ` / “${saved.similar}”` : ""}. Tu non sarai impostore.`
                : "Facoltativa: vale per il prossimo round, poi si torna alle categorie."}
            </p>
          </div>
          <IconButton
            icon={saved ? "edit" : "plus"}
            label={saved ? "Cambia la parola" : "Scrivi una parola"}
            onClick={() => {
              setWord(saved?.word ?? "");
              setSimilar(saved?.similar ?? "");
              setOpen(true);
            }}
          />
        </div>
        {saved && needSimilar && !saved.similar && (
          <p className="text-sm font-bold" style={{ color: ENTRY_EDGE }}>
            Nella modalità parola simile serve anche la parola per l&apos;impostore.
          </p>
        )}
        {saved && (
          <SoftButton onClick={() => run(g.setCustomWord("", ""))} className="self-start !text-sm">
            Togli la parola
          </SoftButton>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-[20px] bg-cream-deep p-4">
      <p className="font-display text-base font-extrabold">Parola tua</p>
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-extrabold text-ink-soft">Parola segreta</span>
        <input className="toy-input !bg-white" value={word} onChange={(e) => setWord(e.target.value)} maxLength={room.wordMaxLength} placeholder="Es. Spiaggia" autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between px-1 text-sm font-extrabold text-ink-soft">
          Parola dell&apos;impostore
          <span className="font-bold">{needSimilar ? "serve in questa modalità" : "solo per la parola simile"}</span>
        </span>
        <input className="toy-input !bg-white" value={similar} onChange={(e) => setSimilar(e.target.value)} maxLength={room.wordMaxLength} placeholder="Es. Piscina" autoComplete="off" />
      </label>
      <div className="flex justify-end gap-2">
        <SoftButton onClick={() => setOpen(false)}>Annulla</SoftButton>
        <Button type="submit" size="sm" tone="teal" disabled={!word.trim() || (needSimilar && !similar.trim())} className="!normal-case !text-sm">
          Salva
        </Button>
      </div>
    </form>
  );
}

function SettingsSummary({ room, hostName }: { room: ImpRoom; hostName?: string | null }) {
  const { mode, impostorCount, categories } = room.settings;
  const names = room.categories.filter((c) => categories.includes(c.id)).map((c) => c.name);
  return (
    <Card className="flex flex-col gap-3 !p-4">
      <div>
        <h2 className="font-display text-lg font-extrabold">Regole del round</h2>
        <p className="text-sm font-bold text-ink-soft">Le sceglie {hostName ?? "chi ha aperto la stanza"}.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <SummaryRow label="Modalità" value={MODES[mode].name} />
        <SummaryRow label="Impostori" value={String(Math.min(impostorCount, room.maxImpostors))} />
        <SummaryRow label="Parole" value={room.customWordSet ? "scritte dall'host" : names.join(", ") || "nessuna categoria"} />
      </div>
      <p className="text-sm font-bold text-ink-soft">{MODES[mode].text}</p>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3 rounded-2xl bg-cream-deep px-3.5 py-2.5 text-base font-bold">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right">{value}</span>
    </p>
  );
}

function StartDock({ room, isHost, hostName, onStart, label }: { room: ImpRoom; isHost: boolean; hostName?: string | null; onStart: () => void; label: string }) {
  const named = room.players.filter((p) => p.nickname).length;
  const missing = room.players.length - named;
  const noWords = room.settings.categories.length === 0 && !room.customWordSet;
  const ready = room.players.length >= room.minPlayers && missing === 0 && !noWords;
  const hint =
    room.players.length < room.minPlayers
      ? `Servono almeno ${room.minPlayers} giocatori`
      : missing > 0
        ? `${missing} ${missing === 1 ? "giocatore deve" : "giocatori devono"} ancora scegliere il nome`
        : isHost && noWords
          ? "Scegli almeno una categoria"
          : isHost
            ? "Parola e impostori nuovi a ogni round"
            : `Si parte quando lo decide ${hostName ?? "l'host"}`;
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-2">
        <p className="text-base font-extrabold leading-tight">
          {room.players.length} giocatori · {MODES[room.settings.mode].name.toLowerCase()}
          <span className="block text-sm font-bold text-ink-soft">{hint}</span>
        </p>
        <VoteDots total={room.players.length} lit={named} color="var(--green)" />
      </div>
      {isHost && (
        <Button tone="green" disabled={!ready} onClick={onStart}>
          {label}
        </Button>
      )}
    </>
  );
}

/**
 * La parola segreta: coperta finché non la tieni premuta, così chi sbircia non la vede.
 * Nella classica l'impostore vede invece "Sei l'impostore".
 */
function SecretCard({ room, me, compact }: { room: ImpRoom; me: ImpMe; compact?: boolean }) {
  const [shown, setShown] = useState(false);
  const impostor = me.isImpostor === true;
  const show = () => {
    if (!shown) buzz(15);
    setShown(true);
  };
  const hide = () => setShown(false);

  return (
    <button
      type="button"
      onPointerDown={show}
      onPointerUp={hide}
      onPointerLeave={hide}
      onPointerCancel={hide}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && show()}
      onKeyUp={hide}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={shown ? (impostor ? "Sei l'impostore" : `La tua parola: ${me.word}`) : "Tieni premuto per vedere la tua parola"}
      className={`flex w-full select-none flex-col items-center justify-center gap-2 rounded-[30px] px-5 text-center transition-transform active:scale-[0.99] ${compact ? "py-4" : "min-h-56 py-7"}`}
      style={{
        background: shown ? (impostor ? INK : "#fff") : ENTRY,
        boxShadow: `0 7px 0 ${shown && impostor ? "#000" : ENTRY_EDGE}${shown && !impostor ? `, 0 0 0 3px ${ENTRY}` : ""}`,
        color: shown && !impostor ? INK : "#fff",
        WebkitTouchCallout: "none",
      }}
    >
      {!shown ? (
        <>
          <Icon name="eye" size={compact ? 26 : 34} strokeWidth={2.8} />
          <span className={`font-display font-black leading-tight ${compact ? "text-lg" : "text-2xl"}`}>Tieni premuto</span>
          {!compact && <span className="text-base font-bold text-white/90">per vedere la tua parola, senza farla vedere agli altri</span>}
        </>
      ) : impostor ? (
        <>
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">Il tuo ruolo</span>
          <span className={`font-display font-black leading-none ${compact ? "text-3xl" : "text-[2.6rem]"}`}>Sei l&apos;impostore</span>
          {!compact && <span className="max-w-[28ch] text-base font-bold text-white/80">Non conosci la parola: ascolta gli indizi e bluffa.</span>}
        </>
      ) : (
        <>
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-ink-soft">La tua parola</span>
          <span className={`font-display break-words font-black leading-none ${compact ? "text-3xl" : "text-[2.8rem]"}`}>{me.word}</span>
          {!compact && me.wroteWord && (
            <span className="max-w-[30ch] text-sm font-bold text-ink-soft">L&apos;hai scritta tu: in questo round non sei l&apos;impostore.</span>
          )}
          {!compact && !me.wroteWord && room.settings.mode === "similar" && (
            <span className="max-w-[30ch] text-sm font-bold text-ink-soft">Attenzione: l&apos;impostore ha una parola simile e non sa di esserlo. Potresti essere tu.</span>
          )}
        </>
      )}
    </button>
  );
}

function ClueOrder({ room, meId }: { room: ImpRoom; meId: string }) {
  const order = room.round?.order ?? [];
  return (
    <Card className="flex flex-col gap-3 !p-4">
      <h2 className="font-display text-lg font-extrabold">Ordine degli indizi</h2>
      <ol className="flex flex-col gap-1.5">
        {order.map((id, i) => {
          const p = room.players.find((x) => x.id === id);
          if (!p) return null;
          const first = i === 0;
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-base font-bold"
              style={{ background: first ? "var(--yellow)" : "var(--cream-deep)" }}
            >
              <span className="font-display w-5 text-sm font-extrabold text-ink-soft">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {p.nickname}
                {id === meId && " (tu)"}
              </span>
              {first && <span className="font-display text-sm font-extrabold">inizia</span>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function VoteList({ room, me, onVote }: { room: ImpRoom; me: ImpMe; onVote: (id: string) => void }) {
  const candidates = room.players.filter((p) => p.playing && p.id !== me.playerId);
  return (
    <ul className="flex flex-col gap-2.5" role="radiogroup" aria-label="Chi è l'impostore">
      {candidates.map((p) => {
        const i = room.players.indexOf(p);
        const on = me.vote === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                sfx.press();
                buzz(12);
                if (!on) onVote(p.id);
              }}
              className="flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left transition-transform active:scale-[0.98]"
              style={{
                background: on ? ENTRY : "var(--panel)",
                color: on ? "#fff" : INK,
                boxShadow: on ? `0 5px 0 ${ENTRY_EDGE}` : "0 2px 0 rgb(29 27 34 / 0.06)",
                opacity: p.connected ? 1 : 0.6,
              }}
            >
              <Avatar name={p.nickname} index={i} size={44} ring={on ? ENTRY : undefined} />
              <span className="font-display min-w-0 flex-1 truncate text-lg font-extrabold">{p.nickname}</span>
              {p.voted && (
                <span className="text-sm font-bold" style={{ color: on ? "rgb(255 255 255 / 0.85)" : "var(--ink-soft)" }}>
                  ha votato
                </span>
              )}
              {on && <Icon name="check" size={24} strokeWidth={3.4} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GuessScreen({
  room,
  me,
  isHost,
  error,
  onLeave,
  onGuess,
  onSkip,
}: {
  room: ImpRoom;
  me: ImpMe;
  isHost: boolean;
  error: string | null;
  onLeave: () => void;
  onGuess: (w: string) => Promise<boolean>;
  onSkip: () => void;
}) {
  const [word, setWord] = useState("");
  const accusedId = room.round?.accusedId;
  const accused = room.players.find((p) => p.id === accusedId);
  const mine = accusedId === me.playerId;

  return (
    <>
      <GameHeader players={room.players} onLeave={onLeave} center={<span className="pill-dark px-4 py-2 text-sm">Ultima chance</span>} />
      <div className="flex flex-col items-center gap-2 rounded-[30px] px-5 py-6 text-center text-white" style={{ background: INK, boxShadow: "0 7px 0 #000" }}>
        <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">Scoperto!</span>
        <p className="font-display text-[2rem] font-black leading-tight">{mine ? "Ti hanno beccato" : `${accused?.nickname ?? "L'impostore"} era l'impostore`}</p>
        <p className="max-w-[30ch] text-base font-bold text-white/80">
          {mine ? "Se indovini la parola segreta vinci lo stesso." : "Ora prova a indovinare la parola: se ci riesce, vince lui."}
        </p>
      </div>
      {mine ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (word.trim()) await onGuess(word);
          }}
          className="flex flex-col gap-4"
        >
          <Card>
            <label className="flex flex-col gap-1.5">
              <span className="px-1 text-sm font-extrabold text-ink-soft">Qual era la parola?</span>
              <input className="toy-input !text-lg" value={word} onChange={(e) => setWord(e.target.value)} maxLength={room.wordMaxLength} autoFocus autoComplete="off" placeholder="Un tentativo solo" />
            </label>
          </Card>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" tone="yellow" disabled={!word.trim()}>
            Prova
          </Button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <p className="text-lg font-bold text-ink-soft">
            Sta pensando<span className="animate-blink">…</span>
          </p>
          {isHost && accused && !accused.connected && (
            <Alert tone="yellow">
              {accused.nickname} è offline.{" "}
              <button type="button" className="font-black underline" onClick={onSkip}>
                Chiudi il round
              </button>
            </Alert>
          )}
        </div>
      )}
    </>
  );
}

function ResultCard({ room }: { room: ImpRoom }) {
  const r = room.round;
  const reveal = r?.reveal;
  if (!r || !reveal) return null;
  const impostorNames = reveal.impostorIds.map((id) => nameOf(room, id));
  const plural = impostorNames.length > 1;
  const title =
    reveal.outcome === "caught"
      ? plural
        ? "Un impostore è stato scoperto!"
        : "Impostore scoperto!"
      : reveal.outcome === "guessed"
        ? "Scoperto, ma ha indovinato!"
        : r.accusedId
          ? "Avete accusato un innocente"
          : "Pareggio: nessun accusato";
  const winners = reveal.outcome === "caught" ? "Vincono gli innocenti" : plural ? "Vincono gli impostori" : "Vince l'impostore";
  const good = reveal.outcome === "caught";

  return (
    <section className="animate-pop overflow-hidden rounded-[30px] bg-white motion-reduce:animate-none" style={{ boxShadow: `0 7px 0 ${good ? "var(--green-edge)" : ENTRY_EDGE}` }}>
      <div className="flex flex-col items-center gap-1 px-5 py-5 text-center" style={{ background: good ? "var(--green)" : ENTRY, color: good ? INK : "#fff" }}>
        <span className="text-sm font-extrabold uppercase tracking-[0.18em] opacity-80">{winners}</span>
        <p className="font-display text-[1.7rem] font-black leading-tight">{title}</p>
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <SummaryRow label="Parola" value={reveal.word} />
        {reveal.similar && <SummaryRow label={plural ? "Parola degli impostori" : "Parola dell'impostore"} value={reveal.similar} />}
        <SummaryRow label={plural ? "Impostori" : "Impostore"} value={impostorNames.join(", ")} />
        {r.accusedId && !reveal.impostorIds.includes(r.accusedId) && <SummaryRow label="Accusato" value={nameOf(room, r.accusedId)} />}
        {reveal.guess && <SummaryRow label="Tentativo" value={`“${reveal.guess}”`} />}
      </div>
      <details className="group border-t-2 border-dashed border-cream-deep px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
          Chi ha votato chi
          <Icon name="down" size={20} strokeWidth={3} className="transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-base font-bold">
          {reveal.votes.map((v) => (
            <li key={v.voterId} className="flex items-center gap-2">
              <span>{nameOf(room, v.voterId)}</span>
              <Icon name="arrow" size={16} strokeWidth={3} className="text-ink-soft" />
              <span style={{ color: reveal.impostorIds.includes(v.targetId) ? "var(--green-edge)" : "inherit" }}>{nameOf(room, v.targetId)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Scoreboard({ room, meId }: { room: ImpRoom; meId: string }) {
  const points = room.round?.reveal?.points ?? {};
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <Card className="flex flex-col gap-3 !p-4">
      <h2 className="font-display text-lg font-extrabold">Classifica</h2>
      <ol className="flex flex-col gap-1.5">
        {ranked.map((p: ImpPlayer, i) => {
          const gained = points[p.id] ?? 0;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream-deep px-3.5 py-2.5 text-base font-bold">
              <span className="font-display w-5 text-sm font-extrabold text-ink-soft">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {p.nickname}
                {p.id === meId && " (tu)"}
              </span>
              {gained > 0 && (
                <span className="font-display rounded-full px-2 py-0.5 text-sm font-extrabold" style={{ background: "var(--green)", color: INK }}>
                  +{gained}
                </span>
              )}
              <span className="font-display w-8 text-right text-lg font-black tabular-nums">{p.score}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
