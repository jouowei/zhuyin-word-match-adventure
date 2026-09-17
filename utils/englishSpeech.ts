import { getLetter } from '../english/letters';
import { getCachedAudio, cacheAudio } from '../services/db';
import { addStopListener, playChineseAudio, stopChineseAudio } from './chineseAudio';
import { englishClipUrls } from './englishClips';
import { pickEnglishVoice } from './voices';

// --- VOICE ---

let preferredVoice: SpeechSynthesisVoice | null = null;

if (typeof window !== 'undefined' && window.speechSynthesis) {
  preferredVoice = pickEnglishVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    preferredVoice = pickEnglishVoice();
  });
}

let currentRecording: HTMLAudioElement | null = null;
// Bumped whenever speech starts or stops, so callbacks of interrupted speech are ignored
let speechToken = 0;

const haltEnglish = () => {
  speechToken++;
  if (currentRecording) {
    currentRecording.pause();
    currentRecording = null;
  }
};

// Spoken Chinese instructions and hints interrupt English speech, and the other way round
addStopListener(haltEnglish);

export const stopEnglishSpeech = () => {
  if (typeof window === 'undefined') return;
  haltEnglish();
  stopChineseAudio(); // Also cancels speech synthesis
};

export const speakEnglish = (text: string, options: { rate?: number; onEnd?: () => void } = {}) => {
  // Recorded clips when there are any; speech synthesis for everything else (e.g. words parents added)
  if (typeof window !== 'undefined' && englishClipUrls(text)) {
    playChineseAudio([{ text, lang: 'en', rate: options.rate ?? 0.8 }], options.onEnd);
    return;
  }
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onEnd?.();
    return;
  }
  stopEnglishSpeech();
  const token = speechToken;

  const utterance = new SpeechSynthesisUtterance(text);
  if (!preferredVoice) preferredVoice = pickEnglishVoice();
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.lang = 'en-US';
  utterance.rate = options.rate ?? 0.8; // Slower for kids
  utterance.pitch = 1.0;
  if (options.onEnd) {
    const finish = () => { if (token === speechToken) options.onEnd?.(); };
    utterance.onend = finish;
    utterance.onerror = finish;
  }
  window.speechSynthesis.speak(utterance);
};

const PRAISE = ['Great job!', 'Awesome!', 'Well done!', 'You did it!', 'Super!'];
export const speakPraise = () => speakEnglish(PRAISE[Math.floor(Math.random() * PRAISE.length)], { rate: 0.9 });

// --- LETTERS ---

export const speakLetterName = (letter: string) => {
  const info = getLetter(letter);
  speakEnglish(info ? info.name : letter, { rate: 0.75 });
};

// Parents can record the real letter sound, because TTS can only approximate phonics sounds.
const recordingKey = (letter: string) => `en_letter_sound_${letter.toLowerCase()}`;

export const getLetterRecording = (letter: string) => getCachedAudio(recordingKey(letter));

export const saveLetterRecording = (letter: string, dataUrl: string) => cacheAudio(recordingKey(letter), dataUrl);

export const deleteLetterRecording = (letter: string) => cacheAudio(recordingKey(letter), '');

const playDataUrl = (dataUrl: string, onEnd?: () => void) => {
  stopEnglishSpeech();
  const token = speechToken;
  const finish = () => { if (token === speechToken) onEnd?.(); };
  const audio = new Audio(dataUrl);
  currentRecording = audio;
  audio.onended = finish;
  audio.onerror = finish;
  audio.play().catch(finish);
};

/** "buh, buh, bear" — or the parent's recording when available. */
export const speakLetterSound = async (letter: string, onEnd?: () => void) => {
  const info = getLetter(letter);
  if (!info) return;

  try {
    const recording = await getLetterRecording(letter);
    if (recording) {
      playDataUrl(recording, onEnd);
      return;
    }
  } catch (e) {}

  const chant = info.say
    ? `${info.say}. ${info.say}. ${info.keyword}.`
    : `${info.keyword}. ${info.examples[0]}. ${info.keyword}.`;
  speakEnglish(chant, { rate: 0.7, onEnd });
};

/** Letter name, then keyword: "bee. bear." */
export const speakLetterWithKeyword = (letter: string) => {
  const info = getLetter(letter);
  if (!info) return;
  speakEnglish(`${info.name}. ${info.keyword}.`, { rate: 0.75 });
};

// --- SPEECH RECOGNITION ---

// Only true homophones / number digits — near-miss pronunciations (pen vs pan) should not pass.
const HOMOPHONES: Record<string, string[]> = {
  one: ['1', 'won'], two: ['2', 'to', 'too'], three: ['3'], four: ['4', 'for'], five: ['5'],
  six: ['6'], seven: ['7'], eight: ['8', 'ate'], nine: ['9'], ten: ['10'],
  sun: ['son'], bee: ['be', 'b'], eye: ['i', 'aye'], red: ['read'], blue: ['blew'],
  nose: ['knows'], mom: ['mum', 'mommy'], dad: ['daddy'], rose: ['rows'],
  'yo-yo': ['yoyo', 'yo yo'], feet: ['feat'], eggs: ['egg'],
};

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();

export const isSpeechMatch = (transcripts: string[], target: string) => {
  const goal = normalize(target);
  const accepted = [goal, goal.replace(/-/g, ' '), ...(HOMOPHONES[goal] || [])];
  return transcripts.some(raw => {
    const heard = normalize(raw);
    const words = heard.split(/\s+/);
    return accepted.some(ok => heard === ok || words.includes(ok) || (ok.includes(' ') && heard.includes(ok)));
  });
};
