
import { WordItem, RewardCard } from "../types";
import { getCachedImage, cacheImage, getCachedAudio, cacheAudio, getCachedMetadata, cacheMetadata } from "./db";
import { getWordReading } from "./moedict";
import { getZhuyinSymbol } from "../zhuyin/symbols";
import { WORD_EMOJI } from "../utils/wordPicture";
import { orderForReview, pickWithReview, ReviewSchedule } from "./learningStats";

// Image Cache: In-memory fallback
const memoryImageCache = new Map<string, string>();

// Audio State Tracking
let currentAudioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

// Helper to get random items from an array
const getRandomItems = (arr: string[], count: number): string[] => {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// --- AUDIO UTILS ---

// Helper to decode Base64 string
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Force stop any currently playing AI audio
export const stopAudio = () => {
  try {
    if (currentSource) {
      currentSource.stop();
      currentSource = null;
    }
    if (currentAudioContext) {
      if (currentAudioContext.state !== 'closed') {
        currentAudioContext.close();
      }
      currentAudioContext = null;
    }
  } catch (e) {
    console.error("Error stopping audio", e);
  }
};

// Helper to play raw PCM data (Gemini Output)
export const playRawAudio = async (base64String: string): Promise<void> => {
  if (!base64String) return;
  
  // 1. Stop any previous audio to prevent overlap and resource exhaustion
  stopAudio();

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext(); 
    currentAudioContext = audioContext;

    const pcmData = decodeBase64(base64String);
    
    // Convert 16-bit PCM to Float32
    const inputData = new Int16Array(pcmData.buffer);
    const float32Data = new Float32Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      float32Data[i] = inputData[i] / 32768.0;
    }

    // 2. Tell the browser the SOURCE material is 24000Hz (Gemini default).
    const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    currentSource = source;
    source.start();

    return new Promise((resolve) => {
      source.onended = () => {
        if (currentAudioContext === audioContext) {
             stopAudio(); 
        }
        resolve();
      };
    });
  } catch (e) {
    console.error("Audio playback failed", e);
    stopAudio();
  }
};

// --- GEMINI TTS ---

export const generateAudioForText = async (text: string): Promise<string | undefined> => {
  const cacheKey = `tts_${text}`;
  try {
    const cached = await getCachedAudio(cacheKey);
    if (cached) return cached;
  } catch (e) {}

  try {
    let apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;
    if (apiKey === 'null' || apiKey === 'undefined' || !apiKey?.trim()) {
        apiKey = null;
    }
    const response = await fetch('/api/generate-audio', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
      },
      body: JSON.stringify({ text }),
    });
    
    const data = await response.json();
    if (data.audio) {
      await cacheAudio(cacheKey, data.audio);
      return data.audio;
    }
  } catch (e) {
    console.error("Gemini TTS Generation Failed", e);
  }
  return undefined;
};

// --- ENGLISH WORD DATA ---

export const generateEnglishWordData = async (words: string[]): Promise<{ word: string; emoji: string; zh: string }[]> => {
  let apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;
  if (apiKey === 'null' || apiKey === 'undefined' || !apiKey?.trim()) {
      apiKey = null;
  }
  const response = await fetch('/api/generate-english-word-data', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
    },
    body: JSON.stringify({ words }),
  });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.items)) {
    throw new Error(data.error || 'Failed to generate English word data');
  }
  return data.items;
};

// --- IMAGE GENERATION ---

export const generateImageForWord = async (word: string, contextDescription?: string, skipCache: boolean = false): Promise<string | undefined> => {
  if (!skipCache) {
    try {
      const cached = await getCachedImage(word);
      if (cached) return cached;
    } catch (e) {
      console.warn("DB check failed", e);
    }
    
    if (memoryImageCache.has(word)) {
      return memoryImageCache.get(word);
    }
  }

  try {
    const seed = skipCache ? Date.now() : undefined;
    let apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;
    if (apiKey === 'null' || apiKey === 'undefined' || !apiKey?.trim()) {
        apiKey = null;
    }
    const response = await fetch('/api/generate-image', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
      },
      body: JSON.stringify({ word, seed }),
    });
    const data = await response.json();

    if (data.image) {
        await cacheImage(word, data.image);
        memoryImageCache.set(word, data.image);
        return data.image;
    }
  } catch (error) {
    console.warn(`Failed to generate image for ${word}`, error);
    return undefined;
  }
  return undefined;
};

