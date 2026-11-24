"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGame } from "./GameProvider";
import { Button } from "../components/button";
import { CODE_LENGTH, CodeEntry, cleanCode } from "../components/CodeEntry";
import { Icon } from "../components/Icon";
import { MysteryField } from "../components/MysteryField";
import { PlayerList } from "./components/PlayerList";
import { RevealOverlay } from "./components/RevealOverlay";
import { Alert, Avatar, AvatarStack, Card, ConfirmButton, IconButton, MuteButton, SoftButton, VoteDots } from "../components/Toy";
import { buzz, sfx } from "../lib/feedback";
import { screenClass, shareInvite, usePresence, useScreen } from "../lib/screens";
import { PAGE_COLORS } from "../lib/colors";
import { usePageColor } from "../lib/pageColor";

type Result = { ok: boolean; error?: { message: string } };

export default function Home() {
  const g = useGame();
  // Link di invito /guesswho?code=XXXXX: il codice arriva già scritto, basta premere Entra.
  const params = useSearchParams();
  const [code, setCode] = useState(() => cleanCode(params.get("code") ?? ""));
  const [nickname, setNickname] = useState("");
  const [char, setChar] = useState("");
  const [decoy, setDecoy] = useState("");
  const [editing, setEditing] = useState(false);
  const [showChar, setShowChar] = useState(false);
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

  // Suono quando entra qualcuno (quelli della lista personaggi li gestisce RevealOverlay).
  const playerCount = g.room?.players.length ?? 0;
  const prevCount = useRef(playerCount);
  useEffect(() => {
    if (playerCount > prevCount.current && prevCount.current > 0) sfx.join();
    prevCount.current = playerCount;
  }, [playerCount]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  // Chi entra in una stanza altrui passa prima dall'iscrizione; l'host resta in lobby per dettare il codice.
  // Modificare il profilo riapre l'iscrizione per tutti.
  const needsSignup = Boolean(
    g.room?.phase === "lobby" && (editing || (!(g.me?.nickname && g.me?.character) && !g.isHost)),
  );
  const screenId = !g.connected ? "connect" : !g.room ? "home" : needsSignup ? "signup" : g.room.phase;
  const screenData = useMemo(
    () => ({ notice: g.notice, error, room: g.room, me: g.me, isHost: g.isHost }),
    [g.notice, error, g.room, g.me, g.isHost],
  );
  const frame = useScreen(screenId, screenData);
  const overlay = usePresence(g.room && frame.id !== "home" ? g.shown : null);
  const room = frame.data.room;
  const me = frame.data.me;
  const myIndex = room?.players.findIndex((p) => p.id === me?.playerId) ?? -1;
  const myPlayer = myIndex >= 0 ? room?.players[myIndex] : undefined;
  const profileDone = Boolean(me?.nickname && me?.character);
  const showForm = !profileDone || editing;

  // Ingresso su viola pieno, partita su crema. Anche lo sfondo della pagina segue (rimbalzo dello scroll su iOS).
  const violet = frame.id === "connect" || frame.id === "home" || frame.id === "signup";
  usePageColor(violet ? PAGE_COLORS.violet : PAGE_COLORS.cream);

  const share = async (roomCode: string) => {
    const msg = await shareInvite("guesswho", "Guess Who", roomCode);
    if (msg) setFlash(msg);
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(g.setProfile(nickname, char, decoy))) {
      setEditing(false);
      setShowChar(false);
    }
  };

  const startEdit = () => {
    setNickname(me?.nickname ?? "");
    setChar(me?.character ?? "");
    setDecoy(me?.decoy ?? "");
    setEditing(true);
  };

  // Uscendo o cambiando stanza si riparte da un profilo vuoto.
  const resetProfileForm = () => {
    setEditing(false);
    setShowChar(false);
    setNickname("");
    setChar("");
    setDecoy("");
  };
  const join = async () => {
    if (code.length !== CODE_LENGTH) return;
    resetProfileForm();
    await run(g.joinRoom(code));
  };
  const create = async () => {
    resetProfileForm();
    await run(g.createRoom());
  };
  const leave = () => {
    resetProfileForm();
    void g.leaveRoom();
  };

  const profileFields = (
    <ProfileFields
      nickname={nickname}
      character={char}
      decoy={decoy}
      onNickname={setNickname}
      onCharacter={setChar}
      onDecoy={setDecoy}
      decoyCount={room?.decoyCount ?? 0}
    />
  );

  return (
    <div className="min-h-dvh transition-colors duration-300" style={{ background: violet ? "var(--violet)" : "var(--cream)" }}>
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
                <p className="max-w-[28ch] text-lg font-bold text-white/80">
                  Sto raggiungendo il server. Se ci mette troppo, controlla la rete.
                </p>
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

              {/* Scheda principale con la cornice chiara, come le schede gioco */}
              <div className="rounded-[36px] bg-white/25 p-2">
                <div className="card overflow-hidden !rounded-[30px]">
                  <MysteryField />
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
                  <p className="mt-1 text-base font-bold text-white/85">
                    Ognuno scrive un personaggio segreto, poi tutti premono pronto.
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
              <header className="grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="justify-self-start">
                  <ConfirmButton
                    icon="exit"
                    on="violet"
                    ariaLabel="Esci dalla stanza"
                    confirmLabel="Esco?"
                    onConfirm={leave}
                    className="!size-12 !min-h-12"
                  />
                </div>
                <span className="font-display rounded-full bg-white/20 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white">
                  Stanza {room.code}
                </span>
                <div className="justify-self-end">
                  <MuteButton on="violet" />
                </div>
              </header>

              <div className="flex flex-col items-center gap-3 pt-2 text-center text-white">
                <AvatarStack players={room.players} max={5} ring="var(--violet)" />
                <h1 className="font-display text-[1.75rem] font-black leading-tight">{editing ? "Modifica profilo" : "Chi sei?"}</h1>
                <p className="max-w-[30ch] text-base font-bold text-white/85">
                  {editing
                    ? "Cambiare profilo annulla il tuo “sono pronto”."
                    : room.players.length > 1
                      ? `${room.players.length - 1} ${room.players.length === 2 ? "giocatore ti aspetta" : "giocatori ti aspettano"} nella lobby.`
                      : "Scegli nome e personaggio per entrare nella lobby."}
                </p>
              </div>

              <form onSubmit={saveProfile} className="flex flex-1 flex-col gap-5">
                <div className="rounded-[36px] bg-white/25 p-2">
                  <div className="card !rounded-[30px] p-5">{profileFields}</div>
                </div>

                {frame.data.error && <Alert>{frame.data.error}</Alert>}

                <div className="mt-auto flex flex-col items-center gap-3">
                  <Button type="submit" tone="yellow" disabled={!nickname.trim() || !char.trim()}>
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

          {/* ---------- LOBBY & PARTITA ---------- */}
          {room && (frame.id === "lobby" || frame.id === "playing") && (
            <>
              <header className="grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="justify-self-start">
                  <ConfirmButton icon="exit" ariaLabel="Esci dalla stanza" confirmLabel="Esco?" onConfirm={leave} className="!size-12 !min-h-12" />
                </div>
                <AvatarStack players={room.players} max={4} />
                <div className="flex gap-1.5 justify-self-end">
                  <IconButton icon="share" label="Condividi il codice" onClick={() => share(room.code)} />
                  <MuteButton />
                </div>
              </header>

              {/* Codice stanza: scheda menta con la pastiglia in alto, come "Giorno 7" */}
              <button
                type="button"
                onClick={() => share(room.code)}
                className="relative flex flex-col items-center gap-1 rounded-[30px] border-[2.5px] bg-mint px-5 pb-5 pt-4 text-center transition-transform active:scale-[0.98]"
                style={{ borderColor: "var(--mint-edge)" }}
                aria-label={`Codice stanza ${room.code.split("").join(" ")}, tocca per condividere`}
              >
                <span
                  className="font-display rounded-full px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white"
                  style={{ background: "var(--teal)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--teal) 55%, white)" }}
                >
                  {frame.id === "lobby" ? "Stanza" : "In gioco"}
                </span>
                <span className="font-display shadow-text mt-2 text-[3.4rem] font-black leading-none tracking-[0.04em]" style={{ color: "var(--teal-edge)" }}>
                  {room.code}
                </span>
                <span className="font-display mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--teal)" }}>
                  Tocca per condividere
                </span>
                <span className="mt-1 h-6 text-base font-bold" style={{ color: "var(--teal-edge)" }} aria-live="polite">
                  {flash ?? (frame.id === "lobby" ? "Detta il codice agli altri" : `${room.charactersCount} personaggi in gioco`)}
                </span>
              </button>

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="font-display text-xl font-extrabold">Giocatori</h2>
                  <span className="font-display text-base font-bold text-ink-soft">
                    {room.players.length}/{room.maxPlayers}
                  </span>
                </div>
                <PlayerList room={room} meId={me?.playerId} isHost={frame.data.isHost} onKick={(id) => run(g.kick(id))} />
              </section>

              {/* Profilo (solo lobby) */}
              {frame.id === "lobby" &&
                (showForm ? (
                  <Card>
                    <h2 className="font-display mb-4 text-xl font-extrabold">{profileDone ? "Modifica profilo" : "Il tuo profilo"}</h2>
                    <form onSubmit={saveProfile} className="flex flex-col gap-4">
                      {profileFields}
                      <Button type="submit" size="md" tone="teal" disabled={!nickname.trim() || !char.trim()}>
                        Salva
                      </Button>
                    </form>
                  </Card>
                ) : (
                  <Card className="flex items-center gap-3 !p-4">
                    <Avatar name={me?.nickname ?? null} index={Math.max(0, myIndex)} size={54} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-lg font-extrabold leading-tight">{me?.nickname}</p>
                      <p className="mt-0.5 truncate text-base font-bold text-ink-soft">
                        {showChar ? (
                          <span className="text-ink">{me?.character}</span>
                        ) : (
                          <span className="select-none tracking-[0.25em]">••••••</span>
                        )}
                      </p>
                      {showChar && me?.decoy && (
                        <p className="truncate text-sm font-bold text-ink-soft">Falso: {me.decoy}</p>
                      )}
                    </div>
                    <IconButton
                      icon={showChar ? "eyeOff" : "eye"}
                      label={showChar ? "Nascondi personaggio" : "Mostra personaggio"}
                      onClick={() => setShowChar((v) => !v)}
                    />
                    <IconButton icon="edit" label="Modifica profilo" onClick={startEdit} />
                  </Card>
                ))}

              {/* Nomi falsi: li sceglie l'host, gli altri vedono quanti sono */}
              {frame.id === "lobby" && (
                <Card className="flex flex-col gap-3 !p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-extrabold">Nomi falsi</h2>
                      <p className="text-sm font-bold text-ink-soft">Si mescolano ai personaggi veri per confondere le idee.</p>
                    </div>
                    {!frame.data.isHost && (
                      <span className="font-display shrink-0 rounded-full bg-cream-deep px-4 py-2 text-2xl font-black">
                        {room.decoyCount}
                      </span>
                    )}
                  </div>
                  {frame.data.isHost && (
                    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Quanti nomi falsi aggiungere">
                      {Array.from({ length: room.maxDecoys + 1 }, (_, n) => (
                        <Button
                          key={n}
                          size="md"
                          tone={room.decoyCount === n ? "teal" : "white"}
                          role="radio"
                          aria-checked={room.decoyCount === n}
                          className="!text-lg"
                          onClick={() => room.decoyCount !== n && run(g.setDecoys(n))}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {frame.id === "playing" && frame.data.isHost && (
                <div className="flex justify-center">
                  <ConfirmButton icon="reread" confirmLabel="Ricomincio?" onConfirm={() => run(g.resetGame())}>
                    Ricomincia partita
                  </ConfirmButton>
                </div>
              )}

              {frame.data.error && <Alert>{frame.data.error}</Alert>}

              {/* Pulsantiera che galleggia in basso */}
              <div className="dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 p-3 pt-4">
                {frame.id === "lobby" ? (
                  <>
                    <div className="flex items-center justify-between gap-3 px-2">
                      <p className="text-base font-extrabold leading-tight">
                        {room.readyCount} su {room.players.length} pronti
                        <span className="block text-sm font-bold text-ink-soft">
                          {!profileDone
                            ? "Salva il profilo per poterti dire pronto"
                            : room.players.length < room.minPlayers
                              ? `Servono almeno ${room.minPlayers} giocatori`
                              : myPlayer?.ready
                                ? "Tocca di nuovo per annullare"
                                : "Si parte quando sono pronti tutti"}
                        </span>
                      </p>
                      <VoteDots total={room.players.length} lit={room.readyCount} color="var(--green)" />
                    </div>
                    <Button
                      tone="green"
                      pressed={Boolean(myPlayer?.ready)}
                      disabled={!profileDone || editing}
                      onClick={() => run(g.setReady(!myPlayer?.ready))}
                    >
                      {myPlayer?.ready && <Icon name="check" size={24} strokeWidth={3.4} />}
                      {myPlayer?.ready ? "Pronto!" : "Sono pronto"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 px-2">
                      <p className="text-base font-extrabold leading-tight">
                        {room.rereadCount} su {room.players.length} vogliono rileggere
                        <span className="block text-sm font-bold text-ink-soft">
                          {myPlayer?.rereadVote ? "Tocca di nuovo per ritirare il voto" : "La lista torna solo se lo chiedono tutti"}
                        </span>
                      </p>
                      <VoteDots total={room.players.length} lit={room.rereadCount} color="var(--yellow-edge)" />
                    </div>
                    <Button
                      tone="yellow"
                      pressed={Boolean(myPlayer?.rereadVote)}
                      onClick={() => run(g.voteReread(!myPlayer?.rereadVote))}
                    >
                      <Icon name="reread" size={22} strokeWidth={3} />
                      {myPlayer?.rereadVote ? "Voto dato" : "Rileggi i nomi"}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {overlay && (
        <RevealOverlay
          key={overlay.value.receivedAt}
          show={overlay.value}
          decoys={room?.decoyCount ?? 0}
          className={screenClass(overlay.phase)}
          onDone={g.dismissCharacters}
        />
      )}
    </div>
  );
}

/** Nickname, personaggio e nome falso: usati nell'iscrizione e nella lobby dell'host. */
function ProfileFields({
  nickname,
  character,
  decoy,
  onNickname,
  onCharacter,
  onDecoy,
  decoyCount,
}: {
  nickname: string;
  character: string;
  decoy: string;
  onNickname: (v: string) => void;
  onCharacter: (v: string) => void;
  onDecoy: (v: string) => void;
  decoyCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-extrabold text-ink-soft">Nickname</span>
        <input
          className="toy-input"
          value={nickname}
          onChange={(e) => onNickname(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
          placeholder="Come ti chiamano"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-extrabold text-ink-soft">Personaggio segreto</span>
        <input
          className="toy-input"
          value={character}
          onChange={(e) => onCharacter(e.target.value)}
          maxLength={60}
          autoComplete="off"
          placeholder="Reale o inventato"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between px-1 text-sm font-extrabold text-ink-soft">
          Nome falso
          <span className="font-bold">facoltativo</span>
        </span>
        <input
          className="toy-input"
          value={decoy}
          onChange={(e) => onDecoy(e.target.value)}
          maxLength={60}
          autoComplete="off"
          placeholder="Un personaggio per depistare"
        />
        <span className="px-1 text-sm font-bold leading-snug text-ink-soft">
          {decoyCount > 0
            ? `Potrebbe finire tra i ${decoyCount} nomi falsi della lista. Se non basta, ci pensa il gioco.`
            : "In questa stanza i nomi falsi sono spenti, ma l'host può riaccenderli."}
        </span>
      </label>
    </div>
  );
}

/** Nome del gioco; la freccia riporta al catalogo di Giochi Loschi. */
function Wordmark() {
  return (
    <Link href="/" className="-ml-1.5 flex items-center gap-1 rounded-2xl pr-2 text-white" aria-label="Guess Who, torna a tutti i giochi">
      <Icon name="back" size={26} strokeWidth={3.2} className="opacity-80" />
      <h1 className="font-display text-[1.75rem] font-black lowercase tracking-tight">guess who</h1>
    </Link>
  );
}
