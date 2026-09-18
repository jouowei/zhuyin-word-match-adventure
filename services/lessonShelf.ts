import { Lesson, Term } from '../types';

/**
 * Lessons on shelves by school term, like the textbooks: 一年級上學期 … 六年級下學期.
 * Parents type the lessons from their own book (textbook texts are copyrighted, so none are bundled);
 * lessons without a grade go on their own shelf.
 */

export const GRADES = [1, 2, 3, 4, 5, 6];
export const TERMS: Term[] = ['up', 'down'];

const DIGITS = '一二三四五六七八九';

/** 1–99 the way it is written in a textbook: 三, 十二, 二十. */
export const chineseNumeral = (n: number): string => {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens > 1 ? DIGITS[tens - 1] : ''}${tens ? '十' : ''}${ones ? DIGITS[ones - 1] : ''}`;
};

export const termLabel = (grade: number, term: Term) => `${chineseNumeral(grade)}年級${term === 'up' ? '上' : '下'}學期`;
export const termShort = (grade: number, term: Term) => `${chineseNumeral(grade)}${term === 'up' ? '上' : '下'}`;

/** 第三課, or nothing when the lesson has no number. */
export const lessonNumber = (lesson: Pick<Lesson, 'order'>) => (lesson.order ? `第${chineseNumeral(lesson.order)}課` : '');

export const shelfKey = (grade?: number, term?: Term) => (grade && term ? `${grade}-${term}` : 'other');

export interface Shelf {
  key: string;
  grade?: number;
  term?: Term;
  label: string;
  lessons: Lesson[];
}

/** Every term from 一上 to 六下 (empty ones too), in order, then the lessons without a grade if there are any. */
export const lessonShelves = (lessons: Lesson[]): Shelf[] => {
  // By lesson number; lessons without one keep the order they were added in, after the numbered ones
  const sorted = lessons
    .map((lesson, index) => ({ lesson, index }))
    .sort((a, b) => (a.lesson.order ?? Infinity) - (b.lesson.order ?? Infinity) || a.index - b.index)
    .map(({ lesson }) => lesson);
  const shelves: Shelf[] = GRADES.flatMap(grade => TERMS.map(term => ({
    key: shelfKey(grade, term),
    grade,
    term,
    label: termLabel(grade, term),
    lessons: sorted.filter(l => l.grade === grade && l.term === term),
  })));
  const other = sorted.filter(l => !l.grade || !l.term);
  if (other.length) shelves.push({ key: 'other', label: '其他課文', lessons: other });
  return shelves;
};
