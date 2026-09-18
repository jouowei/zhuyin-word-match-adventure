import { EnglishRoundItem, EnglishUnit, EnglishWord, WordStat } from '../types';
import { ENGLISH_UNITS, LETTER_LEVELS, RHYME_LEVEL, WORD_LEVELS } from '../english/curriculum';
import { getLetter, LETTERS } from '../english/letters';
import { hasRhymeFamilies } from '../english/families';
import { englishStatKey, reviewSchedule, todayKey } from './learningStats';
import { DailyPath, Station } from './dailyPath';

/**
 * 今日英文冒險, the English version of the daily path, following the curriculum order
 * (letters and their sounds first, then decodable short-vowel words: systematic phonics, Castles et al. 2018).
 * For English learners the meaning comes along with the sound: every new word has a picture and its Chinese.
 */

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const unique = (items: string[]) => [...new Set(items)];

export const ALL_ENGLISH_WORDS: EnglishWord[] = (() => {
  const seen = new Set<string>();
  return ENGLISH_UNITS.flatMap(u => u.words || []).filter(w => (seen.has(w.word) ? false : (seen.add(w.word), true)));
})();

export const findEnglishWord = (word: string, units: EnglishUnit[] = []) =>
  [...units.flatMap(u => u.words || []), ...ALL_ENGLISH_WORDS].find(w => w.word.toLowerCase() === word.toLowerCase());

const itemsOf = (unit: EnglishUnit) => (unit.kind === 'letters' ? unit.letters || [] : (unit.words || []).map(w => w.word));
const keyOf = (kind: 'letters' | 'words') => (text: string) => englishStatKey({ kind: kind === 'letters' ? 'letter' : 'word', text });

/** Letters with the same sound (c and k) can't be told apart by their keyword's first sound. */
const sameSound = (a: string, b: string) => getLetter(a)?.sound === getLetter(b)?.sound;

/** A unit made of the path's items, in the path's order; the games take items from the front. */
export const pathUnit = (station: Station, base: EnglishUnit, id: string): EnglishUnit => {
  if (station.englishKind === 'letters') {
    return { ...base, id, kind: 'letters', letters: station.words, words: undefined };
  }
  const words = station.words.map(w => findEnglishWord(w, [base])).filter((w): w is EnglishWord => !!w);
  return { ...base, id, kind: 'words', words, letters: undefined };
};

export const englishSentenceWords = (unit: EnglishUnit, words: string[]) => {
  const text = ` ${(unit.sentences || []).join(' ').toLowerCase().replace(/[^a-z\s-]/g, ' ')} `;
  return unique(words).filter(w => text.includes(` ${w.toLowerCase()} `) || text.includes(` ${w.toLowerCase()}s `));
};

export const buildEnglishDailyPath = (options: {
  stats: Record<string, WordStat> | undefined;
  points: number;
  now?: number;
}): DailyPath => {
  const { stats } = options;
  const now = options.now ?? Date.now();
  const schedule = reviewSchedule(stats, now);
  const rank = (key: string) => schedule.dueRank(key);

  // The unit to learn: the first one in the curriculum that still has something new
  const unit = ENGLISH_UNITS.find(u => itemsOf(u).some(item => schedule.isNew(keyOf(u.kind)(item)))) || ENGLISH_UNITS[ENGLISH_UNITS.length - 1];
  const unitKey = keyOf(unit.kind);
  const unitItems = itemsOf(unit);
  const fresh = unitItems.filter(item => schedule.isNew(unitKey(item)));
  const dueInUnit = unitItems.filter(item => rank(unitKey(item)) !== undefined);
  const knownInUnit = shuffle(unitItems.filter(item => !schedule.isNew(unitKey(item)) && rank(unitKey(item)) === undefined));

  // Warm-up: whichever kind has more waiting for review, across all units
  const dueOf = (kind: 'letters' | 'words', all: string[]) =>
    all.filter(item => rank(keyOf(kind)(item)) !== undefined).sort((a, b) => rank(keyOf(kind)(a))! - rank(keyOf(kind)(b))!);
  const knownOf = (kind: 'letters' | 'words', all: string[]) =>
    shuffle(all.filter(item => !schedule.isNew(keyOf(kind)(item)) && rank(keyOf(kind)(item)) === undefined));
  const allLetters = LETTERS.map(l => l.lower);
  const allWords = ALL_ENGLISH_WORDS.map(w => w.word);
  const dueLetters = dueOf('letters', allLetters);
  const dueWords = dueOf('words', allWords);
  const warmupKind: 'letters' | 'words' = dueWords.length > dueLetters.length ? 'words' : 'letters';
  const warmupCandidates = warmupKind === 'letters'
    ? unique([...dueLetters, ...knownOf('letters', allLetters)])
    : unique([...dueWords, ...knownOf('words', allWords)]);
  const warmup: string[] = [];
  for (const item of warmupCandidates) {
    if (warmup.length >= 4) break;
    // Listening for the first sound: c (cat) and k (kite) sound the same
    if (warmupKind === 'letters' && warmup.some(other => sameSound(other, item))) continue;
    warmup.push(item);
  }

  const wanted = dueLetters.length + dueWords.length >= 8 ? 1 : 2;
  const newItems = fresh.slice(0, wanted);
  const practiced = unique([...newItems, ...dueInUnit, ...knownInUnit, ...shuffle(unitItems)]);
  const hasSentences = unit.kind === 'words' && (unit.sentences || []).length > 0;
  const stations: Station[] = [];
  const kind = unit.kind;

  if (hasSentences && englishSentenceWords(unit, newItems).length) {
    stations.push({ kind: 'story', emoji: '📖', title: '聽句子', words: englishSentenceWords(unit, newItems), focus: [], options: [], englishKind: kind });
  }
  if (warmup.length >= 3) {
    stations.push({ kind: 'warmup', emoji: '🔁', title: '暖身複習', words: warmup, focus: warmup, options: [2], englishKind: warmupKind });
  }
  if (newItems.length) {
    stations.push({ kind: 'learn', emoji: '🌱', title: '認識新朋友', words: newItems, focus: newItems, options: [], englishKind: kind });
  }
  stations.push({ kind: 'practice', emoji: '🎯', title: '練習時間', words: practiced, focus: newItems, options: [1, 2], englishKind: kind });
  const challenge = kind === 'letters' ? [3, 4] : [3, hasRhymeFamilies(unit) ? 5 : 4];
  stations.push({ kind: 'challenge', emoji: '⛰️', title: '挑戰時間', words: practiced, focus: newItems, options: challenge, englishKind: kind });
  if (hasSentences) {
    const findable = englishSentenceWords(unit, [...newItems, ...dueInUnit, ...knownInUnit, ...unitItems]).slice(0, 3);
    if (findable.length) stations.push({ kind: 'find', emoji: '🔍', title: '句子尋寶', words: findable, focus: findable, options: [], englishKind: kind });
  }
  stations.push({ kind: 'summary', emoji: '🏆', title: '今天的成果', words: [], focus: [], options: [] });

  return {
    date: todayKey(now),
    language: 'en',
    unitId: unit.id,
    gameMode: 'word',
    label: `英文：${unit.title}`,
    stations,
    current: 0,
    newItems,
    masteredToday: [],
    startPoints: options.points,
  };
};

