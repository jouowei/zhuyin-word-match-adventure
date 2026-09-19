
export interface WordItem {
  id: string;
  character: string; // The Chinese Word (e.g., 日出)
  zhuyin: string;    // The Bopomofo (e.g., ㄖˋ ㄔㄨ)
  emoji: string;     // Fallback emoji
  imageUrl?: string; // AI Generated Image URL (Base64)
  audioUrl?: string; // 教育部 recording of the word or zhuyin symbol
  exampleWord?: string;     // Zhuyin mode: picture word that contains the symbol's sound (貓 for ㄇ)
  exampleAudioUrl?: string;
  matched: boolean;
}

export interface GameLevel {
  id: number;
  items: WordItem[];
  theme: string;
}

/** 上學期 / 下學期 */
export type Term = 'up' | 'down';

export interface Lesson {
  id: string;
  title: string;
  grade?: number; // 1–6: which year's textbook it is from (none: 其他課文)
  term?: Term;
  order?: number; // 第幾課
  content: string; // The full text/story
  vocabulary: string[]; // List of specific words to learn from this lesson
  customImages?: Record<string, string>; // Optional: Map 'Word' -> 'Image URL'
  zhuyinOverrides?: Record<string, string>; // Optional: parent-chosen readings for polyphones, 'Word' -> 'ㄌㄜˋ'
  // Readings of phrases in the text that aren't vocabulary (跑得 -> 'ㄆㄠˇ ˙ㄉㄜ'); only the text shown with zhuyin uses them
  textReadings?: Record<string, string>;
  picture?: string; // A soft picture under the text on the lesson page (the app's own texts have one)
  edited?: boolean; // A parent changed it: kept as theirs even when the app updates its built-in lessons
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  description: string;
  purchased: boolean;
}

export interface RewardCard {
  id: string;
  title: string;
  emoji: string;
  imageUrl?: string; // Custom card image URL
  description: string;
  color: string; // Background color for the card style
  cost: number;  // Cost in points
}

/** The parent password, as a salted hash (services/parentLock.ts). */
export interface ParentLockRecord {
  salt: string;
  hash: string;
  hint?: string;
}

/** The adventure companion the child picked; it talks and leads the way on the home map. */
export type CompanionId = 'fox' | 'bear' | 'dragon' | 'bunny';

/** What the Chinese adventure practises, chosen by a parent: the zhuyin symbols, one lesson, or every lesson. */
export type StudyFocus = { kind: 'zhuyin' } | { kind: 'lesson'; lessonId: string } | { kind: 'all' };

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji avatar
  points: number;
  ownedCardIds: string[];
  createdAt: number;
  englishProgress?: Record<string, number[]>; // English unit id -> completed game levels (1-4)
  zhuyinProgress?: Record<string, number[]>;  // 'zhuyin' | lesson id | 'free' -> completed game levels (1-6)
  wordStats?: Record<string, WordStat>;       // Spaced review per item: 'w:快樂' / 'zy:ㄇ' / 'el:b' / 'ew:cat'
  lastDailyPath?: string;                     // Date (YYYY-MM-DD) of the last finished 今日冒險
  lastEnglishPath?: string;                   // ...and of the last finished 今日英文冒險
  activity?: Record<string, DayActivity>;     // Per day (YYYY-MM-DD), for the parent report
  milestoneClaims?: number;                   // Free cards already chosen for every 10 items learned
  freeSpins?: number;                         // Free gacha spins waiting to be used
  lastFreeSpinDate?: string;                  // Date a finished adventure last gave a free spin (one a day)
  companion?: CompanionId;                    // Chosen once, can be changed in 家長專區
  studyFocus?: StudyFocus;                    // Set in 家長專區; the zhuyin symbols until then
  journeyLegs?: number;                       // 環島冒險: legs travelled (the day's first finished adventure per language)
  journeySeen?: number;                       // Last place (step) whose arrival story was shown; unset: not started
}

/** What happened on one day, for the parent report. */
export interface DayActivity {
  onOwn: number;            // Answers without help
  helped: number;           // Answers that needed help
  mistakes: number;
  reviewTried: number;      // Items that came back after a gap (review box 1+)
  reviewRemembered: number; // ...and were answered without help
  newItems: number;
  mastered: number;
  seconds: number;          // Active time: gaps under two minutes between answers
  lastAt?: number;
  confusions?: Record<string, number>; // 'symbol:ㄣ|ㄥ', 'tone:二聲|三聲', 'word:左|右', 'letter:b|d', 'enword:hat|hot'
  english?: { onOwn: number; helped: number; mistakes: number }; // The English part of the counts above
}

