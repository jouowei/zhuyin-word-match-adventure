import { UserProfile, WordStat } from '../types';
import { getZhuyinSymbol } from '../zhuyin/symbols';
import { getWordReading } from './moedict';
import { reviewSchedule, skillTotal, statKey, todayKey } from './learningStats';
import { wordsInText } from './lessonText';

/**
 * 今日冒險: a short session planned from what the child knows (about ten minutes).
 * Warm-up review → meet new items with support (I do, we do) → practise them → a harder activity → today's results.
 * With a lesson it starts and ends in the lesson text: hear it whole, then find the words back in it.
 * The child picks one of two activities at the practice stations.
 */

export type StationKind = 'story' | 'warmup' | 'learn' | 'practice' | 'challenge' | 'find' | 'summary';

export interface StationResult {
  onOwn: number; // Answered without help
  total: number;
}

export interface Station {
  kind: StationKind;
  emoji: string;
  title: string;
  words: string[];   // Items for the round, most important first (the rest of the pool follows, for filling up)
  focus: string[];   // New and due items the round should contain
  options: number[]; // Game levels to choose from (empty for learn and summary)
  chosen?: number;
  result?: StationResult;
  englishKind?: 'letters' | 'words'; // English: what the station's items are
}

export interface DailyPath {
  date: string;
  language?: 'en';     // English path (Chinese when missing)
  unitId?: string;     // English: the unit being learned
  gameMode: 'word' | 'zhuyin';
  label: string;        // 注音符號 / lesson title / 自由練習
  stations: Station[];
  current: number;
  newItems: string[];
  masteredToday: string[];
  startPoints: number;
  gift?: boolean;       // Finishing this path gave today's free gacha spin
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const unique = (items: string[]) => [...new Set(items)];

/** Fewer answers on own than this in the last round makes the next one smaller. */
const STRUGGLING_RATE = 0.6;
/** Zhuyin spelling needs enough known symbols to be fair. */
const SYMBOLS_BEFORE_SPELLING = 10;

export const stationIntro = (station: Station, index: number, english = false): string => {
  const number = `第${'一二三四五六七八'[index] || index + 1}站`;
  const text = english ? '句子' : '課文';
  switch (station.kind) {
    case 'story': return `${number}，聽${text}。黃色的是今天的新朋友。按出發！`;
    case 'find': return `${number}，回到${text}，找找看今天練習的字。按出發！`;
    case 'warmup': return `${number}，暖身複習，先想想之前學過的。按出發！`;
    case 'learn': return `${number}，認識新朋友。按出發！`;
    case 'practice': return `${number}，練習時間。選一個你想玩的遊戲。`;
    case 'challenge': return `${number}，挑戰時間。選一個你想玩的遊戲。`;
    default: return '';
  }
};

export const buildDailyPath = async (options: {
  gameMode: 'word' | 'zhuyin';
  label: string;
  pool: string[]; // In teaching order (zhuyin: ㄅㄆㄇㄈ…; words: lesson order)
  stats: Record<string, WordStat> | undefined;
  points: number;
  lessonContent?: string; // Lesson mode: the text for the story and find stations
  now?: number;
}): Promise<DailyPath> => {
  const { gameMode, pool, stats } = options;
  const now = options.now ?? Date.now();
  const keyOf = (item: string) => statKey(gameMode, item);
  const schedule = reviewSchedule(stats, now);
  const rank = (item: string) => schedule.dueRank(keyOf(item));

  const due = pool.filter(item => rank(item) !== undefined).sort((a, b) => rank(a)! - rank(b)!);
  const fresh = pool.filter(item => schedule.isNew(keyOf(item)));
  const known = shuffle(pool.filter(item => !schedule.isNew(keyOf(item)) && rank(item) === undefined));

  // Two new items a day; one when a lot is waiting for review
  const wanted = due.length >= 8 ? 1 : 2;
  const newItems: string[] = [];
  const exampleZhuyin = new Map<string, string>();
  for (const item of fresh) {
    if (newItems.length >= wanted) break;
    if (gameMode === 'zhuyin') {
      // New symbols must work together in a picture round: 跑步 contains ㄅ, so ㄅ and ㄆ wait for different days
      const example = getZhuyinSymbol(item)?.example;
      if (example && !exampleZhuyin.has(item)) exampleZhuyin.set(item, (await getWordReading(example)).zhuyin);
      const clash = newItems.some(other => (exampleZhuyin.get(item) || '').includes(other) || (exampleZhuyin.get(other) || '').includes(item));
      if (clash) continue;
    }
    newItems.push(item);
  }

  const rest = (priority: string[]) => unique([...priority, ...shuffle(pool)]);
  const stations: Station[] = [];
  const content = options.lessonContent?.trim();

  if (content) {
    stations.push({ kind: 'story', emoji: '📖', title: '聽課文', words: wordsInText(content, newItems), focus: [], options: [] });
  }

  const warmup = unique([...due, ...known]).slice(0, 4);
  if (warmup.length >= 3) {
    stations.push({ kind: 'warmup', emoji: '🔁', title: '暖身複習', words: rest(warmup), focus: due.slice(0, 4), options: [2] });
  }

  if (newItems.length) {
    stations.push({ kind: 'learn', emoji: '🌱', title: '認識新朋友', words: newItems, focus: newItems, options: [] });
  }

  const practiced = unique([...newItems, ...due, ...known]);
  stations.push({ kind: 'practice', emoji: '🎯', title: '練習時間', words: rest(practiced), focus: unique([...newItems, ...due]).slice(0, 4), options: [1, 2] });

  // Alternate the sound games by day so both get practised
  const dayNumber = Math.floor(now / 86400000);
  const soundGame = dayNumber % 2 === 0 ? 5 : 6;
  let challenge: number[];
  if (gameMode === 'zhuyin') {
    const knownSymbols = pool.filter(item => (stats?.[keyOf(item)]?.box ?? 0) >= 1).length;
    challenge = [3, knownSymbols >= SYMBOLS_BEFORE_SPELLING ? soundGame : 4];
  } else {
    const hasSingleCharacters = pool.some(word => [...word].length === 1);
    challenge = [hasSingleCharacters ? 3 : 4, soundGame];
  }
  stations.push({ kind: 'challenge', emoji: '⛰️', title: '挑戰時間', words: rest(practiced), focus: unique([...newItems, ...due]).slice(0, 3), options: challenge });

  if (content) {
    // Today's and practised words first, filled up with other lesson words; longer words first within each
    const byLength = (words: string[]) => [...words].sort((a, b) => [...b].length - [...a].length);
    const findable = unique([
      ...byLength(wordsInText(content, unique([...newItems, ...due, ...known]))),
      ...byLength(wordsInText(content, pool)),
    ]).slice(0, 3);
    if (findable.length) stations.push({ kind: 'find', emoji: '🔍', title: '課文尋寶', words: findable, focus: findable, options: [] });
  }

  stations.push({ kind: 'summary', emoji: '🏆', title: '今天的成果', words: [], focus: [], options: [] });

  return {
    date: todayKey(now),
    gameMode,
    label: options.label,
    stations,
    current: 0,
    newItems,
    masteredToday: [],
    startPoints: options.points,
  };
};

/**
 * Round size adapts to how the last round went, aiming for mostly-successful practice (Rosenshine 2012):
 * after a hard round the next one has fewer items. Writing and speaking rounds are kept short.
 */
export const roundSizeFor = (path: DailyPath, level: number): number => {
  const previous = [...path.stations.slice(0, path.current)].reverse().find(s => s.kind !== 'learn' && (s.result?.total ?? 0) > 0)?.result;
  const struggling = !!previous && previous.total > 0 && previous.onOwn / previous.total < STRUGGLING_RATE;
  if (level === 3 || level === 4) return struggling ? 2 : 3;
  return struggling ? 3 : 4;
};

export const pathTotals = (path: DailyPath): StationResult =>
  path.stations
    .filter(s => s.kind !== 'learn' && s.kind !== 'story' && s.result)
    .reduce((sum, s) => ({ onOwn: sum.onOwn + s.result!.onOwn, total: sum.total + s.result!.total }), { onOwn: 0, total: 0 });

/** The level the child picked at the current station. */
export const chooseLevel = (path: DailyPath, level: number): DailyPath => ({
  ...path,
  stations: path.stations.map((s, i) => (i === path.current ? { ...s, chosen: level } : s)),
});

/** Today's path, not finished yet: coming back to it continues where the child left off. */
export const unfinishedToday = (path: DailyPath | null, now = Date.now()): path is DailyPath =>
  !!path && path.date === todayKey(now) && path.stations[path.current]?.kind !== 'summary';

/**
 * A station is done: its result is kept and the path moves on. Reaching the summary marks today's adventure as done,
 * and the first adventure finished each day gives a free gacha spin, a reward the child sees today.
 */
export const completeStation = (
  path: DailyPath, result: StationResult, user: Pick<UserProfile, 'freeSpins' | 'lastFreeSpinDate'> | null,
): { path: DailyPath; userChanges?: Partial<UserProfile> } => {
  const stations = path.stations.map((s, i) => (i === path.current ? { ...s, result } : s));
  const next: DailyPath = { ...path, stations, current: path.current + 1 };
  if (next.stations[next.current]?.kind !== 'summary' || !user) return { path: next };
  const gift = user.lastFreeSpinDate !== next.date;
  if (gift) next.gift = true;
  return {
    path: next,
    userChanges: {
      ...(next.language === 'en' ? { lastEnglishPath: next.date } : { lastDailyPath: next.date }),
      ...(gift ? { freeSpins: (user.freeSpins || 0) + 1, lastFreeSpinDate: next.date } : {}),
    },
  };
};

/** Fewer than this many tone answers on own: the 媽麻馬罵 comparison stays open. */
export const TONE_SUPPORT_UNTIL = 8;
export const toneSupportNeeded = (stats: Record<string, WordStat> | undefined) => skillTotal(stats, 'tone') < TONE_SUPPORT_UNTIL;

/** Beginners spell two-symbol syllables first. */
export const SHORT_SYLLABLES_UNTIL = 6;
export const maxSymbolsFor = (stats: Record<string, WordStat> | undefined) =>
  skillTotal(stats, 'spell') < SHORT_SYLLABLES_UNTIL ? 2 : undefined;
