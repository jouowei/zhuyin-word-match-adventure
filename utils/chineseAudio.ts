import { getWordReading } from '../services/moedict';
import { getZhuyinSymbol } from '../zhuyin/symbols';
import { pickEnglishVoice, pickTaiwanVoice } from './voices';
import { clipStretch, englishClipUrls, stretchSamples } from './englishClips';

export interface AudioStep {
  url?: string;   // Same-origin recording to play
  buffer?: AudioBuffer; // A recording made on this device (the child's voice in 錄音比一比)
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

/**
 * How fast the game talks, set by a parent (家長專區). 1 is the recordings' own speed; the computer voice is a
 * little slower than that by default. Recordings are stretched at the same pitch, so a faster setting still
 * sounds like the same person.
 */
export const SPEECH_SPEEDS = [
  { value: 0.9, label: '慢一點' },
  { value: 1.05, label: '普通' },
  { value: 1.2, label: '快一點' },
];
export const DEFAULT_SPEECH_SPEED = 1.05;
let speechSpeed = DEFAULT_SPEECH_SPEED;
export const speechSpeedNow = () => speechSpeed;
export const setSpeechSpeed = (speed: number) => { speechSpeed = Math.min(1.4, Math.max(0.7, speed || DEFAULT_SPEECH_SPEED)); };

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

/** The one audio context: recordings made on this device (utils/voiceRecorder.ts) play in it too. */
export const sharedAudioContext = () => getContext();

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

/** 16-bit mono WAV. */
const encodeWav = (buffer: AudioBuffer): Blob => {
  const samples = buffer.getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([view], { type: 'audio/wav' });
};

/**
 * Just the word at the start of a 教育部 recording, cut exactly as playback cuts it: the offline copy on this device
 * then takes a few dozen KB instead of the whole definition (several hundred KB).
 */
export const wordOnlyRecording = async (data: ArrayBuffer, text: string): Promise<Blob> => {
  const ctx = getContext();
  return encodeWav(trimToFirstUtterance(ctx, await ctx.decodeAudioData(data), countSyllables(text)));
};

const loadClip = (url: string, text: string): Promise<AudioBuffer | null> => {
  const syllables = countSyllables(text);
  const stretch = 1 / speechSpeed;
  const key = `${url}#${syllables}@${stretch.toFixed(2)}`;
  if (!clipCache.has(key)) {
    const task = (async () => {
      try {
        const ctx = getContext();
        const clip = trimToFirstUtterance(ctx, await fetchBuffer(url), syllables);
        if (stretch === 1) return clip;
        const samples = stretchSamples(clip.getChannelData(0), clip.sampleRate, stretch);
        const changed = ctx.createBuffer(1, samples.length, clip.sampleRate);
        changed.copyToChannel(samples, 0);
        return changed;
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

/**
 * 聽完才能按: while the game is saying the question or the help, answers are locked, so a child who taps fast
 * hears it to the end first. Only the calls that ask something count; praise and free listening don't.
 */
let guidance = false;
let guidanceGuard: ReturnType<typeof setTimeout> | undefined;
const guidanceListeners = new Set<(playing: boolean) => void>();
const GUIDANCE_MAX_MS = 8000; // Never leave the answers locked if audio never reports its end

const setGuidance = (playing: boolean) => {
  clearTimeout(guidanceGuard);
  if (playing) guidanceGuard = setTimeout(() => setGuidance(false), GUIDANCE_MAX_MS);
  if (playing === guidance) return;
  guidance = playing;
  guidanceListeners.forEach(listener => listener(playing));
};

export const guidancePlaying = () => guidance;

/** Returns the unsubscribe function. */
export const onGuidance = (listener: (playing: boolean) => void) => {
  guidanceListeners.add(listener);
  return () => { guidanceListeners.delete(listener); };
};

/** Plays a question or a hint: answers stay locked until it has been heard. */
export const playGuidance = (steps: AudioStep[], onEnd?: () => void, onStep?: (index: number) => void) => {
  playChineseAudio(steps, () => { setGuidance(false); onEnd?.(); }, onStep);
  setGuidance(true); // After playChineseAudio, which stops whatever was playing
};

export const stopChineseAudio = () => {
  setGuidance(false);
  playToken++;
  currentSteps = null;
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
  const rate = (step.rate ?? (step.lang === 'en' ? 0.75 : 0.9)) * speechSpeed;
  const voice = step.lang === 'en' ? pickEnglishVoice() : pickTaiwanVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = step.lang === 'en' ? 'en-US' : 'zh-TW';
  utterance.rate = Math.min(2, Math.max(0.4, rate));
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
};

/**
 * Plays recordings one after another, falling back to speech synthesis for missing or broken ones.
 * `onStep` is called as each step starts, e.g. to light up what is being said.
 */
// The sequence playing now, so a praise can be added to its end (see sayAfterAnswer)
let currentSteps: AudioStep[] | null = null;
let currentStartedAt = 0;
let pendingAfterAnswer: { steps: AudioStep[]; timer: ReturnType<typeof setTimeout> } | null = null;

export const playChineseAudio = (inputSteps: AudioStep[], onEnd?: () => void, onStep?: (index: number) => void) => {
  const steps = [...inputSteps];
  // A praise asked for just before this sequence (the game showed "答對了" first, then played the word) goes at its end
  if (pendingAfterAnswer) {
    clearTimeout(pendingAfterAnswer.timer);
    steps.push(...pendingAfterAnswer.steps);
    pendingAfterAnswer = null;
  }
  stopChineseAudio();
  const token = playToken;
  currentSteps = steps;
  currentStartedAt = Date.now();
  if (typeof window !== 'undefined') getContext().resume().catch(() => {}); // Unlock audio inside the tap

  const playStep = async (index: number) => {
    if (token !== playToken) return;
    if (index >= steps.length) {
      if (currentSteps === steps) currentSteps = null;
      onEnd?.();
      return;
    }
    const step = steps[index];
    let advanced = false;
    const next = () => {
      if (advanced || token !== playToken) return;
      advanced = true;
      setTimeout(() => playStep(index + 1), (step.pause ?? 160) / speechSpeed);
    };

    const englishUrls = !step.url && !step.buffer && step.lang === 'en' ? englishClipUrls(step.text) : null;
    const clips = step.buffer ? [step.buffer] : englishUrls
      ? await Promise.all(englishUrls.map(url => loadEnglishClip(url, clipStretch(step.rate) / speechSpeed)))
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

/**
 * Says something right after an answer without talking over the game: at the end of the word the game has just
 * started playing, or of the one it is about to play; otherwise on its own.
 */
export const sayAfterAnswer = (steps: AudioStep[]) => {
  const justStarted = currentSteps && Date.now() - currentStartedAt < 400;
  if (justStarted) {
    currentSteps!.push(...steps);
    return;
  }
  if (pendingAfterAnswer) clearTimeout(pendingAfterAnswer.timer);
  pendingAfterAnswer = {
    steps,
    timer: setTimeout(() => {
      pendingAfterAnswer = null;
      playChineseAudio(steps);
    }, 250),
  };
};

/** Warm the cache so the first tap plays without delay. */
export const preloadChineseAudio = (steps: AudioStep[]) => {
  steps.forEach(step => {
    if (step.url) loadClip(step.url, step.text);
    else if (step.lang === 'en') englishClipUrls(step.text)?.forEach(url => loadEnglishClip(url, clipStretch(step.rate) / speechSpeed));
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