/** A wrong choice, for spotting what gets mixed up. */
export interface Confusion {
  kind: 'symbol' | 'tone' | 'word' | 'letter' | 'enword';
  expected: string;
  chosen: string;
}

export interface WordStat {
  wrong: number;      // Total mistakes
  last?: number;      // Time of the last mistake
  box?: number;       // Review box: 0 = practise again soon, higher = remembered over longer gaps
  due?: number;       // Start of the day the item comes back for review
  seen?: number;      // Last time practised
  mastered?: number;  // When it first counted as 學會 (the bonus is given once)
  skills?: Partial<Record<Skill, number>>; // Answers without help per skill, so support can fade (書寫 stages, 拼音 blending)
}

export type Skill = 'spell' | 'tone' | 'write' | 'writeUpper'; // writeUpper: English capital letters

// --- ENGLISH ADVENTURE ---

export interface EnglishWord {
  word: string;  // e.g. 'cat'
  emoji: string; // e.g. '🐱'
  zh: string;    // Chinese meaning, e.g. '貓'
}

export interface EnglishUnit {
  id: string;
  stage: number;               // 1: letters, 2: short vowels, 3: everyday words, 4: advanced phonics, 5: custom
  kind: 'letters' | 'words';
  title: string;               // Chinese title
  subtitle: string;            // English subtitle
  icon: string;                // Emoji shown on the map
  tip?: string;                // Learning tip for kids / parents (Chinese)
  letters?: string[];          // kind === 'letters': lowercase letters
  words?: EnglishWord[];       // kind === 'words'
  sentences?: string[];        // Simple reading sentences
  custom?: boolean;            // Created by parents
}

export interface EnglishRoundItem {
  id: string;
  kind: 'letter' | 'word';
  text: string;      // Lowercase letter ('b') or word ('cat')
  keyword: string;   // Word to say / show with the picture ('bear' for 'b', same as text for words)
  emoji: string;
  zh: string;
  traceCase?: 'upper' | 'lower'; // Letter tracing level
  matched: boolean;
}

export enum GameState {
  LOGIN = 'LOGIN',
  MENU = 'MENU',
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  LEADERBOARD = 'LEADERBOARD',
  VICTORY = 'VICTORY',
  SETTINGS = 'SETTINGS',
  LESSON_SELECT = 'LESSON_SELECT', // List all lessons
  LESSON_INTRO = 'LESSON_INTRO',    // Read content before playing
  ZHUYIN_INTRO = 'ZHUYIN_INTRO',    // Learn Bopomofo characters
  ENGLISH_HUB = 'ENGLISH_HUB',                   // English adventure map
  ENGLISH_ALPHABET = 'ENGLISH_ALPHABET',         // ABC chart
  ENGLISH_UNIT_INTRO = 'ENGLISH_UNIT_INTRO',     // Learn a unit before playing
  ENGLISH_LEVEL_SELECT = 'ENGLISH_LEVEL_SELECT', // Choose English game mode
  ENGLISH_PLAYING = 'ENGLISH_PLAYING',
  ENGLISH_MANAGER = 'ENGLISH_MANAGER',           // Parents add custom word units
  DAILY_PATH = 'DAILY_PATH',                     // 今日冒險: the stations of today's session
  LEARN_NEW = 'LEARN_NEW',                       // 認識新朋友: watch, then try with support
  LESSON_LOOP = 'LESSON_LOOP',                   // Listen to the whole lesson, or find its words back in the text
  ENGLISH_LEARN = 'ENGLISH_LEARN',               // English 認識新朋友
  ENGLISH_SENTENCES = 'ENGLISH_SENTENCES',       // English sentences: listen, or find words in them
  PARENT_REPORT = 'PARENT_REPORT',               // 家長專區: weekly report and play-together ideas
  COMPANION_PICK = 'COMPANION_PICK',             // Choosing an adventure companion
  MODE_PICK = 'MODE_PICK',                       // After choosing a player: 環島冒險 or 練習課文
  PRACTICE_LESSONS = 'PRACTICE_LESSONS',         // 練習課文: the child picks a lesson
  PLAYGROUND = 'PLAYGROUND'                      // 遊樂場: every game to choose from, open once today's adventure is done
}
