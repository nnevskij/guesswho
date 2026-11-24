const SERVER_PORT = 3001;

/**
 * In produzione usa NEXT_PUBLIC_SERVER_URL (es. il dominio Railway).
 * Senza la variabile, si collega allo stesso host da cui è aperta la pagina sulla porta 3001:
 * da `localhost` sul tuo computer, da `192.168.x.x` sul telefono di un amico in rete locale.
 */
export function serverUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${SERVER_PORT}`;
}

/** Ogni gioco ha il suo namespace Socket.IO sul server: stanze ed eventi separati. */
export const gameSocketUrl = (game: string) => `${serverUrl()}/${game}`;

/** Token di sessione salvato per gioco, così due giochi aperti non si pestano i piedi. */
export const tokenStore = (game: string) => {
  const key = `${game}:token`;
  return {
    read: () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (t: string | null) => {
      try {
        if (t) localStorage.setItem(key, t);
        else localStorage.removeItem(key);
      } catch {}
    },
  };
};
