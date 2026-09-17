import { getWordReading } from '../services/moedict';
import { getZhuyinSymbol } from '../zhuyin/symbols';
import { pickEnglishVoice, pickTaiwanVoice } from './voices';
import { clipStretch, englishClipUrls, stretchSamples } from './englishClips';

export interface AudioStep {
  url?: string;   // Same-origin recording to play
  text: string;   // Spoken with speech synthesis when there is no recording or it fails
  lang?: 'en';    // English words inside Chinese instructions and hints
  rate?: number;
  pause?: number; // Silence after this step in ms (default 200)
}

// Other speech helpers (English) stop too when a new Chinese sequence starts
const stopListeners: (() => void)[] = [];
export const addStopListener = (listener: () => void) => { stopListeners.push(listener); };

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
// Bumped on every new playback so callbacks from interrupted audio are ignored
let playToken = 0;

const clipCache = new Map<string, Promise<AudioBuffer | null>>();

const getContext = () => {
  if (!audioContext) {
    // On iPhone the silent switch mutes web audio unless the page says it plays media (Safari 17+)
    try {
      const session = (navigator as any).audioSession;
      if (session) session.type = 'playback';
    } catch (e) {}
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext!;
};

// iPhone Safari only plays speech and web audio that a tap started; unlock both on the first touch,
// so instructions that play by themselves on later screens are heard
if (typeof window !== 'undefined') {
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    try {
      getContext().resume().catch(() => {});
    } catch (e) {}
    try {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      }
    } catch (e) {}
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/**
 * 教育部 dictionary recordings read the word first and then the whole definition,
 * so keep only the first stretch of speech (followed by ~1s of silence).
 */
const WINDOW_SECONDS = 0.02;
const LONG_GAP_WINDOWS = 10;         // 200ms pause
const SHORT_GAP_WINDOWS = 5;         // 100ms pause — some files move on to the definition this quickly
const MIN_SPEECH_PER_SYLLABLE = 0.12; // Seconds of speech needed before a long pause may end the clip
const FULL_SPEECH_PER_SYLLABLE = 0.26; // ...and before a short pause may (so 鴨子 isn't cut between 鴨 and 子)

const trimToFirstUtterance = (ctx: AudioContext, buffer: AudioBuffer, syllables: number): AudioBuffer => {
  const data = buffer.getChannelData(0);
  const win = Math.max(1, Math.floor(buffer.sampleRate * WINDOW_SECONDS));
  const rms: number[] = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / win));
  }
  const peak = Math.max(...rms, 0);
  if (peak === 0) return buffer;

  const threshold = peak * 0.08;
  let start = -1;
  let end = rms.length;
  let silence = 0;
  let speechWindows = 0;
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] > threshold) {
      if (start < 0) start = i;
      silence = 0;
      speechWindows++;
      continue;
    }
    if (start < 0) continue;
    silence++;
    const speech = speechWindows * WINDOW_SECONDS;
    const longPauseEnds = silence >= LONG_GAP_WINDOWS && speech >= syllables * MIN_SPEECH_PER_SYLLABLE;
    const shortPauseEnds = silence >= SHORT_GAP_WINDOWS && speech >= syllables * FULL_SPEECH_PER_SYLLABLE;
    if (longPauseEnds || shortPauseEnds) {
      end = i - silence + 1;
      break;
    }
  }
  if (start < 0) return buffer;

  const from = Math.max(0, (start - 2) * win);
  const to = Math.min(data.length, (end + 6) * win); // Keep a little tail so the word doesn't sound clipped
  const clip = ctx.createBuffer(buffer.numberOfChannels, to - from, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    clip.copyToChannel(buffer.getChannelData(ch).subarray(from, to), ch);
  }
  return clip;
};

const fetchBuffer = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return getContext().decodeAudioData(await res.arrayBuffer());
};

const englishDecoded = new Map<string, Promise<AudioBuffer>>(); // One download per file, whatever the speed

/** Generated English clips hold just the word or sentence, so no trimming; slower requests are stretched at the same pitch. */
const loadEnglishClip = (url: string, stretch: number): Promise<AudioBuffer | null> => {
  const key = `${url}@${stretch.toFixed(2)}`;
  if (!clipCache.has(key)) {
    const task = (async () => {
      try {
        if (!englishDecoded.has(url)) englishDecoded.set(url, fetchBuffer(url));
        const decoded = await englishDecoded.get(url)!.catch(e => {
          englishDecoded.delete(url);
          throw e;
        });
        if (stretch === 1) return decoded;
        const ctx = getContext();
        const samples = stretchSamples(decoded.getChannelData(0), decoded.sampleRate, stretch);
        const slow = ctx.createBuffer(1, samples.length, decoded.sampleRate);
        slow.copyToChannel(samples, 0);
        return slow;
      } catch (e) {
        console.warn('英文音檔載入失敗，改用電腦語音', url, e);
        clipCache.delete(key);
        return null;
      }
    })();
    clipCache.set(key, task);
  }
  return clipCache.get(key)!;
};

