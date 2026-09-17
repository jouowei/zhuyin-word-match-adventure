import { WordItem } from '../types';
import { getZhuyinSymbol } from '../zhuyin/symbols';
import { WORD_EMOJI } from '../utils/wordPicture';
import { getWordReading } from './moedict';
import { CONFUSABLE } from './zhuyinPractice';

export interface LearnCard {
  item: WordItem;     // The new item
  partner: WordItem;  // A clearly different item for the first supported try
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const symbolItem = async (symbol: string, id: string): Promise<WordItem | null> => {
  const info = getZhuyinSymbol(symbol);
  if (!info) return null;
  const reading = await getWordReading(info.example);
  return {
    id,
    character: symbol,
    zhuyin: reading.zhuyin,
    emoji: info.exampleEmoji,
    audioUrl: info.audio,
    exampleWord: info.example,
    exampleAudioUrl: reading.audioUrl,
    matched: false,
  };
};

const wordItem = async (word: string, id: string, context: string[], overrides: Record<string, string>, images: Record<string, string>): Promise<WordItem> => {
  const reading = await getWordReading(word, { context, override: overrides[word] });
  return {
    id,
    character: word,
    zhuyin: reading.zhuyin,
    emoji: WORD_EMOJI[word] || '',
    imageUrl: images[word],
    audioUrl: reading.audioUrl,
    matched: false,
  };
};

/** Symbols whose picture words contain each other's sound can't be told apart by picture (ㄇ 貓 ㄇㄠ and ㄠ). */
export const symbolsClash = (a: WordItem, b: WordItem) => a.zhuyin.includes(b.character) || b.zhuyin.includes(a.character);

/**
 * Cards for 認識新朋友. Each new item gets a partner that is easy to tell apart:
 * not a look-alike sound, preferably something the child already knows.
 */
export const buildLearnCards = async (options: {
  gameMode: 'word' | 'zhuyin';
  newItems: string[];
  candidates: string[]; // Known items first
  context?: string[];
  zhuyinOverrides?: Record<string, string>;
  customImages?: Record<string, string>;
}): Promise<LearnCard[]> => {
  const { gameMode, newItems, candidates } = options;
  const stamp = Date.now();
  const make = (text: string, id: string) => gameMode === 'zhuyin'
    ? symbolItem(text, id)
    : wordItem(text, id, options.context || [], options.zhuyinOverrides || {}, options.customImages || {});

  const cards: LearnCard[] = [];
  for (const [index, text] of newItems.entries()) {
    const item = await make(text, `learn-${stamp}-${index}`);
    if (!item) continue;
    const others = candidates.filter(c => c !== text && !newItems.includes(c));
    const suitable = gameMode === 'zhuyin'
      ? others.filter(c => !(CONFUSABLE[text] || []).includes(c) && !(CONFUSABLE[c] || []).includes(text))
      : others.filter(c => ![...c].some(ch => text.includes(ch)));
    // Known items come first in `candidates`; take a few of them at random so the partner varies
    const pool = [...shuffle(suitable.slice(0, 6)), ...suitable.slice(6)];
    for (const [k, candidate] of pool.entries()) {
      const partner = await make(candidate, `learn-${stamp}-${index}-p${k}`);
      if (partner && !(gameMode === 'zhuyin' && symbolsClash(item, partner))) {
        cards.push({ item, partner });
        break;
      }
    }
  }
  return cards;
};
