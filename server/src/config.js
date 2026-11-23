const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** "*" (o vuoto) = qualunque origine; altrimenti lista separata da virgole. */
const parseOrigins = (value) => {
  if (!value || value.trim() === '*') return '*';
  return value.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
};

export function loadConfig(env = process.env) {
  return {
    port: int(env.PORT, 3001),
    host: env.HOST || '0.0.0.0',
    corsOrigins: parseOrigins(env.CLIENT_ORIGIN),
    minPlayers: Math.max(1, int(env.MIN_PLAYERS, 2)),
    maxPlayers: Math.max(1, int(env.MAX_PLAYERS, 20)),
    // Quanto aspettare un giocatore disconnesso (es. telefono in standby) prima di rimuoverlo.
    disconnectGraceMs: int(env.DISCONNECT_GRACE_MS, 5 * 60_000),
    // Durata massima di una stanza, per sicurezza contro stanze "zombie".
    roomTtlMs: int(env.ROOM_TTL_MS, 12 * 60 * 60_000),
    roomCodeLength: Math.max(4, int(env.ROOM_CODE_LENGTH, 5)),
    nicknameMaxLength: 24,
    characterMaxLength: 60,
    // Lista personaggi: conto alla rovescia prima di mostrarla, poi resta visibile per questo tempo.
    revealCountdownMs: int(env.REVEAL_COUNTDOWN_MS, 5_000),
    revealDurationMs: int(env.REVEAL_DURATION_MS, 30_000),
    rateLimit: { windowMs: 1000, max: int(env.RATE_LIMIT_PER_SEC, 20) },
  };
}