const ENGLISH_PART_PAUSE = 250; // Between "bee." and "bear."

// One Chinese character is one syllable; zhuyin symbols count as one
const countSyllables = (text: string) => Math.max(1, (text.match(/\p{Script=Han}/gu) || []).length);

const loadClip = (url: string, text: string): Promise<AudioBuffer | null> => {
  const syllables = countSyllables(text);
  const key = `${url}#${syllables}`;
  if (!clipCache.has(key)) {
    const task = (async () => {
      try {
        const ctx = getContext();
        return trimToFirstUtterance(ctx, await fetchBuffer(url), syllables);
      } catch (e) {
        console.warn('錄音載入失敗，改用電腦語音', url, e);
        clipCache.delete(key); // Retry next time (e.g. network was down)
        return null;
      }
    })();
    clipCache.set(key, task);
  }
  return clipCache.get(key)!;
};

export const stopChineseAudio = () => {
  playToken++;
  try {
    currentSource?.stop();
  } catch (e) {}
  currentSource = null;
  stopListeners.forEach(listener => listener());
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
};

const speakText = (step: AudioStep, onEnd: () => void) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(step.text);
  const voice = step.lang === 'en' ? pickEnglishVoice() : pickTaiwanVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = step.lang === 'en' ? 'en-US' : 'zh-TW';
  utterance.rate = step.rate ?? (step.lang === 'en' ? 0.75 : 0.8);
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
};

/**
 * Plays recordings one after another, falling back to speech synthesis for missing or broken ones.
 * `onStep` is called as each step starts, e.g. to light up what is being said.
 */
export const playChineseAudio = (steps: AudioStep[], onEnd?: () => void, onStep?: (index: number) => void) => {
  stopChineseAudio();
  const token = playToken;
  if (typeof window !== 'undefined') getContext().resume().catch(() => {}); // Unlock audio inside the tap

  const playStep = async (index: number) => {
    if (token !== playToken) return;
    if (index >= steps.length) {
      onEnd?.();
      return;
    }
    const step = steps[index];
    let advanced = false;
    const next = () => {
      if (advanced || token !== playToken) return;
      advanced = true;
      setTimeout(() => playStep(index + 1), step.pause ?? 200);
    };

    const englishUrls = !step.url && step.lang === 'en' ? englishClipUrls(step.text) : null;
    const clips = englishUrls
      ? await Promise.all(englishUrls.map(url => loadEnglishClip(url, clipStretch(step.rate))))
      : [step.url ? await loadClip(step.url, step.text) : null];
    if (token !== playToken) return;
    onStep?.(index);
    if (clips.some(clip => !clip)) {
      speakText(step, next);
      return;
    }
    const ctx = getContext();
    const playPart = (part: number) => {
      if (token !== playToken) return;
      const source = ctx.createBufferSource();
      source.buffer = clips[part]!;
      source.connect(ctx.destination);
      source.onended = () => {
        if (part + 1 < clips.length) setTimeout(() => playPart(part + 1), ENGLISH_PART_PAUSE);
        else next();
      };
      currentSource = source;
      source.start();
    };
    playPart(0);
  };

  playStep(0);
};

/** Warm the cache so the first tap plays without delay. */
export const preloadChineseAudio = (steps: AudioStep[]) => {
  steps.forEach(step => {
    if (step.url) loadClip(step.url, step.text);
    else if (step.lang === 'en') englishClipUrls(step.text)?.forEach(url => loadEnglishClip(url, clipStretch(step.rate)));
  });
};

/** Plays a zhuyin symbol; with `withExample` it continues with its picture word: 「ㄇ…貓」. */
export const playZhuyinSymbol = async (symbol: string, withExample = false) => {
  const info = getZhuyinSymbol(symbol);
  if (!info) {
    playChineseAudio([{ text: symbol }]);
    return;
  }
  const steps: AudioStep[] = [{ url: info.audio, text: symbol }];
  if (withExample) {
    const reading = await getWordReading(info.example);
    steps.push({ url: reading.audioUrl, text: info.example });
  }
  playChineseAudio(steps);
};

/** Plays a word with the 教育部 recording when available. */
export const playChineseWord = (word: string, audioUrl?: string) => {
  playChineseAudio([{ url: audioUrl, text: word }]);
};
