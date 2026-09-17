/**
 * Taiwan-standard zhuyin readings from 萌典 (moedict.tw, data from 教育部《重編國語辭典修訂本》/《國語辭典簡編本》).
 * This file is pure logic so both the browser and the data build script can use it.
 */

export interface Heteronym {
  zhuyin: string;    // e.g. 'ㄎㄨㄞˋ ㄌㄜˋ'
  audioId?: string;  // moedict audio id, when 教育部 has a recording
}

/** Returns null when the dictionary has no entry for the word. */
export type HeteronymSource = (word: string) => Promise<Heteronym[] | null>;

export interface Reading {
  word: string;
  zhuyin: string;
  audioId?: string;
  candidates: string[];  // Other valid readings parents can choose from
  source: 'override' | 'dictionary' | 'composed' | 'none';
}

export const MOEDICT_API = (word: string) => `https://www.moedict.tw/a/${encodeURIComponent(word)}.json`;
export const MOEDICT_AUDIO = (audioId: string, ext: 'ogg' | 'mp3') => `https://r2-assets.moedict.tw/audio/a/${audioId}.${ext}`;

const isHanzi = (ch: string) => /\p{Script=Han}/u.test(ch);

export const cleanZhuyin = (raw: string) =>
  raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[（(][^）)]*[）)]/g, ' ') // Notes such as （語音）（讀音）
    .split(/[，、]/)[0]
    .replace(/\s+/g, ' ')
    .trim();

export const parseMoedictEntry = (json: any): Heteronym[] => {
  const seen = new Set<string>();
  const result: Heteronym[] = [];
  for (const h of json?.h || []) {
    if (!h?.b) continue;
    const zhuyin = cleanZhuyin(String(h.b));
    if (!zhuyin || seen.has(zhuyin)) continue;
    seen.add(zhuyin);
    result.push({ zhuyin, audioId: h['='] ? String(h['=']) : undefined });
  }
  return result;
};

/**
 * Readings to prefer for common polyphones (破音字) when there is no better context.
 * Only used if the dictionary actually lists the reading.
 */
export const POLYPHONE_DEFAULTS: Record<string, string> = {
  的: '˙ㄉㄜ', 了: '˙ㄌㄜ', 著: '˙ㄓㄜ', 呢: '˙ㄋㄜ', 吧: '˙ㄅㄚ', 嗎: '˙ㄇㄚ',
  樂: 'ㄌㄜˋ', 和: 'ㄏㄜˊ', 長: 'ㄔㄤˊ', 行: 'ㄒㄧㄥˊ', 地: 'ㄉㄧˋ', 得: 'ㄉㄜˊ',
  還: 'ㄏㄞˊ', 都: 'ㄉㄡ', 為: 'ㄨㄟˋ', 覺: 'ㄐㄩㄝˊ', 看: 'ㄎㄢˋ', 子: 'ㄗˇ',
  頭: 'ㄊㄡˊ', 大: 'ㄉㄚˋ', 好: 'ㄏㄠˇ', 要: 'ㄧㄠˋ', 中: 'ㄓㄨㄥ', 重: 'ㄓㄨㄥˋ',
  種: 'ㄓㄨㄥˇ', 少: 'ㄕㄠˇ', 只: 'ㄓˇ', 車: 'ㄔㄜ', 過: 'ㄍㄨㄛˋ', 會: 'ㄏㄨㄟˋ',
  那: 'ㄋㄚˋ', 哪: 'ㄋㄚˇ', 發: 'ㄈㄚ', 分: 'ㄈㄣ', 當: 'ㄉㄤ', 空: 'ㄎㄨㄥ',
  教: 'ㄐㄧㄠ', 相: 'ㄒㄧㄤ', 肉: 'ㄖㄡˋ', 誰: 'ㄕㄟˊ', 一: 'ㄧ', 不: 'ㄅㄨˋ',
  泡泡: 'ㄆㄠˋ ㄆㄠˋ', 東西: 'ㄉㄨㄥ ˙ㄒㄧ',
};