// --- Generate Reward Image ---
export const generateRewardImage = async (card: RewardCard): Promise<string | undefined> => {
  const cacheKey = `reward_${card.id}`;

  try {
    const cached = await getCachedImage(cacheKey);
    if (cached) return cached;
  } catch (e) { }

  try {
    let apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;
    if (apiKey === 'null' || apiKey === 'undefined' || !apiKey?.trim()) {
        apiKey = null;
    }
    const response = await fetch('/api/generate-reward-image', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
      },
      body: JSON.stringify({ title: card.title, description: card.description }),
    });
    const data = await response.json();

    if (data.image) {
        await cacheImage(cacheKey, data.image);
        return data.image;
    }
  } catch (error) {
    console.warn(`Failed to generate reward image for ${card.title}`, error);
    return undefined;
  }
  return undefined;
};

export const preloadAllImages = async (vocabulary: string[], onProgress: (current: number, total: number) => void) => {
  const words = vocabulary;
  if (!words || words.length === 0) return;

  const total = words.length;
  let current = 0;
  const CHUNK_SIZE = 2; 
  
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (word) => {
      await generateImageForWord(word);
      current++;
      onProgress(current, total);
    }));
  }
};

export interface RoundOptions {
  count?: number;    // Items in the round (default 4)
  ordered?: boolean; // Take the vocabulary in the given order (今日冒險 plans it) instead of review order
}

/**
 * Zhuyin symbol round: each symbol is matched with a picture word containing its sound (ㄇ → 🐱 貓).
 * Symbols are picked so no picture word also contains another symbol of the round
 * (ㄇ and ㄠ can't appear together, because 貓 ㄇㄠ would fit both).
 */
const generateZhuyinSymbolLevel = async (symbols: string[], schedule?: ReviewSchedule, roundOptions: RoundOptions = {}): Promise<WordItem[]> => {
  const count = roundOptions.count ?? 4;
  const pool = symbols.map(getZhuyinSymbol).filter((s): s is NonNullable<typeof s> => !!s);
  const readings = await Promise.all(pool.map(s => getWordReading(s.example)));
  const choices = pool.map((info, i) => ({ info, reading: readings[i] }));

  // Symbols due for review are tried first (up to two), then ones not practised yet, then the rest
  const ordered = roundOptions.ordered ? choices : orderForReview(choices, o => `zy:${o.info.symbol}`, schedule);

  const picked: typeof choices = [];
  for (const option of ordered) {
    const clashes = picked.some(other =>
      other.reading.zhuyin.includes(option.info.symbol) || option.reading.zhuyin.includes(other.info.symbol)
    );
    if (!clashes) picked.push(option);
    if (picked.length === count) break;
  }
  if (picked.length < count) throw new Error("Not enough zhuyin symbols to generate a level");

  const stamp = Date.now();
  return picked.map(({ info, reading }, index) => ({
    id: `zhuyin-${stamp}-${index}`,
    character: info.symbol,
    zhuyin: reading.zhuyin,
    emoji: info.exampleEmoji,
    imageUrl: undefined,
    audioUrl: info.audio,
    exampleWord: info.example,
    exampleAudioUrl: reading.audioUrl,
    matched: false
  }));
};

/**
 * Generate Level Data
 */
