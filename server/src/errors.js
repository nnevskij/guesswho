/** Errore "previsto" da restituire al client tramite ack: { ok: false, error: { code, message } }. */
export class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const cleanText = (value, { field, max, min = 1 }) => {
  if (typeof value !== 'string') throw new GameError('INVALID_INPUT', `Campo "${field}" mancante`);
  const text = value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < min) throw new GameError('INVALID_INPUT', `Campo "${field}" vuoto`);
  if (text.length > max) throw new GameError('INVALID_INPUT', `Campo "${field}" troppo lungo (max ${max})`);
  return text;
};
