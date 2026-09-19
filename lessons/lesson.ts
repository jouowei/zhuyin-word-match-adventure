import { Lesson } from '../types';

/**
 * Readings used wherever these words appear, in a text and in its vocabulary:
 * - everyday words whose second syllable is light, which the font would read in full (爸爸, 名字, 房子, 覺得…)
 * - words 萌典 doesn't have, or lists only as a variant character (曬, 阿嬤, 哪裡)
 */
const FIXED: Record<string, string> = {
  爸爸: 'ㄅㄚˋ ˙ㄅㄚ', 媽媽: 'ㄇㄚ ˙ㄇㄚ', 奶奶: 'ㄋㄞˇ ˙ㄋㄞ', 爺爺: 'ㄧㄝˊ ˙ㄧㄝ', 哥哥: 'ㄍㄜ ˙ㄍㄜ', 姐姐: 'ㄐㄧㄝˇ ˙ㄐㄧㄝ',
  弟弟: 'ㄉㄧˋ ˙ㄉㄧ', 妹妹: 'ㄇㄟˋ ˙ㄇㄟ', 叔叔: 'ㄕㄨˊ ˙ㄕㄨ', 伯伯: 'ㄅㄛˊ ˙ㄅㄛ', 寶寶: 'ㄅㄠˇ ˙ㄅㄠ', 謝謝: 'ㄒㄧㄝˋ ˙ㄒㄧㄝ',
  桌子: 'ㄓㄨㄛ ˙ㄗ', 本子: 'ㄅㄣˇ ˙ㄗ', 杯子: 'ㄅㄟ ˙ㄗ', 村子: 'ㄘㄨㄣ ˙ㄗ',
  早上: 'ㄗㄠˇ ˙ㄕㄤ', 晚上: 'ㄨㄢˇ ˙ㄕㄤ', 名字: 'ㄇㄧㄥˊ ˙ㄗ', 覺得: 'ㄐㄩㄝˊ ˙ㄉㄜ', 哪裡: 'ㄋㄚˇ ˙ㄌㄧ',
  房子: 'ㄈㄤˊ ˙ㄗ', 屋子: 'ㄨ ˙ㄗ', 車子: 'ㄔㄜ ˙ㄗ', 繩子: 'ㄕㄥˊ ˙ㄗ', 攤子: 'ㄊㄢ ˙ㄗ', 金子: 'ㄐㄧㄣ ˙ㄗ',
  一下子: 'ㄧ ㄒㄧㄚˋ ˙ㄗ',
  曬: 'ㄕㄞˋ', 曬場: 'ㄕㄞˋ ㄔㄤˊ', 阿嬤: 'ㄚ ㄇㄚ', 蟎: 'ㄇㄢˇ',
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
  const fixed = (keep: (word: string) => boolean) => Object.fromEntries(Object.entries(FIXED).filter(([word]) => keep(word)));
  const zhuyinOverrides = { ...fixed(word => vocabulary.includes(word)), ...readings.zhuyinOverrides };
  const textReadings = { ...fixed(word => content.includes(word)), ...readings.textReadings };
  return {
    id: `lib-${id}`, grade, term, order, title, content, vocabulary,
    // Drawn for each text (scripts/lesson-art)
    picture: `/lesson-art/${id}.jpg`,
    ...(Object.keys(zhuyinOverrides).length && { zhuyinOverrides }),
    ...(Object.keys(textReadings).length && { textReadings }),
  };
};