/** Words whose pictures mean nearly the same thing (👒 hat and 🧢 cap) make a poor first choice. */
const SIMILAR_PICTURES = [['hat', 'cap'], ['pan', 'pot'], ['cup', 'mug'], ['bin', 'can'], ['net', 'web'], ['boy', 'kid'], ['mom', 'grandma'], ['dad', 'grandpa']];
const similarPictures = (a: string, b: string) => SIMILAR_PICTURES.some(pair => pair.includes(a) && pair.includes(b));

/** Letters that look alike (b d p q) or sound alike should not be the partner in a first supported try. */
const LOOK_ALIKE: Record<string, string> = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'nw', n: 'mhu', u: 'nv', w: 'mv', v: 'uw', i: 'lj', l: 'i', j: 'i', h: 'n' };

export interface EnglishLearnCard {
  item: EnglishRoundItem;
  partner: EnglishRoundItem;
}

const letterItem = (letter: string, id: string): EnglishRoundItem | null => {
  const info = getLetter(letter);
  return info ? { id, kind: 'letter', text: info.lower, keyword: info.keyword, emoji: info.emoji, zh: info.zh, matched: false } : null;
};

const wordItem = (word: EnglishWord, id: string): EnglishRoundItem =>
  ({ id, kind: 'word', text: word.word, keyword: word.word, emoji: word.emoji, zh: word.zh, matched: false });

/** New items with an easy-to-tell-apart partner, preferably one the child already knows. */
export const buildEnglishLearnCards = (options: {
  kind: 'letters' | 'words';
  newItems: string[];
  candidates: string[]; // Known first
  units?: EnglishUnit[];
}): EnglishLearnCard[] => {
  const stamp = Date.now();
  const cards: EnglishLearnCard[] = [];
  options.newItems.forEach((text, index) => {
    const others = unique(options.candidates).filter(c => c !== text && !options.newItems.includes(c));
    if (options.kind === 'letters') {
      const item = letterItem(text, `enlearn-${stamp}-${index}`);
      const partnerLetter = [...shuffle(others.slice(0, 6)), ...others.slice(6)]
        .find(c => !(LOOK_ALIKE[text] || '').includes(c) && !(LOOK_ALIKE[c] || '').includes(text) && !sameSound(c, text));
      const partner = partnerLetter ? letterItem(partnerLetter, `enlearn-${stamp}-${index}-p`) : null;
      if (item && partner) cards.push({ item, partner });
      return;
    }
    const word = findEnglishWord(text, options.units);
    const partnerWord = [...shuffle(others.slice(0, 6)), ...others.slice(6)]
      .map(c => findEnglishWord(c, options.units))
      .find(w => !!w && w.word[0] !== text[0] && w.word.slice(-2) !== text.slice(-2) && w.emoji !== word?.emoji && !similarPictures(w.word, text));
    if (word && partnerWord) cards.push({ item: wordItem(word, `enlearn-${stamp}-${index}`), partner: wordItem(partnerWord, `enlearn-${stamp}-${index}-p`) });
  });
  return cards;
};

/** 認識新朋友 at an English path station: partners the child already knows come first. */
export const englishStationLearnCards = (station: Station, unit: EnglishUnit, stats: Record<string, WordStat> | undefined) => {
  const kind = station.englishKind || unit.kind;
  const all = kind === 'letters' ? LETTERS.map(l => l.lower) : ALL_ENGLISH_WORDS.map(w => w.word);
  const known = all.filter(text => (stats?.[keyOf(kind)(text)]?.box ?? 0) >= 1);
  return buildEnglishLearnCards({ kind, newItems: station.words, candidates: [...known, ...itemsOf({ ...unit, kind }), ...all], units: [unit] });
};

/** How an English level is shown as a choice on the adventure map. */
export const englishLevelInfo = (kind: EnglishUnit['kind'], level: number) => {
  const levels = kind === 'letters' ? LETTER_LEVELS : [...WORD_LEVELS, RHYME_LEVEL];
  const info = levels.find(l => l.level === level) || levels[0];
  return { emoji: info.emoji, title: info.title, desc: info.desc, instruction: info.instruction };
};