// Suffixes read with the neutral tone when a phrase has to be pieced together character by character
const NEUTRAL_SUFFIXES: Record<string, string> = { 子: '˙ㄗ', 們: '˙ㄇㄣ' };

const syllables = (zhuyin: string) => zhuyin.split(' ').filter(Boolean);

const byZhuyinIn = (entries: Heteronym[], zhuyin?: string) => (zhuyin ? entries.find(e => e.zhuyin === zhuyin) : undefined);

const pickFromCandidates = async (
  word: string,
  entries: Heteronym[],
  source: HeteronymSource,
  context: string[],
): Promise<Heteronym> => {
  if (entries.length === 1) return entries[0];
  const byZhuyin = (z?: string) => byZhuyinIn(entries, z);

  // 1) Another lesson word shows how this character is read (樂 in 快樂 → ㄌㄜˋ)
  if (word.length === 1) {
    for (const ctx of context) {
      const index = ctx.indexOf(word);
      if (ctx === word || ctx.length < 2 || index < 0) continue;
      const ctxEntries = await source(ctx);
      if (!ctxEntries || ctxEntries.length === 0) continue;
      const ctxReading = await pickFromCandidates(ctx, ctxEntries, source, []);
      const match = byZhuyin(syllables(ctxReading.zhuyin)[index]);
      if (match) return match;
    }
  }

  // 2) Curated defaults for common polyphones
  const preferred = byZhuyin(POLYPHONE_DEFAULTS[word]);
  if (preferred) return preferred;

  // 3) Everyday words usually use the neutral-tone variant (鼻子 ㄅㄧˊ ˙ㄗ)
  if (word.length > 1) {
    const neutral = entries.find(e => e.zhuyin.includes('˙'));
    if (neutral) return neutral;
  }

  // 4) 教育部 recorded readings are the ones in the student dictionary
  return entries.find(e => e.audioId) || entries[0];
};

export const resolveReading = async (
  word: string,
  source: HeteronymSource,
  options: { context?: string[]; override?: string } = {},
): Promise<Reading> => {
  const context = options.context || [];
  const entries = await source(word);
  const candidates = entries?.map(e => e.zhuyin) || [];

  if (options.override) {
    const matched = byZhuyinIn(entries || [], options.override);
    return { word, zhuyin: options.override, audioId: matched?.audioId, candidates, source: 'override' };
  }

  if (entries && entries.length > 0) {
    const chosen = await pickFromCandidates(word, entries, source, context);
    return { word, zhuyin: chosen.zhuyin, audioId: chosen.audioId, candidates, source: 'dictionary' };
  }

  if (word.length <= 1) {
    return { word, zhuyin: '', candidates: [], source: 'none' };
  }

  // Phrase not in the dictionary (向前走): longest dictionary words first, then single characters
  const parts: string[] = [];
  let i = 0;
  while (i < word.length) {
    if (!isHanzi(word[i])) { i++; continue; }
    let consumed = 1;
    for (let j = Math.min(word.length, i + 4); j >= i + 2; j--) {
      const sub = word.slice(i, j);
      if (sub === word) continue;
      const subEntries = await source(sub);
      if (subEntries && subEntries.length > 0) {
        const chosen = await pickFromCandidates(sub, subEntries, source, context);
        parts.push(chosen.zhuyin);
        consumed = j - i;
        break;
      }
    }
    if (consumed === 1) {
      const suffix = i > 0 ? NEUTRAL_SUFFIXES[word[i]] : undefined; // 褲子 → ˙ㄗ, 我們 → ˙ㄇㄣ
      const charReading = suffix ? { zhuyin: suffix } : await resolveReading(word[i], source, { context: [word, ...context] });
      if (charReading.zhuyin) parts.push(charReading.zhuyin);
    }
    i += consumed;
  }
  const zhuyin = parts.join(' ');
  return { word, zhuyin, candidates: zhuyin ? [zhuyin] : [], source: zhuyin ? 'composed' : 'none' };
};
