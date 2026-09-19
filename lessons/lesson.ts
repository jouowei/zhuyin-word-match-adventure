import { Lesson } from '../types';

/**
 * Everyday words the font would read wrongly (their second syllable is light), fixed wherever they appear in a text.
 */
const LIGHT: Record<string, string> = {
  爸爸: 'ㄅㄚˋ ˙ㄅㄚ', 媽媽: 'ㄇㄚ ˙ㄇㄚ', 奶奶: 'ㄋㄞˇ ˙ㄋㄞ', 寶寶: 'ㄅㄠˇ ˙ㄅㄠ', 謝謝: 'ㄒㄧㄝˋ ˙ㄒㄧㄝ',
  早上: 'ㄗㄠˇ ˙ㄕㄤ', 晚上: 'ㄨㄢˇ ˙ㄕㄤ', 名字: 'ㄇㄧㄥˊ ˙ㄗ', 覺得: 'ㄐㄩㄝˊ ˙ㄉㄜ',
  房子: 'ㄈㄤˊ ˙ㄗ', 屋子: 'ㄨ ˙ㄗ', 車子: 'ㄔㄜ ˙ㄗ', 繩子: 'ㄕㄥˊ ˙ㄗ', 攤子: 'ㄊㄢ ˙ㄗ', 金子: 'ㄐㄧㄣ ˙ㄗ',
  一下子: 'ㄧ ㄒㄧㄚˋ ˙ㄗ',
};

/**
 * One of the app's own texts (lessons/library.ts). Pages are joined with ===.
 * - zhuyinOverrides: the reading of a vocabulary word, when 萌典 lists more than one (呱呱 → ㄍㄨㄚ ㄍㄨㄚ)
 * - textReadings: the reading of a phrase in the text that isn't vocabulary (跑得 → ㄆㄠˇ ˙ㄉㄜ)
 */
export const lesson = (
  id: string, grade: number, term: 'up' | 'down', order: number, title: string, pages: string[], vocabulary: string[],
  readings: { zhuyinOverrides?: Record<string, string>; textReadings?: Record<string, string> } = {},
): Lesson => {
  const content = pages.join('===\n');
  const textReadings = {
    ...Object.fromEntries(Object.entries(LIGHT).filter(([word]) => content.includes(word))),
    ...readings.textReadings,
  };
  return {
    id: `lib-${id}`, grade, term, order, title, content, vocabulary,
    ...(readings.zhuyinOverrides && { zhuyinOverrides: readings.zhuyinOverrides }),
    ...(Object.keys(textReadings).length && { textReadings }),
  };
};
