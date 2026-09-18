/**
 * Did the child say it? Speech recognition writes what it hears as characters, often a different character with the
 * same sound (婆 for ㄆ, 小川 for 小船), so answers are compared by sound (pinyin without tones), not by character.
 * Children's speech is judged leniently: tones are ignored, and so are the sounds Taiwanese Mandarin speakers
 * commonly merge (ㄓ/ㄗ, ㄔ/ㄘ, ㄕ/ㄙ, ㄣ/ㄥ, ㄧㄣ/ㄧㄥ).
 */

export type ToPinyin = (text: string) => string[];

/** pinyin-pro is big, so it is loaded only when a speaking game opens. */
let pinyinLoader: Promise<ToPinyin> | null = null;
export const loadPinyin = (): Promise<ToPinyin> =>
  (pinyinLoader ??= import('pinyin-pro').then(({ pinyin }) =>
    (text: string) => pinyin(text, { toneType: 'none', type: 'array', v: true }) as string[]));

export const normalizeSyllable = (syllable: string) =>
  syllable.toLowerCase().trim()
    .replace(/ü/g, 'v')
    .replace(/^zh/, 'z').replace(/^ch/, 'c').replace(/^sh/, 's')
    .replace(/eng$/, 'en').replace(/ing$/, 'in');

/** How children say each zhuyin symbol (ㄆ is said ㄆㄛ), and the sounds recognizers write for it. */
export const ZHUYIN_SAID: Record<string, string[]> = {
  'ㄅ': ['bo', 'bu', 'be'], 'ㄆ': ['po', 'pu'], 'ㄇ': ['mo', 'mu', 'me'], 'ㄈ': ['fo', 'fu'],
  'ㄉ': ['de', 'du'], 'ㄊ': ['te', 'tu'], 'ㄋ': ['ne', 'nu', 'le'], 'ㄌ': ['le', 'lu', 'ne', 'liao'], // 了 is written for ㄌㄜ
  'ㄍ': ['ge', 'gu'], 'ㄎ': ['ke', 'ku'], 'ㄏ': ['he', 'hu'],
  'ㄐ': ['ji', 'ju'], 'ㄑ': ['qi', 'qu'], 'ㄒ': ['xi', 'xu'],
  'ㄓ': ['zhi', 'zhe'], 'ㄔ': ['chi', 'che'], 'ㄕ': ['shi', 'she'], 'ㄖ': ['ri', 're'],
  'ㄗ': ['zi', 'ze'], 'ㄘ': ['ci', 'ce'], 'ㄙ': ['si', 'se'],
  'ㄧ': ['yi'], 'ㄨ': ['wu'], 'ㄩ': ['yu'],
  'ㄚ': ['a', 'ya'], 'ㄛ': ['o', 'wo'], 'ㄜ': ['e'], 'ㄝ': ['ye', 'ei', 'e', 'ai'],
  'ㄞ': ['ai'], 'ㄟ': ['ei', 'ai'], 'ㄠ': ['ao'], 'ㄡ': ['ou'], // 欸 is written for ㄟ
  'ㄢ': ['an'], 'ㄣ': ['en', 'ng'], 'ㄤ': ['ang'], 'ㄥ': ['eng', 'ng'], 'ㄦ': ['er'], // and 嗯 for ㄣ, ㄥ
};

const latinOnly = (text: string) => /^[a-z\s]+$/i.test(text.trim());
const hanSyllables = (text: string, toPinyin: ToPinyin) =>
  toPinyin(text.replace(/[^\p{Script=Han}]/gu, '')).map(normalizeSyllable).filter(Boolean);

/** A zhuyin symbol, said on its own: any of the recognizer's guesses sounds like it. */
export const saidZhuyin = (symbol: string, transcripts: string[], toPinyin: ToPinyin): boolean => {
  const sounds = new Set((ZHUYIN_SAID[symbol] || []).map(normalizeSyllable));
  const initial = (ZHUYIN_SAID[symbol] || [])[0]?.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])/)?.[1];
  return transcripts.some(raw => {
    const transcript = raw.trim();
    if (!transcript) return false;
    if (transcript.includes(symbol)) return true;
    // Written in Latin letters: "p", "po", "Paul"
    if (latinOnly(transcript)) {
      const latin = transcript.toLowerCase().replace(/\s+/g, '');
      return [...sounds].some(s => latin.startsWith(s)) || (!!initial && latin[0] === initial[0] && latin.length <= 4);
    }
    // One short sound: the first syllables are enough (recognizers sometimes repeat or add a word)
    return hanSyllables(transcript, toPinyin).slice(0, 3).some(s => sounds.has(s));
  });
};

/** A word: its characters, or the same sounds in the same order, somewhere in what was heard. */
export const saidWord = (word: string, transcripts: string[], toPinyin: ToPinyin): boolean => {
  const target = hanSyllables(word, toPinyin);
  return transcripts.some(raw => {
    const transcript = raw.trim();
    if (!transcript) return false;
    if (transcript.includes(word) || word.includes(transcript)) return true;
    if (!target.length) return false;
    const heard = hanSyllables(transcript, toPinyin);
    for (let i = 0; i + target.length <= heard.length; i++) {
      if (target.every((s, j) => heard[i + j] === s)) return true;
    }
    return false;
  });
};
