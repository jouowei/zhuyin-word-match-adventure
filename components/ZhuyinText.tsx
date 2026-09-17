import React, { useEffect, useState } from 'react';

/**
 * Text in 教育部標準楷書 with zhuyin drawn by the font itself (Bpmf Zihi Kai Std, bpmfvs IVS spec).
 * The font shows each character's most common reading; for other readings an Ideographic Variation
 * Selector is appended (U+E01E1 = 2nd reading, U+E01E2 = 3rd…), using the bpmfvs reading order.
 */

let polyphones: Map<string, string[]> | null = null;
let loading: Promise<Map<string, string[]>> | null = null;

const loadPolyphones = () => {
  if (!loading) {
    loading = import('../zhuyin/fontPolyphones').then(({ FONT_POLYPHONES_RAW }) => {
      const map = new Map<string, string[]>();
      for (const entry of FONT_POLYPHONES_RAW.split('|')) {
        const [char] = [...entry];
        map.set(char, entry.slice(char.length).split(','));
      }
      polyphones = map;
      return map;
    });
  }
  return loading;
};

const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);

/** Appends variation selectors so the font draws the given readings (one per Chinese character). */
export const applyReadings = (text: string, readings: (string | undefined)[], table: Map<string, string[]> | null): string => {
  if (!table) return text;
  let index = 0;
  return [...text].map(ch => {
    if (!isHan(ch)) return ch;
    const reading = readings[index++];
    const order = table.get(ch);
    const position = reading && order ? order.indexOf(reading) : -1;
    return position > 0 ? ch + String.fromCodePoint(0xE01E0 + position) : ch;
  }).join('');
};

/**
 * Readings for a sentence: the known words (e.g. lesson vocabulary) are matched longest-first,
 * other characters keep the font's default reading.
 */
export const readingsForSentence = (text: string, wordReadings: Record<string, string>): (string | undefined)[] => {
  const chars = [...text];
  const words = Object.keys(wordReadings).sort((a, b) => b.length - a.length);
  const result: (string | undefined)[] = [];
  let i = 0;
  while (i < chars.length) {
    if (!isHan(chars[i])) { i++; continue; }
    const word = words.find(w => chars.slice(i, i + [...w].length).join('') === w);
    const syllables = word ? wordReadings[word].split(' ').filter(Boolean) : [];
    if (word && syllables.length === [...word].length) {
      result.push(...syllables);
      i += syllables.length;
    } else {
      result.push(undefined);
      i++;
    }
  }
  return result;
};

const usePolyphones = () => {
  const [table, setTable] = useState(polyphones);
  useEffect(() => {
    if (!table) loadPolyphones().then(setTable);
  }, [table]);
  return table;
};

interface ZhuyinTextProps {
  text: string;
  /** One reading per Chinese character, e.g. item.zhuyin.split(' '); missing entries use the font default */
  readings?: (string | undefined)[];
  className?: string;
}

export const ZhuyinText: React.FC<ZhuyinTextProps> = ({ text, readings = [], className = '' }) => {
  const table = usePolyphones();
  return <span className={`font-bpmf ${className}`} lang="zh-Hant-TW">{applyReadings(text, readings, table)}</span>;
};
