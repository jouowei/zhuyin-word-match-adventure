export interface LetterInfo {
  lower: string;
  upper: string;
  name: string;       // How TTS should say the letter name (single letters are often misread)
  sound: string;      // Phonics notation shown to kids, e.g. /b/
  say?: string;       // TTS approximation of the phonics sound (omitted when TTS can't fake it well)
  keyword: string;    // Main picture word
  emoji: string;
  zh: string;
  examples: string[]; // More words with the same sound
  endSound?: boolean; // The sound is at the end of the keyword (x in fox)
}

export const LETTERS: LetterInfo[] = [
  { lower: 'a', upper: 'A', name: 'ay', sound: '/æ/', keyword: 'apple', emoji: '🍎', zh: '蘋果', examples: ['ant', 'alligator'] },
  { lower: 'b', upper: 'B', name: 'bee', sound: '/b/', say: 'buh', keyword: 'bear', emoji: '🐻', zh: '熊', examples: ['bus', 'banana'] },
  { lower: 'c', upper: 'C', name: 'see', sound: '/k/', say: 'kuh', keyword: 'cat', emoji: '🐱', zh: '貓', examples: ['car', 'cake'] },
  { lower: 'd', upper: 'D', name: 'dee', sound: '/d/', say: 'duh', keyword: 'dog', emoji: '🐶', zh: '狗', examples: ['duck', 'drum'] },
  { lower: 'e', upper: 'E', name: 'ee', sound: '/ɛ/', say: 'eh', keyword: 'egg', emoji: '🥚', zh: '蛋', examples: ['elephant', 'elf'] },
  { lower: 'f', upper: 'F', name: 'eff', sound: '/f/', say: 'fuh', keyword: 'fish', emoji: '🐟', zh: '魚', examples: ['frog', 'fox'] },
  { lower: 'g', upper: 'G', name: 'jee', sound: '/g/', say: 'guh', keyword: 'goat', emoji: '🐐', zh: '山羊', examples: ['gift', 'grapes'] },
  { lower: 'h', upper: 'H', name: 'aitch', sound: '/h/', say: 'huh', keyword: 'horse', emoji: '🐴', zh: '馬', examples: ['hat', 'house'] },
  { lower: 'i', upper: 'I', name: 'eye', sound: '/ɪ/', keyword: 'insect', emoji: '🐞', zh: '昆蟲', examples: ['in', 'igloo'] },
  { lower: 'j', upper: 'J', name: 'jay', sound: '/dʒ/', say: 'juh', keyword: 'juice', emoji: '🧃', zh: '果汁', examples: ['jam', 'jet'] },
  { lower: 'k', upper: 'K', name: 'kay', sound: '/k/', say: 'kuh', keyword: 'kite', emoji: '🪁', zh: '風箏', examples: ['key', 'king'] },
  { lower: 'l', upper: 'L', name: 'el', sound: '/l/', say: 'luh', keyword: 'lion', emoji: '🦁', zh: '獅子', examples: ['leaf', 'lemon'] },
  { lower: 'm', upper: 'M', name: 'em', sound: '/m/', say: 'mmm', keyword: 'monkey', emoji: '🐵', zh: '猴子', examples: ['moon', 'milk'] },
  { lower: 'n', upper: 'N', name: 'en', sound: '/n/', say: 'nuh', keyword: 'nose', emoji: '👃', zh: '鼻子', examples: ['nut', 'net'] },
  { lower: 'o', upper: 'O', name: 'oh', sound: '/ɑ/', say: 'ah', keyword: 'octopus', emoji: '🐙', zh: '章魚', examples: ['ox', 'olive'] },
  { lower: 'p', upper: 'P', name: 'pee', sound: '/p/', say: 'puh', keyword: 'pig', emoji: '🐷', zh: '豬', examples: ['pen', 'panda'] },
  { lower: 'q', upper: 'Q', name: 'cue', sound: '/kw/', say: 'kwuh', keyword: 'queen', emoji: '👸', zh: '皇后', examples: ['quiet', 'quick'] },
  { lower: 'r', upper: 'R', name: 'are', sound: '/r/', say: 'ruh', keyword: 'rabbit', emoji: '🐰', zh: '兔子', examples: ['robot', 'rain'] },
  { lower: 's', upper: 'S', name: 'ess', sound: '/s/', say: 'suh', keyword: 'sun', emoji: '☀️', zh: '太陽', examples: ['sock', 'snake'] },
  { lower: 't', upper: 'T', name: 'tee', sound: '/t/', say: 'tuh', keyword: 'tiger', emoji: '🐯', zh: '老虎', examples: ['tree', 'tent'] },
  { lower: 'u', upper: 'U', name: 'you', sound: '/ʌ/', say: 'uh', keyword: 'umbrella', emoji: '☂️', zh: '雨傘', examples: ['up', 'under'] },
  { lower: 'v', upper: 'V', name: 'vee', sound: '/v/', say: 'vuh', keyword: 'van', emoji: '🚐', zh: '廂型車', examples: ['violin', 'volcano'] },
  { lower: 'w', upper: 'W', name: 'double you', sound: '/w/', say: 'wuh', keyword: 'watermelon', emoji: '🍉', zh: '西瓜', examples: ['web', 'window'] },
  { lower: 'x', upper: 'X', name: 'ex', sound: '/ks/', keyword: 'fox', emoji: '🦊', zh: '狐狸', examples: ['box', 'six'], endSound: true },
  { lower: 'y', upper: 'Y', name: 'why', sound: '/j/', say: 'yuh', keyword: 'yo-yo', emoji: '🪀', zh: '溜溜球', examples: ['yellow', 'yes'] },
  { lower: 'z', upper: 'Z', name: 'zee', sound: '/z/', say: 'zuh', keyword: 'zebra', emoji: '🦓', zh: '斑馬', examples: ['zoo', 'zero'] },
];

