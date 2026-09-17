/**
 * The parent password guards 家長專區 and 實體任務兌換. It is set on first use and kept on this device only,
 * as a salted SHA-256 hash so it can't be read back from storage.
 * This keeps young children out; it is not real security (everything runs in the browser).
 */

const STORAGE_KEY = 'zhuyin_parent_lock';
export const MIN_PASSWORD_LENGTH = 4;

interface ParentLock {
  salt: string;
  hash: string;
  hint?: string;
}

/** Plain-JS SHA-256 (crypto.subtle is missing when the app is opened over http from another device). */
export const sha256 = (message: string): string => {
  const K: number[] = [];
  const H: number[] = [];
  const fraction = (x: number) => ((x - Math.floor(x)) * 0x100000000) | 0;
  for (let n = 2, found = 0; found < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (!prime) continue;
    if (found < 8) H[found] = fraction(Math.sqrt(n));
    K[found++] = fraction(Math.cbrt(n));
  }

  const bytes = new TextEncoder().encode(message);
  const size = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(size);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(size - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(size - 4, bytes.length * 8);

  const rotate = (x: number, s: number) => (x >>> s) | (x << (32 - s));
  const w = new Int32Array(64);
  for (let offset = 0; offset < size; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
};

const readLock = (): ParentLock | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const lock = saved ? JSON.parse(saved) : null;
    return lock?.hash && lock?.salt ? lock : null;
  } catch {
    return null;
  }
};

export const hasParentPassword = () => readLock() !== null;

export const parentPasswordHint = () => readLock()?.hint || '';

/** Returns false when the device won't store it (e.g. private browsing). */
export const setParentPassword = (password: string, hint = ''): boolean => {
  const salt = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const lock: ParentLock = { salt, hash: sha256(salt + password), ...(hint.trim() ? { hint: hint.trim() } : {}) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lock));
    return readLock()?.hash === lock.hash;
  } catch {
    return false;
  }
};

export const checkParentPassword = (password: string) => {
  const lock = readLock();
  return !!lock && sha256(lock.salt + password) === lock.hash;
};

export const clearParentPassword = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored
  }
};

/**
 * Resets a forgotten password: 「密碼」 typed with the zhuyin keyboard layout but without the zhuyin input method
 * (ㄇ a, ㄧ u, ˋ 4, ㄇ a, ㄚ 8, ˇ 3). The screen only hints 「密碼」, which a parent can work out and a young child can't.
 */
const RESET_CODE = 'au4a83';
export const RESET_CODE_HINT = '密碼';

export const isResetCode = (input: string) => input.trim().toLowerCase() === RESET_CODE;
