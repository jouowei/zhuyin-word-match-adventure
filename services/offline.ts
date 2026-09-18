import { EnglishUnit, Lesson } from '../types';
import { ZHUYIN_VOCABULARY } from '../constants';
import { ZHUYIN_SYMBOLS, TONES } from '../zhuyin/symbols';
import { RADICAL_GROUPS } from './radicals';
import { WORD_FAMILIES } from './wordFamilies';
import { canPlayOgg, getWordReading } from './moedict';
import { sha256 } from './parentLock';
import { wordOnlyRecording } from '../utils/chineseAudio';

/**
 * 離線模式: the parent downloads everything the games play and show before going offline.
 * The files go into the cache the service worker (public/sw.js) answers from when there is no network.
 * Device-level, not family data: each phone or tablet downloads its own copy.
 */

export const OFFLINE_CACHE = 'offline-content';
const STATE_KEY = 'offline_mode';

export const STROKE_DATA_URL = (char: string) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`;
const TAILWIND_URL = 'https://cdn.tailwindcss.com';
// Must match the <link> in index.html. Only these fonts are downloaded: the zhuyin font draws the zhuyin itself,
// the kai font is the fallback for 楷書 on phones without one, Andika is for English letters.
const FONT_CSS_URLS = [
  'https://fonts.googleapis.com/css2?family=Bpmf+Zihi+Kai+Std&family=LXGW+WenKai+TC&display=swap',
  'https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Noto+Sans+TC:wght@400;700&family=Zen+Maru+Gothic:wght@500;700;900&display=swap',
];
const OFFLINE_FONTS = ['Bpmf Zihi Kai Std', 'LXGW WenKai TC', 'Andika'];

export interface OfflineState {
  enabled: boolean;
  version?: string;   // offline-manifest.json version that was downloaded
  wordsKey?: string;  // Which words' recordings were downloaded (lessons change it)
  files?: number;
  bytes?: number;
  at?: number;
}

export const readOfflineState = (): OfflineState => {
  try {
    return JSON.parse(window.localStorage.getItem(STATE_KEY) || '') as OfflineState;
  } catch {
    return { enabled: false };
  }
};

const saveOfflineState = (state: OfflineState) => {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Offline mode then just won't be remembered
  }
};

export const offlineSupported = () => typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator;

interface Manifest { version: string; files: { url: string; size: number }[] }

const fetchManifest = async (): Promise<Manifest | null> => {
  try {
    const res = await fetch('/offline-manifest.json', { cache: 'no-store' });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
};

const unique = <T,>(items: T[]) => [...new Set(items)];

/** Every word and character whose recording the games may play. */
export const offlineWords = (lessons: Lesson[]) => {
  const vocabulary = lessons.flatMap(l => l.vocabulary);
  return unique([
    ...vocabulary,
    ...vocabulary.flatMap(w => [...w]), // Single characters: spelling, tones, writing
    ...ZHUYIN_VOCABULARY,
    ...ZHUYIN_SYMBOLS.map(s => s.example),
    ...TONES.map(t => t.example),
    ...RADICAL_GROUPS.flatMap(g => [...g.members.map(m => m.char), g.transfer.char]),
    ...WORD_FAMILIES.flatMap(f => [f.head, ...f.words.map(([w]) => w)]),
  ].filter(w => /\p{Script=Han}/u.test(w)));
};

/** Characters that can be written or are drawn stroke by stroke. */
const strokeCharacters = (lessons: Lesson[]) => unique([
  ...lessons.flatMap(l => l.vocabulary).flatMap(w => [...w]),
  ...RADICAL_GROUPS.flatMap(g => [...g.members.map(m => m.char), g.transfer.char]),
].filter(c => /\p{Script=Han}/u.test(c)));

const wordsKey = (lessons: Lesson[]) => sha256(offlineWords(lessons).join('')).slice(0, 12);

/** Font pieces (Google Fonts splits CJK fonts by unicode-range) that hold characters the game uses. */
const fontFileUrls = async (usedText: string): Promise<string[]> => {
  const codes = new Set([...usedText].map(ch => ch.codePointAt(0)!));
  for (let c = 0xe01e0; c <= 0xe01ef; c++) codes.add(c); // Selectors the zhuyin font uses for other readings
  const urls: string[] = [];
  for (const cssUrl of FONT_CSS_URLS) {
    const css = await (await fetch(cssUrl)).text();
    for (const block of css.split('@font-face').slice(1)) {
      const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
      const src = block.match(/url\((https:[^)]+)\)/)?.[1];
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
      if (!family || !src || !OFFLINE_FONTS.includes(family)) continue;
      const covers = !range || range.split(',').some(part => {
        const [from, to] = part.trim().replace(/^U\+/i, '').split('-').map(h => parseInt(h, 16));
        for (const code of codes) if (code >= from && code <= (to ?? from)) return true;
        return false;
      });
      if (covers) urls.push(src);
    }
  }
  return unique(urls);
};

export interface OfflineItem {
  url: string;
  noCors?: boolean;   // Tailwind's script: an opaque response is all a <script> needs
  wordOnly?: string;  // A 教育部 recording: keep only this word, not the whole definition
}

export interface OfflinePlan {
  version: string;
  items: OfflineItem[];
  appBytes: number;       // Built files (known sizes)
  wordCount: number;      // Word recordings
  estimatedBytes: number; // Everything, roughly
  wordsKey: string;
}

// Rough sizes measured on a full download, for the estimate shown before downloading
const WORD_RECORDING_BYTES = 110 * 1024; // One word kept from a recording, as WAV
const FONT_FILE_BYTES = 55 * 1024;
const STROKE_FILE_BYTES = 3 * 1024;

/** What needs downloading; looking up the words also saves their dictionary entries for offline use. */
export const planOfflineDownload = async (lessons: Lesson[], englishUnits: EnglishUnit[], onStep?: (text: string) => void): Promise<OfflinePlan> => {
  onStep?.('讀取檔案清單…');
  const manifest = await fetchManifest();
  if (!manifest) throw new Error('找不到檔案清單，請確認有網路');
  // Safari can't play the bundled Ogg recordings: it uses the MP3s relayed by the server instead
  const ogg = canPlayOgg();
  const appFiles = manifest.files.filter(f => ogg || !f.url.endsWith('.ogg'));

  onStep?.('查詢詞語的錄音…');
  const words = offlineWords(lessons);
  const readings = await Promise.all(words.map(w => getWordReading(w, { context: lessons.flatMap(l => l.vocabulary) }).catch(() => null)));
  const audio = new Map<string, string>(); // URL → the word it is played for
  readings.forEach((r, i) => {
    if (r?.audioUrl && !appFiles.some(f => f.url === r.audioUrl) && !audio.has(r.audioUrl)) audio.set(r.audioUrl, words[i]);
  });

  onStep?.('整理字型…');
  const mainScript = appFiles.find(f => /^\/assets\/index-.*\.js$/.test(f.url));
  const scriptText = mainScript ? await (await fetch(mainScript.url)).text() : '';
  const usedText = scriptText + lessons.map(l => l.title + l.content + l.vocabulary.join('')).join('') +
    englishUnits.map(u => u.title).join('');
  const fonts = await fontFileUrls(usedText);

  const strokes = strokeCharacters(lessons);
  const items: OfflineItem[] = [
    ...appFiles.map(f => ({ url: f.url })),
    { url: '/' },
    { url: TAILWIND_URL, noCors: true },
    ...FONT_CSS_URLS.map(url => ({ url })),
    ...fonts.map(url => ({ url })),
    ...strokes.map(c => ({ url: STROKE_DATA_URL(c) })),
    ...[...audio].map(([url, word]) => ({ url, wordOnly: word })),
  ];
  const appBytes = appFiles.reduce((sum, f) => sum + f.size, 0);
  return {
    version: manifest.version,
    items,
    appBytes,
    wordCount: audio.size,
    estimatedBytes: appBytes + audio.size * WORD_RECORDING_BYTES + fonts.length * FONT_FILE_BYTES + strokes.length * STROKE_FILE_BYTES,
    wordsKey: wordsKey(lessons),
  };
};

export interface OfflineProgress { done: number; total: number; bytes: number; failed: number }

/**
 * Downloads the plan into the offline cache (files already there are skipped, so a retry picks up where it stopped).
 * Offline mode counts as ready only when every file arrived.
 */
export const downloadOffline = async (plan: OfflinePlan, onProgress: (p: OfflineProgress) => void, signal?: AbortSignal) => {
  const cache = await caches.open(OFFLINE_CACHE);
  const progress: OfflineProgress = { done: 0, total: plan.items.length, bytes: 0, failed: 0 };
  const queue = [...plan.items];
  const worker = async () => {
    while (queue.length && !signal?.aborted) {
      const item = queue.shift()!;
      try {
        if (!(await cache.match(item.url))) {
          // no-store: tells the service worker this is the download, which keeps its own copy
          const res = await fetch(item.url, { cache: 'no-store', signal, ...(item.noCors ? { mode: 'no-cors' as const } : {}) });
          if (!res.ok && res.type !== 'opaque') throw new Error(`HTTP ${res.status}`);
          if (item.wordOnly) {
            const word = await wordOnlyRecording(await res.arrayBuffer(), item.wordOnly);
            progress.bytes += word.size;
            await cache.put(item.url, new Response(word, { headers: { 'Content-Type': 'audio/wav' } }));
          } else {
            progress.bytes += Number(res.headers.get('content-length')) || 0;
            await cache.put(item.url, res);
          }
        }
      } catch (e) {
        if (signal?.aborted) return;
        console.warn('離線下載失敗', item.url, e);
        progress.failed++;
      }
      progress.done++;
      onProgress({ ...progress });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const complete = !signal?.aborted && progress.failed === 0;
  if (complete) {
    // Files from an older version or removed lessons aren't needed any more
    const wanted = new Set(plan.items.map(item => new URL(item.url, window.location.origin).href));
    for (const request of await cache.keys()) {
      if (!wanted.has(request.url)) await cache.delete(request);
    }
    saveOfflineState({ enabled: true, version: plan.version, wordsKey: plan.wordsKey, files: plan.items.length, bytes: progress.bytes, at: Date.now() });
  }
  return { ...progress, complete };
};

export const removeOffline = async () => {
  await caches.delete(OFFLINE_CACHE);
  saveOfflineState({ enabled: false });
};

/** Whether the downloaded copy is older than the app or misses words from new lessons. */
export const offlineNeedsUpdate = async (state: OfflineState, lessons: Lesson[]) => {
  if (!state.enabled) return false;
  if (state.wordsKey !== wordsKey(lessons)) return true;
  const manifest = await fetchManifest();
  return !!manifest && manifest.version !== state.version;
};