export const getLetter = (letter: string): LetterInfo | undefined =>
  LETTERS.find(l => l.lower === letter.toLowerCase());

/**
 * Ball-and-stick stroke data for tracing on four-line paper (英文四線三格).
 * Coordinates: line 1 (top) y=0, line 2 (x-height) y=100, line 3 (baseline) y=200, line 4 y=300.
 * Each string is one stroke in writing order; `w` is the letter width.
 */
export interface LetterStrokes {
  w: number;
  strokes: string[];
}

// Shared shapes for the "circle back" lowercase letters (a, d, g, q)
const SMALL_CIRCLE_BACK = 'M93 125 A50 50 0 1 0 7 175 A50 50 0 1 0 93 125';

export const LETTER_STROKES: Record<string, LetterStrokes> = {
  // --- Uppercase ---
  A: { w: 140, strokes: ['M70 0 L0 200', 'M70 0 L140 200', 'M26 125 H114'] },
  B: { w: 115, strokes: ['M0 0 V200', 'M0 0 H55 A50 50 0 0 1 55 100 H0', 'M0 100 H65 A50 50 0 0 1 65 200 H0'] },
  C: { w: 154, strokes: ['M154 29 A90 100 0 1 0 154 171'] },
  D: { w: 140, strokes: ['M0 0 V200', 'M0 0 H40 A100 100 0 0 1 40 200 H0'] },
  E: { w: 110, strokes: ['M0 0 V200', 'M0 0 H110', 'M0 100 H90', 'M0 200 H110'] },
  F: { w: 110, strokes: ['M0 0 V200', 'M0 0 H110', 'M0 100 H90'] },
  G: { w: 180, strokes: ['M154 29 A90 100 0 1 0 180 100 H110'] },
  H: { w: 130, strokes: ['M0 0 V200', 'M130 0 V200', 'M0 100 H130'] },
  I: { w: 80, strokes: ['M40 0 V200', 'M0 0 H80', 'M0 200 H80'] },
  J: { w: 110, strokes: ['M110 0 V145 A55 55 0 0 1 0 145'] },
  K: { w: 125, strokes: ['M0 0 V200', 'M125 0 L0 115', 'M42 77 L125 200'] },
  L: { w: 110, strokes: ['M0 0 V200 H110'] },
  M: { w: 170, strokes: ['M0 0 V200', 'M0 0 L85 200 L170 0 V200'] },
  N: { w: 140, strokes: ['M0 0 V200', 'M0 0 L140 200 V0'] },
  O: { w: 180, strokes: ['M90 0 A90 100 0 1 0 90 200 A90 100 0 1 0 90 0'] },
  P: { w: 115, strokes: ['M0 0 V200', 'M0 0 H60 A55 55 0 0 1 60 110 H0'] },
  Q: { w: 185, strokes: ['M90 0 A90 100 0 1 0 90 200 A90 100 0 1 0 90 0', 'M110 140 L185 215'] },
  R: { w: 125, strokes: ['M0 0 V200', 'M0 0 H60 A55 55 0 0 1 60 110 H0', 'M55 110 L125 200'] },
  S: { w: 150, strokes: ['M145 35 C125 0 25 -5 15 50 C5 100 145 95 140 155 C135 210 25 210 5 165'] },
  T: { w: 140, strokes: ['M0 0 H140', 'M70 0 V200'] },
  U: { w: 140, strokes: ['M0 0 V130 A70 70 0 0 0 140 130 V0'] },
  V: { w: 150, strokes: ['M0 0 L75 200 L150 0'] },
  W: { w: 200, strokes: ['M0 0 L50 200 L100 0 L150 200 L200 0'] },
  X: { w: 140, strokes: ['M0 0 L140 200', 'M140 0 L0 200'] },
  Y: { w: 140, strokes: ['M0 0 L70 100', 'M140 0 L70 100', 'M70 100 V200'] },
  Z: { w: 140, strokes: ['M0 0 H140 L0 200 H140'] },

  // --- Lowercase ---
  a: { w: 100, strokes: [SMALL_CIRCLE_BACK, 'M100 100 V200'] },
  b: { w: 100, strokes: ['M0 0 V200', 'M0 150 A50 50 0 1 1 100 150 A50 50 0 1 1 0 150'] },
  c: { w: 90, strokes: ['M88 118 A50 50 0 1 0 88 182'] },
  d: { w: 100, strokes: [SMALL_CIRCLE_BACK, 'M100 0 V200'] },
  e: { w: 100, strokes: ['M3 150 H100 A50 50 0 1 0 88 182'] },
  f: { w: 90, strokes: ['M90 20 C80 0 45 -5 45 40 V200', 'M5 100 H90'] },
  g: { w: 100, strokes: [SMALL_CIRCLE_BACK, 'M100 100 V250 A50 50 0 0 1 0 250'] },
  h: { w: 100, strokes: ['M0 0 V200', 'M0 150 A50 50 0 0 1 100 150 V200'] },
  i: { w: 20, strokes: ['M10 100 V200', 'M10 45 L10 50'] },
  j: { w: 80, strokes: ['M80 100 V255 A40 40 0 0 1 0 255', 'M80 45 L80 50'] },
  k: { w: 95, strokes: ['M0 0 V200', 'M90 100 L0 160', 'M36 136 L95 200'] },
  l: { w: 20, strokes: ['M10 0 V200'] },
  m: { w: 160, strokes: ['M0 100 V200', 'M0 140 A40 40 0 0 1 80 140 V200', 'M80 140 A40 40 0 0 1 160 140 V200'] },
  n: { w: 90, strokes: ['M0 100 V200', 'M0 145 A45 45 0 0 1 90 145 V200'] },
  o: { w: 100, strokes: ['M50 100 A50 50 0 1 0 50 200 A50 50 0 1 0 50 100'] },
  p: { w: 100, strokes: ['M0 100 V300', 'M0 150 A50 50 0 1 1 100 150 A50 50 0 1 1 0 150'] },
  q: { w: 100, strokes: [SMALL_CIRCLE_BACK, 'M100 100 V300'] },
  r: { w: 80, strokes: ['M0 100 V200', 'M0 150 C5 110 45 95 80 110'] },
  s: { w: 80, strokes: ['M78 118 C65 95 10 95 10 125 C10 152 75 145 75 175 C75 207 12 207 2 182'] },
  t: { w: 80, strokes: ['M40 25 V200', 'M0 100 H80'] },
  u: { w: 90, strokes: ['M0 100 V155 A45 45 0 0 0 90 155', 'M90 100 V200'] },
  v: { w: 100, strokes: ['M0 100 L50 200 L100 100'] },
  w: { w: 140, strokes: ['M0 100 L35 200 L70 100 L105 200 L140 100'] },
  x: { w: 100, strokes: ['M0 100 L100 200', 'M100 100 L0 200'] },
  y: { w: 100, strokes: ['M0 100 L60 200', 'M100 100 L20 300'] },
  z: { w: 100, strokes: ['M0 100 H100 L0 200 H100'] },
};
