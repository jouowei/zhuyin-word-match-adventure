import { WordItem } from '../types';
import { getWordReading } from './moedict';
import { ZHUYIN_SYMBOLS, TONES } from '../zhuyin/symbols';
import { WORD_EMOJI } from '../utils/wordPicture';
import { orderForReview, ReviewSchedule } from './learningStats';
import type { AudioStep } from '../utils/chineseAudio';

export type Tone = 1 | 2 | 3 | 4 | 5; // 5 = 輕聲

export interface ToneOption {
  tone: Tone;
  name: string;
  mark: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { tone: 1, name: '一聲', mark: 'ˉ' },
  { tone: 2, name: '二聲', mark: 'ˊ' },
  { tone: 3, name: '三聲', mark: 'ˇ' },
  { tone: 4, name: '四聲', mark: 'ˋ' },
  { tone: 5, name: '輕聲', mark: '˙' },
];

const TONE_BY_MARK: Record<string, Tone> = { 'ˊ': 2, 'ˇ': 3, 'ˋ': 4 };

export const isZhuyinSymbol = (ch: string) => /[ㄅ-ㄩ]/.test(ch);

export const parseSyllable = (syllable: string): { symbols: string[]; tone: Tone } => {
  const chars = [...syllable];
  const markTone = chars.map(ch => TONE_BY_MARK[ch]).find(Boolean);
  return {
    symbols: chars.filter(isZhuyinSymbol),
    tone: syllable.startsWith('˙') ? 5 : markTone || 1,
  };
};

