"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../components/button";
import { CODE_LENGTH, CodeEntry, cleanCode } from "../components/CodeEntry";
import { Icon } from "../components/Icon";
import { EntryHeader, GameHeader as SharedGameHeader, GameWordmark, NicknameField, RoomCodeCard } from "../components/Lobby";
import { Alert, Avatar, AvatarStack, Card, ConfirmButton, IconButton, MuteButton, SoftButton, VoteDots } from "../components/Toy";
import { buzz, sfx } from "../lib/feedback";
import { screenClass, shareInvite, useScreen } from "../lib/screens";
import { PAGE_COLORS } from "../lib/colors";
import { usePageColor } from "../lib/pageColor";
import { SheetsCover } from "./SheetsCover";
import { TEMPLATES } from "./templates";
import { useFunnyStories, type FsPlayer, type FsRoom, type StoryLine } from "./useFunnyStories";

type Result = { ok: boolean; error?: { message: string } };

/** Arancio della copertina: colore d'ingresso di Funny Stories (Guess Who ha il viola). */
const ENTRY = PAGE_COLORS.orange;
const ENTRY_EDGE = "#b84f12";

export default function FunnyStories() {
  const g = useFunnyStories();
  // Link di invito /funnystories?code=XXXXX: il codice arriva già scritto.
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

  // Suoni: qualcuno entra, la partita parte, il foglio arriva, le storie sono pronte.
  const playerCount = g.room?.players.length ?? 0;
  const prevCount = useRef(playerCount);
  useEffect(() => {
    if (playerCount > prevCount.current && prevCount.current > 0) sfx.join();
    prevCount.current = playerCount;
  }, [playerCount]);
  const beat = g.room ? `${g.room.phase}:${g.room.round}` : "";
  const prevBeat = useRef(beat);
  useEffect(() => {
    const was = prevBeat.current;
    prevBeat.current = beat;
    if (!was || was === beat || beat.startsWith("lobby")) return;
    if (beat.startsWith("reading")) sfx.start();
    else if (was.startsWith("lobby")) sfx.start();
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
    const msg = await shareInvite("funnystories", "Funny Stories", roomCode);
    if (msg) setFlash(msg);
  };

  const resetForm = () => {
    setEditing(false);
    setNickname("");
    setDraft(null);
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

  // Bozza delle domande dell'host: si salva con "Salva domande" o, se serve, quando fa partire la storia.
  const [draft, setDraft] = useState<string[] | null>(null);
  const questions = room ? draftInfo(room, draft) : { list: [], cleaned: [], dirty: false, valid: false };
  const saveQuestions = async () => {
    if (!(await run(g.setQuestions(questions.cleaned)))) return false;
    setDraft(null);
    return true;
  };
  const startGame = async () => {
    if (questions.dirty && !(await saveQuestions())) return;
    await run(g.start());
  };

  return (
    <div className="min-h-dvh transition-colors duration-300" style={{ background: entry ? ENTRY : "var(--cream)" }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <main key={frame.id} className={`flex flex-1 flex-col gap-5 ${screenClass(frame.phase)}`}>
          {/* ---------- CONNESSIONE ---------- */}
          {frame.id === "connect" && (
            <>
              <header className="flex h-14 items-center">
                <Wordmark />
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
                <Wordmark />
                <MuteButton on="violet" />
              </header>

              {frame.data.notice && <Alert tone="yellow">{frame.data.notice}</Alert>}

              <div className="rounded-[36px] bg-white/25 p-2">
                <div className="card overflow-hidden !rounded-[30px]">
                  <SheetsCover />
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
                    Rispondi alla domanda senza vedere cosa c&apos;è già scritto, poi passa il foglio. Alla fine chi ha aperto la stanza legge le storie.
                  </p>
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
              <GameHeader room={room} onLeave={leave} onShare={() => share(room.code)} />

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

              {/* L'host resta in lobby per dettare il codice: sceglie il nome qui */}
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
                <QuestionEditor room={room} draft={draft} setDraft={setDraft} onSave={() => void saveQuestions()} />
              ) : (
                <Card className="flex flex-col gap-3 !p-4">
                  <div>
                    <h2 className="font-display text-lg font-extrabold">Le domande</h2>
                    <p className="text-sm font-bold text-ink-soft">Le sceglie {host?.nickname ?? "chi ha aperto la stanza"}. Su ogni foglio, una risposta per domanda.</p>
                  </div>
                  <QuestionList questions={room.questions} />
                </Card>
              )}

              {frame.data.error && <Alert>{frame.data.error}</Alert>}

              <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 p-3 pt-4">
                <LobbyDock
                  room={room}
                  isHost={isHost}
                  hostName={host?.nickname}
                  questionCount={questions.list.length}
                  questionsValid={questions.valid}
                  onStart={startGame}
                />
              </div>
            </>
          )}

          {/* ---------- SCRITTURA ---------- */}
          {room && frame.id === "writing" && (
            <Writing
              room={room}
              meId={me?.playerId}
              answered={Boolean(me?.answered)}
              isHost={isHost}
              error={frame.data.error}
              onLeave={leave}
              onAnswer={(text) => run(g.answer(text))}
              onSkip={() => run(g.skipMissing())}
              onStop={() => run(g.resetGame())}
            />
          )}

          {/* ---------- LETTURA ---------- */}
          {room && frame.id === "reading" && (
            <Reading
              room={room}
              stories={me?.stories ?? null}
              isHost={isHost}
              hostName={host?.nickname}
              error={frame.data.error}
              onLeave={leave}
              onShow={(i) => run(g.showStory(i))}
              onReset={() => run(g.resetGame())}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- Pezzi delle schermate ----------

const Wordmark = () => <GameWordmark title="funny stories" />;

function GameHeader({ room, ...rest }: { room: FsRoom; onLeave: () => void; onShare?: () => void; center?: React.ReactNode }) {
  return <SharedGameHeader players={room.players} {...rest} />;
}

/** Righe giocatore: gettone, nome, corona per l'host, stato del turno durante la scrittura. */
function Players({
  room,
  meId,
  isHost,
  onKick,
  onEditMe,
}: {
  room: FsRoom;
  meId?: string;
  isHost: boolean;
  onKick?: (id: string) => void;
  onEditMe?: () => void;
}) {
  const writing = room.phase === "writing";
  return (
    <ul className="flex flex-col gap-2.5">
      {room.players.map((p, i) => {
        const mine = p.id === meId;
        const status = !p.connected ? "offline" : writing ? (p.answered ? "passato" : "scrive…") : p.nickname ? null : "sceglie il nome";
        return (
          <li key={p.id} className="card flex items-center gap-3 !rounded-[24px] px-3 py-2.5" style={{ opacity: p.connected ? 1 : 0.6 }}>
            <Avatar name={p.nickname} index={i} size={42} />
            <div className="min-w-0 flex-1">
              <p className="font-display flex items-center gap-1.5 truncate text-base font-extrabold leading-tight">
                <span className="truncate">{p.nickname ?? "Senza nome"}</span>
                {p.id === room.hostId && <Icon name="crown" size={16} strokeWidth={2.6} className="text-yellow-edge shrink-0" />}
              </p>
              {status && <p className="text-sm font-bold text-ink-soft">{status}</p>}
            </div>
            {mine && <span className="pill-dark px-2.5 py-1 text-xs">TU</span>}
            {writing && p.answered && (
              <span className="flex size-8 items-center justify-center rounded-full" style={{ background: "var(--green)" }}>
                <Icon name="check" size={18} strokeWidth={3.4} />
              </span>
            )}
            {room.phase === "lobby" && mine && p.nickname && onEditMe && <IconButton icon="edit" label="Cambia nome" onClick={onEditMe} />}
            {room.phase === "lobby" && isHost && !mine && onKick && (
              <ConfirmButton icon="close" ariaLabel={`Espelli ${p.nickname ?? "giocatore"}`} confirmLabel="Via?" onConfirm={() => onKick(p.id)} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function QuestionList({ questions }: { questions: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {questions.map((q, i) => (
        <li key={i} className="flex items-baseline gap-3 rounded-2xl bg-cream-deep px-3.5 py-2.5 text-base font-bold">
          <span className="font-display w-5 shrink-0 text-sm font-extrabold text-ink-soft">{i + 1}</span>
          <span className="min-w-0 break-words">{q}</span>
        </li>
      ))}
    </ol>
  );
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Bozza delle domande dell'host rispetto a quelle salvate sul server. */
function draftInfo(room: FsRoom, draft: string[] | null) {
  const list = draft ?? room.questions;
  const cleaned = list.map((q) => q.trim());
  return {
    list,
    cleaned,
    dirty: draft !== null && !sameList(draft, room.questions),
    valid: cleaned.every(Boolean) && list.length >= room.questionsMin && list.length <= room.questionsMax,
  };
}

/**
 * Domande dell'host: parte da un modello, poi può riscriverle, spostarle, toglierle o aggiungerne.
 * Le modifiche restano una bozza finché non le salva (o finché non fa partire la storia).
 */
function QuestionEditor({
  room,
  draft,
  setDraft,
  onSave,
}: {
  room: FsRoom;
  draft: string[] | null;
  setDraft: (d: string[] | null) => void;
  onSave: () => void;
}) {
  const { list, dirty, valid } = draftInfo(room, draft);
  const edit = (next: string[]) => setDraft(next);
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    edit(next);
  };
  return (
    <Card className="flex flex-col gap-4 !p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold">Le domande</h2>
        <span className="font-display text-sm font-bold text-ink-soft">
          {list.length}/{room.questionsMax}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="px-1 text-sm font-extrabold text-ink-soft">Parti da un modello</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Modelli di domande">
          {TEMPLATES.map((t) => {
            const on = sameList(list, t.questions);
            return (
              <Button
                key={t.id}
                size="sm"
                tone={on ? "teal" : "white"}
                role="radio"
                aria-checked={on}
                className="!normal-case !text-sm"
                onClick={() => !on && edit([...t.questions])}
              >
                {t.name}
              </Button>
            );
          })}
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {list.map((q, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="font-display w-4 shrink-0 text-center text-sm font-extrabold text-ink-soft">{i + 1}</span>
            <input
              className="toy-input !min-h-11 min-w-0 flex-1 !rounded-[14px] !px-3 !py-2 !text-base"
              value={q}
              maxLength={room.questionMaxLength}
              onChange={(e) => edit(list.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`Domanda ${i + 1}`}
              placeholder="Nuova domanda:"
            />
            <div className="flex shrink-0">
              <SmallIcon icon="up" label={`Sposta su la domanda ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)} />
              <SmallIcon icon="down" label={`Sposta giù la domanda ${i + 1}`} disabled={i === list.length - 1} onClick={() => move(i, 1)} />
              <SmallIcon
                icon="trash"
                label={`Togli la domanda ${i + 1}`}
                disabled={list.length <= room.questionsMin}
                onClick={() => edit(list.filter((_, j) => j !== i))}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SoftButton onClick={() => list.length < room.questionsMax && edit([...list, ""])} className={list.length >= room.questionsMax ? "opacity-40" : ""}>
          <Icon name="plus" size={18} strokeWidth={3} />
          Aggiungi
        </SoftButton>
        {dirty && (
          <div className="flex items-center gap-2">
            <SoftButton onClick={() => setDraft(null)}>Annulla</SoftButton>
            <Button size="sm" tone="teal" disabled={!valid} onClick={onSave} className="!normal-case !text-sm">
              Salva domande
            </Button>
          </div>
        )}
      </div>
      {dirty && <p className="px-1 text-sm font-bold text-ink-soft">Gli altri vedranno le domande quando le salvi.</p>}
    </Card>
  );
}

function SmallIcon({ icon, label, disabled, onClick }: { icon: "up" | "down" | "trash"; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => {
        sfx.press();
        onClick();
      }}
      className="flex h-10 w-8 items-center justify-center rounded-full text-ink-soft transition-transform active:scale-90 disabled:opacity-25"
    >
      <Icon name={icon} size={icon === "trash" ? 19 : 21} strokeWidth={2.8} />
    </button>
  );
}

function LobbyDock({
  room,
  isHost,
  hostName,
  questionCount,
  questionsValid,
  onStart,
}: {
  room: FsRoom;
  isHost: boolean;
  hostName?: string | null;
  questionCount: number;
  questionsValid: boolean;
  onStart: () => void;
}) {
  const named = room.players.filter((p) => p.nickname).length;
  const missing = room.players.length - named;
  const hint =
    room.players.length < room.minPlayers
      ? `Servono almeno ${room.minPlayers} giocatori`
      : missing > 0
        ? `${missing} ${missing === 1 ? "giocatore deve" : "giocatori devono"} ancora scegliere il nome`
        : isHost && !questionsValid
          ? "Completa le domande vuote"
          : isHost
            ? "Ognuno parte con un foglio"
            : `Si parte quando lo decide ${hostName ?? "l'host"}`;
  const sheets = room.players.length;
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-2">
        <p className="text-base font-extrabold leading-tight">
          {sheets} {sheets === 1 ? "foglio" : "fogli"} · {questionCount} domande
          <span className="block text-sm font-bold text-ink-soft">{hint}</span>
        </p>
        <VoteDots total={room.players.length} lit={named} color="var(--green)" />
      </div>
      {isHost && (
        <Button tone="green" disabled={room.players.length < room.minPlayers || missing > 0 || !questionsValid} onClick={onStart}>
          Inizia la storia
        </Button>
      )}
    </>
  );
}

/** Scrittura: un foglio piegato con la domanda del turno; dopo la risposta si aspetta il giro. */
function Writing({
  room,
  meId,
  answered,
  isHost,
  error,
  onLeave,
  onAnswer,
  onSkip,
  onStop,
}: {
  room: FsRoom;
  meId?: string;
  answered: boolean;
  isHost: boolean;
  error: string | null;
  onLeave: () => void;
  onAnswer: (text: string) => Promise<boolean>;
  onSkip: () => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  // Nuovo turno, foglio nuovo: la casella si svuota (aggiornamento durante il render, niente effect).
  const [textRound, setTextRound] = useState(room.round);
  if (textRound !== room.round) {
    setTextRound(room.round);
    setText("");
  }

  const playing = room.players.filter((p) => p.playing);
  const myIndex = playing.findIndex((p) => p.id === meId);
  const nextPlayer: FsPlayer | undefined = playing.length > 1 && myIndex >= 0 ? playing[(myIndex + 1) % playing.length] : undefined;
  const waitingFor = playing.filter((p) => !p.answered);
  const offline = waitingFor.filter((p) => !p.connected);
  const total = room.questions.length;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await onAnswer(text)) buzz(20);
  };

  return (
    <>
      <GameHeader
        room={room}
        onLeave={onLeave}
        center={
          <span className="pill-dark px-4 py-2 text-sm">
            Domanda {Math.min(room.round + 1, total)} di {total}
          </span>
        }
      />

      {/* Avanzamento: un segmento per domanda */}
      <div className="flex gap-1.5" aria-hidden="true">
        {room.questions.map((_, i) => (
          <span
            key={i}
            className="h-2.5 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < room.round ? ENTRY : i === room.round ? "var(--yellow-edge)" : "var(--cream-deep)" }}
          />
        ))}
      </div>

      {!answered ? (
        <form key={room.round} onSubmit={submit} className="animate-pop flex flex-col gap-4 motion-reduce:animate-none">
          <div className="overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: `0 7px 0 ${ENTRY_EDGE}, 0 0 0 3px ${ENTRY}` }}>
            {/* La piega: quello che hanno scritto gli altri resta nascosto */}
            <div className="flex items-center gap-2 px-5 py-3" style={{ background: "var(--cream-deep)", boxShadow: "inset 0 -3px 0 #d9d6cd" }}>
              <Icon name="eyeOff" size={18} strokeWidth={2.6} className="text-ink-soft" />
              <span className="text-sm font-extrabold text-ink-soft">
                {room.round === 0 ? "Foglio nuovo: scrivi tu la prima riga" : `Piegato: ${room.round} ${room.round === 1 ? "riga nascosta" : "righe nascoste"}`}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <label htmlFor="answer" className="font-display text-[1.7rem] font-black leading-tight">
                {room.question}
              </label>
              <textarea
                id="answer"
                className="toy-input min-h-28 resize-none !text-lg leading-snug"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={room.answerMaxLength}
                placeholder="Scrivi la prima cosa che ti viene in mente"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <p className="text-right text-sm font-bold text-ink-soft tabular-nums">
                {text.length}/{room.answerMaxLength}
              </p>
            </div>
          </div>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" tone="yellow" disabled={!text.trim()}>
            Passa il foglio
            <Icon name="arrow" size={24} strokeWidth={3.2} />
          </Button>
        </form>
      ) : (
        <div className="animate-pop flex flex-col gap-4 motion-reduce:animate-none">
          <div className="flex flex-col items-center gap-2 rounded-[30px] px-5 py-6 text-center text-white" style={{ background: ENTRY, boxShadow: `0 7px 0 ${ENTRY_EDGE}` }}>
            <span className="flex size-14 items-center justify-center rounded-full bg-white/25">
              <Icon name="check" size={30} strokeWidth={3.4} />
            </span>
            <p className="font-display text-2xl font-black leading-tight">
              {room.round + 1 < total ? `Foglio passato${nextPlayer?.nickname ? ` a ${nextPlayer.nickname}` : ""}!` : "Foglio finito!"}
            </p>
            <p className="text-base font-bold text-white/90">
              {room.round + 1 < total ? "Il prossimo arriva quando hanno risposto tutti." : "Era l'ultima domanda: aspetta gli altri, poi si leggono le storie."}
            </p>
          </div>

          <Card className="flex flex-col gap-3 !p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-extrabold leading-tight">
                {room.answeredCount} su {room.playingCount} hanno risposto
                {waitingFor.length > 0 && (
                  <span className="block text-sm font-bold text-ink-soft">
                    {waitingFor.length === 1 ? "Manca" : "Mancano"} {waitingFor.map((p) => p.nickname).join(", ")}
                  </span>
                )}
              </p>
              <VoteDots total={room.playingCount} lit={room.answeredCount} color="var(--green)" />
            </div>
          </Card>
        </div>
      )}

      {isHost && offline.length > 0 && (
        <Alert tone="yellow">
          {offline.map((p) => p.nickname).join(", ")} {offline.length === 1 ? "è" : "sono"} offline.{" "}
          <button type="button" className="font-black underline" onClick={onSkip}>
            Salta questo turno
          </button>
        </Alert>
      )}

      <section className="mt-auto flex flex-col gap-3">
        <Players room={room} meId={meId} isHost={isHost} />
        {isHost && (
          <div className="flex justify-center">
            <ConfirmButton icon="close" confirmLabel="Interrompo?" onConfirm={onStop}>
              Interrompi partita
            </ConfirmButton>
          </div>
        )}
      </section>
    </>
  );
}

/** Lettura: l'host sfoglia le storie una alla volta, gli altri vedono a che punto è. */
function Reading({
  room,
  stories,
  isHost,
  hostName,
  error,
  onLeave,
  onShow,
  onReset,
}: {
  room: FsRoom;
  stories: StoryLine[][] | null;
  isHost: boolean;
  hostName?: string | null;
  error: string | null;
  onLeave: () => void;
  onShow: (i: number) => void;
  onReset: () => void;
}) {
  const i = room.storyIndex;
  const n = room.storyCount;
  const story = stories?.[i];

  return (
    <>
      <GameHeader
        room={room}
        onLeave={onLeave}
        center={
          <span className="pill-dark px-4 py-2 text-sm">
            Storia {i + 1} di {n}
          </span>
        }
      />

      {isHost && story ? (
        <>
          <article key={i} className="animate-pop overflow-hidden rounded-[30px] bg-white motion-reduce:animate-none" style={{ boxShadow: `0 7px 0 ${ENTRY_EDGE}, 0 0 0 3px ${ENTRY}` }}>
            <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: ENTRY }}>
              <span className="font-display text-base font-extrabold">Foglio {i + 1}</span>
              <span className="text-sm font-bold text-white/90">Leggilo ad alta voce</span>
            </div>
            <ol className="flex flex-col divide-y-2 divide-dashed divide-cream-deep px-5">
              {story.map((line, j) => (
                <li key={j} className="py-3.5">
                  <p className="text-sm font-extrabold text-ink-soft">{line.question}</p>
                  {line.answer ? (
                    <p className="font-display mt-0.5 text-xl font-extrabold leading-snug break-words">{line.answer}</p>
                  ) : (
                    <p className="mt-0.5 text-lg font-bold italic text-ink-soft">(riga saltata)</p>
                  )}
                </li>
              ))}
            </ol>
          </article>

          {error && <Alert>{error}</Alert>}

          <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 p-3">
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button tone="white" disabled={i === 0} onClick={() => onShow(i - 1)} aria-label="Storia precedente" className="!px-5">
                <Icon name="back" size={24} strokeWidth={3.2} />
              </Button>
              {i < n - 1 ? (
                <Button tone="yellow" onClick={() => onShow(i + 1)}>
                  Avanti
                  <Icon name="next" size={24} strokeWidth={3.2} />
                </Button>
              ) : (
                <Button tone="green" onClick={onReset}>
                  Nuova partita
                </Button>
              )}
            </div>
            {i < n - 1 && (
              <div className="flex justify-center">
                <ConfirmButton icon="reread" confirmLabel="Nuova partita?" onConfirm={onReset}>
                  Nuova partita
                </ConfirmButton>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <div className="relative">
            <span className="float block h-40 w-32 rounded-[18px] bg-white" style={{ boxShadow: `0 8px 0 ${ENTRY_EDGE}, 0 0 0 3px ${ENTRY}`, ["--r" as string]: "-6deg" }}>
              <span className="absolute inset-x-0 top-0 h-8 rounded-t-[18px]" style={{ background: "var(--cream-deep)" }} />
              <span className="font-display absolute inset-0 flex items-center justify-center pt-6 text-5xl font-black" style={{ color: ENTRY }}>
                {i + 1}
              </span>
            </span>
          </div>
          <div>
            <p className="font-display text-[1.75rem] font-black leading-tight">
              Storia {i + 1} di {n}
            </p>
            <p className="mt-2 max-w-[28ch] text-lg font-bold text-ink-soft">
              Ascolta: {hostName ?? "l'host"} sta leggendo i fogli ad alta voce.
            </p>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: n }, (_, k) => (
              <span key={k} className="size-3 rounded-full" style={{ background: k <= i ? ENTRY : "var(--cream-deep)" }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
