import { Lesson } from '../types';

/**
 * One of the app's own texts (lessons/library.ts). Pages are joined with ===.
 * - zhuyinOverrides: the reading of a vocabulary word, when 萌典 lists more than one (呱呱 → ㄍㄨㄚ ㄍㄨㄚ)
 * - textReadings: the reading of a phrase in the text that isn't vocabulary (跑得 → ㄆㄠˇ ˙ㄉㄜ)
 */
export const lesson = (
  id: string, grade: number, term: 'up' | 'down', order: number, title: string, pages: string[], vocabulary: string[],
  readings: { zhuyinOverrides?: Record<string, string>; textReadings?: Record<string, string> } = {},
): Lesson => ({ id: `lib-${id}`, grade, term, order, title, content: pages.join('===\n'), vocabulary, ...readings });