export const formatSyllable = (symbols: string[], tone: Tone) =>
  tone === 5 ? `˙${symbols.join('')}` : symbols.join('') + ({ 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' } as Record<number, string>)[tone];

/** Sounds first graders often mix up — used as wrong tiles in the spelling game. */
export const CONFUSABLE: Record<string, string[]> = {
  ㄅ: ['ㄆ', 'ㄉ'], ㄆ: ['ㄅ', 'ㄊ'], ㄇ: ['ㄋ', 'ㄈ'], ㄈ: ['ㄏ', 'ㄇ'], ㄉ: ['ㄊ', 'ㄅ'], ㄊ: ['ㄉ', 'ㄆ'],
  ㄋ: ['ㄌ', 'ㄇ'], ㄌ: ['ㄋ', 'ㄖ'], ㄍ: ['ㄎ', 'ㄉ'], ㄎ: ['ㄍ', 'ㄏ'], ㄏ: ['ㄈ', 'ㄎ'], ㄐ: ['ㄑ', 'ㄓ'],
  ㄑ: ['ㄐ', 'ㄔ'], ㄒ: ['ㄕ', 'ㄙ'], ㄓ: ['ㄗ', 'ㄐ'], ㄔ: ['ㄘ', 'ㄑ'], ㄕ: ['ㄙ', 'ㄒ'], ㄖ: ['ㄌ', 'ㄙ'],
  ㄗ: ['ㄓ', 'ㄘ'], ㄘ: ['ㄔ', 'ㄗ'], ㄙ: ['ㄕ', 'ㄒ'], ㄧ: ['ㄩ', 'ㄨ'], ㄨ: ['ㄛ', 'ㄩ'], ㄩ: ['ㄧ', 'ㄨ'],
  ㄚ: ['ㄛ', 'ㄜ'], ㄛ: ['ㄡ', 'ㄜ'], ㄜ: ['ㄝ', 'ㄛ'], ㄝ: ['ㄟ', 'ㄜ'], ㄞ: ['ㄟ', 'ㄢ'], ㄟ: ['ㄞ', 'ㄝ'],
  ㄠ: ['ㄡ', 'ㄛ'], ㄡ: ['ㄠ', 'ㄛ'], ㄢ: ['ㄤ', 'ㄣ'], ㄣ: ['ㄥ', 'ㄢ'], ㄤ: ['ㄢ', 'ㄥ'], ㄥ: ['ㄣ', 'ㄤ'], ㄦ: ['ㄜ', 'ㄡ'],
};

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

/** Symbol tiles for one syllable: the right ones plus look-alike sounds. */
export const buildSymbolTiles = (symbols: string[]): string[] => {
  const tiles = new Set(symbols);
  const target = Math.max(5, symbols.length + 3);
  for (const s of shuffle(symbols)) {
    for (const partner of CONFUSABLE[s] || []) {
      if (tiles.size < target) tiles.add(partner);
    }
  }
  const group = ZHUYIN_SYMBOLS.map(s => s.symbol);
  for (const s of shuffle(group)) {
    if (tiles.size >= target) break;
    tiles.add(s);
  }
  return shuffle([...tiles]);
};

let toneReferences: Promise<AudioStep[]> | null = null;

/** 媽 麻 馬 罵 嗎 recordings, indexed by tone - 1, for comparing tones (數調). */
export const getToneReferences = (): Promise<AudioStep[]> => {
  if (!toneReferences) {
    toneReferences = Promise.all(TONES.map(t => getWordReading(t.example, { override: t.exampleZhuyin })))
      .then(readings => readings.map((reading, i) => ({ url: reading.audioUrl, text: TONES[i].example })));
  }
  return toneReferences;
};

/**
 * Spoken help for choosing a tone. HELP_RETRY compares the wrong choice with its example,
 * HELP_NARROW counts through 媽 麻 馬 罵, HELP_SHOW names the answer.
 */
export const toneHelpSteps = (
  level: number, chosen: Tone, answer: Tone, references: AudioStep[], word: AudioStep, withNeutral = false,
): AudioStep[] => {
  const name = (tone: Tone) => TONE_OPTIONS[tone - 1].name;
  const reference = (tone: Tone) => references[tone - 1] || { text: TONES[tone - 1].example };
  if (level <= 1) return [{ text: `你選的是${name(chosen)}，像` }, reference(chosen), { text: '再聽一次' }, word];
  if (level === 2) {
    const tones: Tone[] = withNeutral ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
    return [{ text: '我們來比比看' }, ...tones.map(reference), { text: '是哪一個呢' }, word];
  }
  return [{ text: `是${name(answer)}，像` }, reference(answer), { text: '點點看' }];
};

const EXTRA_EMOJI: Record<string, string> = { 媽: '👩', 馬: '🐴', 罵: '😠' };
const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);

interface SyllableCandidate {
  key: string;        // For the mistake notebook
  character: string;
  zhuyin: string;
  emoji: string;
  audioUrl?: string;
}

const zhuyinModeCandidates = async (forTone: boolean): Promise<SyllableCandidate[]> => {
  const words: { word: string; override?: string; emoji: string }[] = [
    ...ZHUYIN_SYMBOLS.filter(s => s.example.length === 1).map(s => ({ word: s.example, emoji: s.exampleEmoji })),
    ...TONES.filter(t => forTone || t.mark !== '˙').map(t => ({ word: t.example, override: t.exampleZhuyin, emoji: EXTRA_EMOJI[t.example] || '' })),
  ];
  const readings = await Promise.all(words.map(w => getWordReading(w.word, { override: w.override })));
  return words.map((w, i) => ({
    key: `w:${w.word}`,
    character: w.word,
    zhuyin: readings[i].zhuyin,
    emoji: w.emoji,
    audioUrl: readings[i].audioUrl,
  })).filter(c => c.zhuyin && !c.zhuyin.includes(' '));
};

/** Every character of the lesson words, read the way it is read inside the word (樂 in 快樂 → ㄌㄜˋ). */
const wordModeCandidates = async (vocabulary: string[], overrides: Record<string, string>): Promise<SyllableCandidate[]> => {
  const words = Array.from(new Set(vocabulary));
  const readings = await Promise.all(words.map(word => getWordReading(word, { context: words, override: overrides[word] })));
  const seen = new Set<string>();
  const pairs: { character: string; zhuyin: string }[] = [];
  readings.forEach((reading, i) => {
    const chars = [...words[i]].filter(isHan);
    const syllables = reading.zhuyin.split(' ').filter(Boolean);
    if (chars.length !== syllables.length) return;
    chars.forEach((character, j) => {
      const zhuyin = syllables[j];
      if (zhuyin.startsWith('˙')) return; // Neutral tone depends on the word around it
      const key = `${character}|${zhuyin}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ character, zhuyin });
    });
  });
  const charReadings = await Promise.all(pairs.map(p => getWordReading(p.character, { override: p.zhuyin })));
  return pairs.map((p, i) => ({
    key: `w:${p.character}`,
    character: p.character,
    zhuyin: p.zhuyin,
    emoji: WORD_EMOJI[p.character] || '',
    audioUrl: charReadings[i].audioUrl,
  }));
};

/**
 * Four single-syllable items for the spelling (拼音) or tone (聲調) game.
 * Items due for review come first (up to two), then ones not practised yet.
 */
export const buildSyllableRound = async (options: {
  gameMode: 'word' | 'zhuyin';
  vocabulary: string[];
  zhuyinOverrides?: Record<string, string>;
  schedule?: ReviewSchedule;
  forTone: boolean;
  count?: number;
  focus?: string[];    // 今日冒險: symbols or words to practise first
  maxSymbols?: number; // Beginners spell two-symbol syllables (ㄇㄚ) before ones with a medial (ㄍㄨㄚ)
}): Promise<WordItem[] | null> => {
  const count = options.count ?? 4;
  let candidates = options.gameMode === 'zhuyin'
    ? await zhuyinModeCandidates(options.forTone)
    : await wordModeCandidates(options.vocabulary, options.zhuyinOverrides || {});

  if (options.forTone) {
    // Tones should be heard from real recordings whenever there are enough of them
    const recorded = candidates.filter(c => c.audioUrl);
    if (new Set(recorded.map(c => c.character)).size >= 4) candidates = recorded;
  }

  const byCharacter = new Map<string, SyllableCandidate>();
  for (const c of shuffle(candidates)) if (!byCharacter.has(c.character)) byCharacter.set(c.character, c);
  let unique = [...byCharacter.values()];
  if (options.maxSymbols) {
    const short = unique.filter(c => parseSyllable(c.zhuyin).symbols.length <= options.maxSymbols!);
    if (short.length >= count) unique = short;
  }
  if (unique.length < count) return null;

  let ordered = orderForReview(unique, c => c.key, options.schedule);
  const focus = options.focus || [];
  if (focus.length) {
    const inFocus = (c: SyllableCandidate) => focus.some(f => (options.gameMode === 'zhuyin' ? c.zhuyin.includes(f) : f.includes(c.character)));
    ordered = [...ordered.filter(inFocus), ...ordered.filter(c => !inFocus(c))];
  }
  const picked = ordered.slice(0, count);

  const stamp = Date.now();
  return shuffle(picked).map((c, i) => ({
    id: `syllable-${stamp}-${i}`,
    character: c.character,
    zhuyin: c.zhuyin,
    emoji: c.emoji,
    audioUrl: c.audioUrl,
    matched: false,
  }));
};
