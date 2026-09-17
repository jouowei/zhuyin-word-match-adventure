/** Lesson pages: split by '===' when the parent set pages, otherwise one page per sentence ending in 。 */
export const splitLessonPages = (content: string): string[] => {
  if (!content) return [''];
  if (content.includes('===')) {
    return content.split('===').map(s => s.trim()).filter(s => s.length > 0);
  }
  const pages = content.replace(/([。]+)/g, '$1|').split('|').map(s => s.trim()).filter(s => s.length > 0);
  return pages.length > 0 ? pages : [content];
};

/** Start positions (in characters) of every occurrence of `word` in `text`. */
export const occurrences = (text: string, word: string): number[] => {
  const chars = [...text];
  const target = [...word];
  const found: number[] = [];
  for (let i = 0; i + target.length <= chars.length; i++) {
    if (target.every((ch, k) => chars[i + k] === ch)) found.push(i);
  }
  return found;
};

/** The sentence (by 。！？ and their ASCII forms) around character position `index`, as [start, end). */
export const sentenceRange = (text: string, index: number): [number, number] => {
  const chars = [...text];
  const isEnd = (ch: string) => /[。！？!?]/.test(ch);
  let start = index;
  while (start > 0 && !isEnd(chars[start - 1])) start--;
  let end = index;
  while (end < chars.length && !isEnd(chars[end])) end++;
  return [start, Math.min(chars.length, end + 1)];
};

/** Lesson words to look for in the text: the given ones that actually appear in it. */
export const wordsInText = (content: string, words: string[]) =>
  Array.from(new Set(words)).filter(word => word && content.includes(word));