export const generateLevelData = async (
  difficulty: number = 1,
  vocabulary: string[],
  customImagesMap?: Record<string, string>,
  gameMode: 'word' | 'zhuyin' = 'word',
  zhuyinOverrides?: Record<string, string>,
  schedule?: ReviewSchedule,
  roundOptions: RoundOptions = {}
): Promise<WordItem[]> => {
  const count = roundOptions.count ?? 4;

  let targetList = vocabulary;
  if (!targetList || targetList.length === 0) {
    throw new Error("No vocabulary available");
  }

  if (gameMode === 'zhuyin') {
    return generateZhuyinSymbolLevel(targetList, schedule, roundOptions);
  }

  let filteredList: string[] = [];

  if (difficulty === 3) {
    filteredList = targetList.filter(word => word.length === 1);
  } else if ((difficulty === 2 || difficulty === 4) && !roundOptions.ordered) {
    const multiChars = targetList.filter(word => word.length >= 2);
    filteredList = multiChars.length > count ? multiChars : targetList;
  } else {
    filteredList = targetList;
  }

  if (filteredList.length < count) filteredList = targetList;
  
  if (filteredList.length < count) {
     throw new Error("Not enough vocabulary words to generate a level");
  }

  // 1. Select Words First
  // Picture rounds (levels 1 & 3): half the time pick words that surely have their own picture,
  // so the game still has picture rounds when the Gemini API is unavailable
  let pool = filteredList;
  if ((difficulty === 1 || difficulty === 3) && !roundOptions.ordered && Math.random() < 0.5) {
    const seenPictures = new Set<string>();
    const withPictures = [...filteredList].sort(() => Math.random() - 0.5).filter(word => {
      const picture = customImagesMap?.[word] || WORD_EMOJI[word];
      if (!picture || seenPictures.has(picture)) return false;
      seenPictures.add(picture);
      return true;
    });
    if (withPictures.length >= count) pool = withPictures;
  }
  const selectedWords = roundOptions.ordered
    ? pool.slice(0, count)
    : pickWithReview(pool, count, word => `w:${word}`, schedule);

  // Taiwan-standard zhuyin and 教育部 recordings come from 萌典, not from AI
  const readingsPromise = Promise.all(selectedWords.map(word =>
    getWordReading(word, { context: vocabulary, override: zhuyinOverrides?.[word] })
  ));

  try {
    const metadataPromise = (async () => {
      const cachedItems = await Promise.all(selectedWords.map(w => getCachedMetadata(w)));
      // Only ask AI for an emoji when there is no built-in picture and nothing cached
      const wordsToFetch = selectedWords.filter((w, i) => !cachedItems[i] && !WORD_EMOJI[w]);
      let fetchedItems: any[] = [];

      if (wordsToFetch.length > 0) {
          try {
             let apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;
             if (apiKey === 'null' || apiKey === 'undefined' || !apiKey?.trim()) {
                 apiKey = null;
             }
             const response = await fetch('/api/generate-level-data', {
                 method: "POST",
                 headers: {
                   "Content-Type": "application/json",
                   ...(apiKey ? { "x-gemini-api-key": apiKey } : {})
                 },
                 body: JSON.stringify({ words: wordsToFetch }),
             });
             const data = await response.json();
             fetchedItems = data.items || [];
            
             for (const item of fetchedItems) {
                if (item && item.character) {
                  await cacheMetadata(item.character, { 
                    character: item.character, 
                    zhuyin: item.zhuyin, 
                    emoji: item.emoji 
                  });
                }
             }
          } catch (e) {
             console.error("Metadata generation error", e);
             fetchedItems = wordsToFetch.map(w => ({ character: w, zhuyin: '', emoji: '❓' }));
          }
      }
      
      return selectedWords.map((word, i) => {
        if (cachedItems[i]) return cachedItems[i];
        return fetchedItems.find((f: any) => f.character === word) || { character: word, zhuyin: '', emoji: '❓' };
      });
    })();

    const [metaDataList, readings] = await Promise.all([metadataPromise, readingsPromise]);

    const images = await Promise.all(selectedWords.map(async (word) => {
       if (customImagesMap && customImagesMap[word]) {
         return customImagesMap[word];
       }
       try {
           const cached = await getCachedImage(word);
           if (cached) return cached;
       } catch (e) {}
       return memoryImageCache.get(word);
    }));

    return selectedWords.map((word, index) => {
      const meta = metaDataList[index] || { character: word, zhuyin: '', emoji: '❓' };

      const reading = readings[index];

      return {
        id: `gen-${Date.now()}-${index}`,
        character: word,
        zhuyin: reading.zhuyin || meta.zhuyin, // AI zhuyin only when 萌典 is unreachable
        emoji: WORD_EMOJI[word] || meta.emoji || '❓',
        imageUrl: images[index],
        audioUrl: reading.audioUrl,
        matched: false
      };
    });

  } catch (error) {
    console.error("Gemini generation failed", error);
    throw error;
  }
};

