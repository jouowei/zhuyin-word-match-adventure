import { Confusion, DayActivity, WordStat } from '../types';
import { startOfDay, todayKey } from './learningStats';

type Activity = Record<string, DayActivity> | undefined;

/** Gaps longer than this between answers are breaks, not play time. */
const ACTIVE_GAP_MS = 2 * 60 * 1000;
const KEEP_DAYS = 60;

const emptyDay = (): DayActivity => ({ onOwn: 0, helped: 0, mistakes: 0, reviewTried: 0, reviewRemembered: 0, newItems: 0, mastered: 0, seconds: 0 });

const withDay = (activity: Activity, now: number, change: (day: DayActivity) => DayActivity): Record<string, DayActivity> => {
  const key = todayKey(now);
  const day = { ...emptyDay(), ...activity?.[key] };
  const next: Record<string, DayActivity> = { ...activity, [key]: change(day) };
  // Keep about two months
  const oldest = todayKey(startOfDay(now) - KEEP_DAYS * 86400000);
  for (const date of Object.keys(next)) if (date < oldest) delete next[date];
  return next;
};

const addActiveTime = (day: DayActivity, now: number): DayActivity => {
  const gap = day.lastAt ? now - day.lastAt : Infinity;
  return { ...day, seconds: day.seconds + (gap < ACTIVE_GAP_MS ? Math.round(gap / 1000) : 0), lastAt: now };
};

/** Came back for review after a gap: in box 1+ and due. */
export const isReviewDue = (stat: WordStat | undefined, now: number) => !!stat && (stat.box ?? 0) >= 1 && (stat.due ?? 0) <= now;

export const confusionKey = (c: Confusion) => `${c.kind}:${[c.expected, c.chosen].sort().join('|')}`;

const englishPart = (day: DayActivity, change: { onOwn?: number; helped?: number; mistakes?: number }) => {
  const en = day.english || { onOwn: 0, helped: 0, mistakes: 0 };
  return { onOwn: en.onOwn + (change.onOwn || 0), helped: en.helped + (change.helped || 0), mistakes: en.mistakes + (change.mistakes || 0) };
};

export const logAnswer = (
  activity: Activity, now: number,
  options: { independent: boolean; review: boolean; mastered: boolean; english?: boolean },
) => withDay(activity, now, day => ({
  ...addActiveTime(day, now),
  ...(options.english ? { english: englishPart(day, options.independent ? { onOwn: 1 } : { helped: 1 }) } : {}),
  onOwn: day.onOwn + (options.independent ? 1 : 0),
  helped: day.helped + (options.independent ? 0 : 1),
  reviewTried: day.reviewTried + (options.review ? 1 : 0),
  reviewRemembered: day.reviewRemembered + (options.review && options.independent ? 1 : 0),
  mastered: day.mastered + (options.mastered ? 1 : 0),
}));

export const logMistake = (activity: Activity, now: number, options: { review: boolean; confusion?: Confusion; english?: boolean }) =>
  withDay(activity, now, day => {
    const confusions = { ...day.confusions };
    if (options.confusion && options.confusion.expected !== options.confusion.chosen) {
      const key = confusionKey(options.confusion);
      confusions[key] = (confusions[key] || 0) + 1;
    }
    return {
      ...addActiveTime(day, now),
      ...(options.english ? { english: englishPart(day, { mistakes: 1 }) } : {}),
      mistakes: day.mistakes + 1,
      reviewTried: day.reviewTried + (options.review ? 1 : 0),
      confusions,
    };
  });

export const logNewItems = (activity: Activity, now: number, count: number) =>
  withDay(activity, now, day => ({ ...addActiveTime(day, now), newItems: day.newItems + count }));

export interface WeekSummary {
  days: { date: string; activity: DayActivity }[]; // Oldest first, seven entries
  daysPlayed: number;
  minutes: number;
  onOwn: number;
  helped: number;
  onOwnRate: number | null;     // null when nothing was answered
  reviewTried: number;
  reviewRate: number | null;
  newItems: number;
  mastered: number;
  confusions: { key: string; count: number }[]; // Most frequent first
  english: { onOwn: number; helped: number; onOwnRate: number | null };
}

/** The seven days ending `endDaysAgo` days before today. */
export const summarizeWeek = (activity: Activity, now = Date.now(), endDaysAgo = 0): WeekSummary => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = todayKey(startOfDay(now) - (endDaysAgo + 6 - i) * 86400000 + 12 * 3600000);
    return { date, activity: { ...emptyDay(), ...activity?.[date] } };
  });
  const sum = (pick: (d: DayActivity) => number) => days.reduce((total, d) => total + pick(d.activity), 0);
  const onOwn = sum(d => d.onOwn);
  const helped = sum(d => d.helped);
  const reviewTried = sum(d => d.reviewTried);
  const confusionTotals: Record<string, number> = {};
  days.forEach(d => Object.entries(d.activity.confusions || {}).forEach(([key, count]) => {
    confusionTotals[key] = (confusionTotals[key] || 0) + count;
  }));
  return {
    days,
    daysPlayed: days.filter(d => d.activity.onOwn + d.activity.helped + d.activity.mistakes > 0).length,
    minutes: Math.round(sum(d => d.seconds) / 60),
    onOwn,
    helped,
    onOwnRate: onOwn + helped > 0 ? onOwn / (onOwn + helped) : null,
    reviewTried,
    reviewRate: reviewTried > 0 ? sum(d => d.reviewRemembered) / reviewTried : null,
    newItems: sum(d => d.newItems),
    mastered: sum(d => d.mastered),
    confusions: Object.entries(confusionTotals).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    english: (() => {
      const en = { onOwn: sum(d => d.english?.onOwn || 0), helped: sum(d => d.english?.helped || 0) };
      return { ...en, onOwnRate: en.onOwn + en.helped > 0 ? en.onOwn / (en.onOwn + en.helped) : null };
    })(),
  };
};
