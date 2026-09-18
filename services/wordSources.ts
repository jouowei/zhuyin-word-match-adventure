import { Lesson, WordStat } from '../types';
import { INITIAL_LESSONS, ZHUYIN_VOCABULARY } from '../constants';
import { FREE_PRACTICE_PROGRESS_KEY, reviewWords, ZHUYIN_PROGRESS_KEY } from './learningStats';
import { wordsInText } from './lessonText';

/** Which words the Chinese games draw from: the zhuyin symbols, the active lesson, every lesson, or the words due for review. */

export type ChineseMode = 'word' | 'zhuyin';

export interface ChineseStudy {
  gameMode: ChineseMode;
  activeLesson: Lesson | null; // None: free practice with every lesson's words
  lessons: Lesson[];
}

/** Saved lessons, plus built-in lessons added to the app since they were saved. */
export const withDefaultLessons = (saved: Lesson[] | null): Lesson[] => {
  if (!saved) return INITIAL_LESSONS;
  return [...saved, ...INITIAL_LESSONS.filter(lesson => !saved.some(l => l.id === lesson.id))];
};

export const lessonWords = (lessons: Lesson[]) => Array.from(new Set(lessons.flatMap(l => l.vocabulary)));

const merged = (lessons: Lesson[], field: 'customImages' | 'zhuyinOverrides') =>
  Object.assign({}, ...lessons.map(l => l[field] || {})) as Record<string, string>;

/** Pictures and zhuyin corrections parents set in the lessons being played. */
export const lessonAssets = ({ activeLesson, lessons }: Pick<ChineseStudy, 'activeLesson' | 'lessons'>) => {
  const source = activeLesson ? [activeLesson] : lessons;
  return { customImages: merged(source, 'customImages'), zhuyinOverrides: merged(source, 'zhuyinOverrides') };
};

export interface RoundSource {
  words: string[];
  customImages: Record<string, string>;
  zhuyinOverrides: Record<string, string>;
}

/** A game round picked from the level list (今日冒險 plans its own words). */
export const roundSource = (
  study: ChineseStudy & { reviewMode: boolean; stats: Record<string, WordStat> | undefined },
  random = Math.random,
): RoundSource => {
  const { gameMode, activeLesson, lessons, reviewMode, stats } = study;
  const all = lessonWords(lessons);
  const allOverrides = merged(lessons, 'zhuyinOverrides');
  if (gameMode === 'zhuyin') return { words: ZHUYIN_VOCABULARY, customImages: {}, zhuyinOverrides: allOverrides };
  if (reviewMode) {
    // 複習時間: words due for review, topped up with other lesson words when there are fewer than four
    const due = reviewWords(stats).filter(w => all.includes(w));
    const filler = all.filter(w => !due.includes(w)).sort(() => random() - 0.5);
    return {
      words: due.length >= 4 ? due : [...due, ...filler.slice(0, 4 - due.length)],
      customImages: merged(lessons, 'customImages'),
      zhuyinOverrides: allOverrides,
    };
  }
  if (activeLesson) {
    return { words: activeLesson.vocabulary, customImages: activeLesson.customImages || {}, zhuyinOverrides: activeLesson.zhuyinOverrides || {} };
  }
  return { words: all, customImages: merged(lessons, 'customImages'), zhuyinOverrides: allOverrides };
};

/** What today's 今日冒險 draws from. */
export const pathSource = ({ gameMode, activeLesson, lessons }: ChineseStudy) => {
  if (gameMode === 'zhuyin') return { pool: ZHUYIN_VOCABULARY, label: '注音符號', context: [] as string[] };
  const pool = activeLesson ? Array.from(new Set(activeLesson.vocabulary)) : lessonWords(lessons);
  return { pool, label: activeLesson ? activeLesson.title : '自由練習：所有課文的字', context: pool };
};

/** Progress stars are kept per lesson, for the zhuyin symbols, and for free practice; review rounds earn none. */
export const progressKeyFor = ({ gameMode, activeLesson }: Pick<ChineseStudy, 'gameMode' | 'activeLesson'>, reviewMode: boolean) =>
  gameMode === 'zhuyin' ? ZHUYIN_PROGRESS_KEY : reviewMode ? null : activeLesson ? activeLesson.id : FREE_PRACTICE_PROGRESS_KEY;

/** 課文尋寶 from the lesson page: up to three lesson words found in the text, longer words more likely. */
export const lessonFindWords = (lesson: Lesson, random = Math.random) =>
  wordsInText(lesson.content, lesson.vocabulary)
    .sort(() => random() - 0.5)
    .sort((a, b) => [...b].length - [...a].length)
    .slice(0, 5)
    .sort(() => random() - 0.5)
    .slice(0, 3);
