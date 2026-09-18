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

/**
 * A sound said on its own has no words around it, so recognizers often write a neighbouring sound: ㄨ said by an adult
 * came back as 福. These count too (the listening games are where children learn to tell them apart).
 *
 * Consonants: the child's sound starts right, or with one recognizers mix up with it (ㄅ/ㄆ, ㄉ/ㄊ, ㄍ/ㄎ, ㄈ/ㄏ/ㄨ,
 * ㄋ/ㄌ, ㄐ/ㄑ/ㄒ, ㄗ/ㄘ), followed by a short vowel (他 for ㄊ, 那 for ㄋ).
 */
const CONSONANT: Record<string, string> = {
  'ㄅ': 'b', 'ㄆ': 'p', 'ㄇ': 'm', 'ㄈ': 'f', 'ㄉ': 'd', 'ㄊ': 't', 'ㄋ': 'n', 'ㄌ': 'l',
  'ㄍ': 'g', 'ㄎ': 'k', 'ㄏ': 'h', 'ㄐ': 'j', 'ㄑ': 'q', 'ㄒ': 'x',
  'ㄓ': 'z', 'ㄔ': 'c', 'ㄕ': 's', 'ㄖ': 'r', 'ㄗ': 'z', 'ㄘ': 'c', 'ㄙ': 's',
};
const MIXED_UP: Record<string, string[]> = {
  b: ['b', 'p'], p: ['p', 'b'], m: ['m'], f: ['f', 'h', 'w'],
  d: ['d', 't'], t: ['t', 'd'], n: ['n', 'l'], l: ['l', 'n'],
  g: ['g', 'k'], k: ['k', 'g', 'h'], h: ['h', 'f', 'k'],
  j: ['j', 'q', 'x'], q: ['q', 'j', 'x'], x: ['x', 'j', 'q'],
  z: ['z', 'c'], c: ['c', 'z'], s: ['s'], r: ['r', 'l'],
};
const SHORT_VOWELS = new Set(['a', 'o', 'e', 'u', 'i', 'v']);
const splitSyllable = (syllable: string) => {
  const [, initial = '', final = ''] = syllable.match(/^([bpmfdtnlgkhjqxrzcsyw]?)(.*)$/) || [];
  return { initial, final };
};
/** Vowels: the neighbouring sounds recognizers write instead (福 or 呼 for ㄨ, 喂 for ㄟ). */
export const ZHUYIN_NEAR: Record<string, string[]> = {
  'ㄧ': ['ye'], 'ㄨ': ['fu', 'hu', 'wo'], 'ㄩ': ['yue'],
  'ㄚ': ['ha', 'wa'], 'ㄛ': ['ou', 'bo'], 'ㄜ': ['he', 'er'], 'ㄝ': ['hei'],
  'ㄞ': ['ei', 'ye', 'hai'], 'ㄟ': ['hei', 'wei', 'ye'], 'ㄠ': ['ou', 'hao'], 'ㄡ': ['o', 'ao', 'you'],
  'ㄢ': ['ang', 'han'], 'ㄣ': ['hen'], 'ㄤ': ['an', 'hang'], 'ㄥ': ['hen'], 'ㄦ': ['e'],
};
/** Every sound that counts for a symbol said on its own. */
const soundsLike = (symbol: string, syllable: string) => {
  const exact = (ZHUYIN_SAID[symbol] || []).concat(ZHUYIN_NEAR[symbol] || []).map(normalizeSyllable);
  if (exact.includes(syllable)) return true;
  const consonant = CONSONANT[symbol];
  if (!consonant) return false;
  const { initial, final } = splitSyllable(syllable);
  return MIXED_UP[consonant].includes(initial) && SHORT_VOWELS.has(final);
};

const latinOnly = (text: string) => /^[a-z\s]+$/i.test(text.trim());
const hanSyllables = (text: string, toPinyin: ToPinyin) =>
  toPinyin(text.replace(/[^\p{Script=Han}]/gu, '')).map(normalizeSyllable).filter(Boolean);

/** A zhuyin symbol, said on its own: any of the recognizer's guesses sounds like it. */
export const saidZhuyin = (symbol: string, transcripts: string[], toPinyin: ToPinyin): boolean => {
  const sounds = new Set((ZHUYIN_SAID[symbol] || []).concat(ZHUYIN_NEAR[symbol] || []).map(normalizeSyllable));
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
    return hanSyllables(transcript, toPinyin).slice(0, 3).some(s => soundsLike(symbol, s));
  });
};

/** How one try at the microphone ended (utils/listenOnce.ts). */
export type SpeechOutcome =
  | { kind: 'match'; heard: string[] }
  | { kind: 'heard'; heard: string[] }
  | { kind: 'silent'; micOpened: boolean; soundHeard: boolean; error?: string }
  | { kind: 'denied'; error: string }
  | { kind: 'error'; error: string };

/** For parents, in small print under the card: what the phone made of the child's voice. */
export const describeOutcome = (outcome: SpeechOutcome): string => {
  switch (outcome.kind) {
    case 'match':
    case 'heard':
      return `手機聽到：${outcome.heard.slice(0, 3).join('、')}`;
    case 'silent': {
      const text = !outcome.micOpened ? '手機的麥克風沒有開始收音' : outcome.soundHeard ? '手機有聽到聲音，但認不出字' : '手機沒有聽到聲音';
      return outcome.error ? `${text}（${outcome.error}）` : text;
    }
    case 'denied':
      return outcome.error === 'service-not-allowed' ? '這個瀏覽器不讓網頁用語音辨識（service-not-allowed）' : '沒有麥克風權限（not-allowed）';
    case 'error':
      return outcome.error === 'unsupported' ? '這個瀏覽器沒有語音辨識' : `語音辨識出了問題（${outcome.error}）`;
  }
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
