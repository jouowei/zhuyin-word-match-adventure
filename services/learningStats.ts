import { Skill, WordStat } from '../types';

export const ZHUYIN_PROGRESS_KEY = 'zhuyin';
export const FREE_PRACTICE_PROGRESS_KEY = 'free';

/**
 * Spaced review with Leitner boxes (spacing effect: Cepeda et al. 2008).
 * Answering without help moves an item up one box, at most once per day, and it comes back after a longer gap.
 * Any mistake sends it back to box 0.
 */
export const REVIEW_GAP_DAYS = [0, 1, 3, 7, 14, 30]; // Index = box
export const MAX_BOX = REVIEW_GAP_DAYS.length - 1;
/** Still remembered after gaps of one and three days: counts as 學會. */
export const MASTERED_BOX = 3;

type Stats = Record<string, WordStat> | undefined;

export const startOfDay = (time: number) => {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

const addDays = (time: number, days: number) => {
  const day = new Date(time);
  day.setDate(day.getDate() + days);
  return day.getTime();
};

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/** Zhuyin symbols and lesson characters are tracked separately: `zy:ㄇ`, `w:快樂`. */
export const statKey = (gameMode: 'word' | 'zhuyin', character: string) =>
  gameMode === 'zhuyin' && /^[ㄅ-ㄩ]$/.test(character) ? `zy:${character}` : `w:${character}`;

/** English letters and words: `el:b`, `ew:cat`. */
export const englishStatKey = (item: { kind: 'letter' | 'word'; text: string }) =>
  `${item.kind === 'letter' ? 'el' : 'ew'}:${item.text.toLowerCase()}`;

export const recordMistake = (stats: Stats, key: string, now = Date.now()): Record<string, WordStat> => {
  const previous = stats?.[key];
  return {
    ...stats,
    [key]: { ...previous, wrong: (previous?.wrong || 0) + 1, last: now, seen: now, box: 0, due: startOfDay(now) },
  };
};

/** A new item was shown and tried with support: it now comes back for practice today. */
export const recordIntroduced = (stats: Stats, key: string, now = Date.now()): Record<string, WordStat> => {
  if (stats?.[key]) return { ...stats, [key]: { ...stats[key], seen: now } };
  return { ...stats, [key]: { wrong: 0, box: 0, due: startOfDay(now), seen: now } };
};

export const recordSkill = (stats: Stats, key: string, skill: Skill): Record<string, WordStat> => {
  const previous = stats?.[key] || { wrong: 0 };
  const skills = { ...previous.skills, [skill]: (previous.skills?.[skill] || 0) + 1 };
  return { ...stats, [key]: { ...previous, skills } };
};

export const skillCount = (stats: Stats, key: string, skill: Skill) => stats?.[key]?.skills?.[skill] || 0;

export const skillTotal = (stats: Stats, skill: Skill) =>
  Object.values(stats || {}).reduce((sum, stat) => sum + (stat.skills?.[skill] || 0), 0);

export const todayKey = (now = Date.now()) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface SuccessResult {
  stats: Record<string, WordStat>;
  mastered: boolean; // Reached 學會 for the first time
}

export const recordSuccess = (stats: Stats, key: string, independent: boolean, now = Date.now()): SuccessResult => {
  const previous = stats?.[key];
  const box = previous?.box ?? 0;
  // With help, or practised again before it is due: nothing new was shown about remembering it
  if (!independent || (previous && box > 0 && now < (previous.due ?? 0))) {
    return { stats: previous ? { ...stats, [key]: { ...previous, seen: now } } : { ...stats }, mastered: false };
  }
  const nextBox = Math.min(MAX_BOX, box + 1);
  const mastered = nextBox >= MASTERED_BOX && !previous?.mastered;
  return {
    stats: {
      ...stats,
      [key]: {
        wrong: 0,
        ...previous,
        box: nextBox,
        due: addDays(startOfDay(now), REVIEW_GAP_DAYS[nextBox]),
        seen: now,
        ...(mastered ? { mastered: now } : {}),
      },
    },
    mastered,
  };
};

export interface ReviewSchedule {
  /** Lower comes first; undefined when the item is not due. */
  dueRank: (key: string) => number | undefined;
  isNew: (key: string) => boolean;
}

export const reviewSchedule = (stats: Stats, now = Date.now()): ReviewSchedule => ({
  dueRank: key => {
    const stat = stats?.[key];
    if (!stat || (stat.due ?? 0) > now) return undefined;
    // Recent mistakes first, then the longest-waiting reviews
    return ((stat.box ?? 0) === 0 ? 0 : 1e15) + (stat.due ?? 0);
  },
  isNew: key => !stats?.[key],
});

/**
 * Order for picking a round: up to `maxReview` due items (most urgent first), then items never practised,
 * then the other due items, then everything else.
 */
export const orderForReview = <T,>(pool: T[], keyOf: (item: T) => string, schedule?: ReviewSchedule, maxReview = 2): T[] => {
  const shuffled = shuffle(pool);
  if (!schedule) return shuffled;
  const rank = (item: T) => schedule.dueRank(keyOf(item));
  const due = shuffled.filter(item => rank(item) !== undefined).sort((a, b) => rank(a)! - rank(b)!);
  const fresh = shuffled.filter(item => schedule.isNew(keyOf(item)));
  const known = shuffled.filter(item => rank(item) === undefined && !schedule.isNew(keyOf(item)));
  return [...due.slice(0, maxReview), ...fresh, ...due.slice(maxReview), ...known];
};

export const pickWithReview = <T,>(pool: T[], count: number, keyOf: (item: T) => string, schedule?: ReviewSchedule, maxReview = 2): T[] =>
  shuffle(orderForReview(pool, keyOf, schedule, maxReview).slice(0, count));

/** Lesson words due for review today, most urgent first. */
export const reviewWords = (stats: Stats, now = Date.now()): string[] => {
  const schedule = reviewSchedule(stats, now);
  return Object.keys(stats || {})
    .filter(key => key.startsWith('w:') && schedule.dueRank(key) !== undefined)
    .sort((a, b) => schedule.dueRank(a)! - schedule.dueRank(b)!)
    .map(key => key.slice(2));
};

export const CHINESE_PREFIXES = ['w:', 'zy:'];
export const ENGLISH_PREFIXES = ['el:', 'ew:'];
export const isEnglishKey = (key: string) => ENGLISH_PREFIXES.some(p => key.startsWith(p));

/** Items learned (學會); Chinese and English together unless prefixes are given. */
export const masteredCount = (stats: Stats, prefixes = [...CHINESE_PREFIXES, ...ENGLISH_PREFIXES]) =>
  Object.entries(stats || {}).filter(([key, stat]) => stat.mastered && prefixes.some(p => key.startsWith(p))).length;

export const addCompletedLevel = (progress: Record<string, number[]> | undefined, key: string, level: number) => {
  const levels = progress?.[key] || [];
  if (levels.includes(level)) return progress || {};
  return { ...progress, [key]: [...levels, level].sort((a, b) => a - b) };
};
