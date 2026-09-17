import { BUNDLED_AUDIO_IDS, BUNDLED_ENTRIES } from '../zhuyin/moedictData';
import { Heteronym, MOEDICT_API, parseMoedictEntry, Reading, resolveReading } from '../zhuyin/reading';
import { cacheDictionaryEntry, getCachedDictionaryEntry } from './db';

const memory = new Map<string, Heteronym[] | null>(Object.entries(BUNDLED_ENTRIES));
const pending = new Map<string, Promise<Heteronym[] | null>>();
const localAudio = new Set(BUNDLED_AUDIO_IDS);

/** Bundled data → IndexedDB → moedict.tw. Network errors are not cached, so words retry next time. */
const lookup = (word: string): Promise<Heteronym[] | null> => {
  if (memory.has(word)) return Promise.resolve(memory.get(word)!);
  if (pending.has(word)) return pending.get(word)!;

  const task = (async () => {
    const cached = await getCachedDictionaryEntry(word);
    if (cached) {
      memory.set(word, cached.heteronyms);
      return cached.heteronyms;
    }
    try {
      const res = await fetch(MOEDICT_API(word));
      if (res.status === 404) {
        memory.set(word, null);
        cacheDictionaryEntry(word, null);
        return null;
      }
      if (!res.ok) return null;
      const parsed = parseMoedictEntry(await res.json());
      const heteronyms = parsed.length ? parsed : null;
      memory.set(word, heteronyms);
      cacheDictionaryEntry(word, heteronyms);
      return heteronyms;
    } catch (e) {
      console.warn(`萌典查詢失敗：${word}`, e);
      return null;
    } finally {
      pending.delete(word);
    }
  })();
  pending.set(word, task);
  return task;
};

const canPlayOgg = () => {
  try {
    return typeof document !== 'undefined' && document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') !== '';
  } catch (e) {
    return false;
  }
};

/**
 * Recordings must be same-origin so they can be decoded and trimmed to just the word
 * (教育部 files go on to read the whole dictionary definition).
 */
export const getWordAudioUrl = (audioId?: string): string | undefined => {
  if (!audioId) return undefined;
  if (localAudio.has(audioId) && canPlayOgg()) return `/audio/moedict/${audioId}.ogg`;
  return `/api/moedict-audio/${audioId}`; // mp3 relayed by server.ts (Safari can't decode Ogg Vorbis)
};

export interface WordReading extends Reading {
  audioUrl?: string;
}

/**
 * Taiwan-standard zhuyin for a word.
 * `context` should be the other words of the same lesson, so polyphones follow the lesson (樂 in 快樂).
 */
export const getWordReading = async (
  word: string,
  options: { context?: string[]; override?: string } = {},
): Promise<WordReading> => {
  const reading = await resolveReading(word, lookup, options);
  return { ...reading, audioUrl: getWordAudioUrl(reading.audioId) };
};
