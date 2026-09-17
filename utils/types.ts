
export interface WordItem {
  id: string;
  character: string; // The Chinese Word (e.g., 日出)
  zhuyin: string;    // The Bopomofo (e.g., ㄖˋ ㄔㄨ)
  emoji: string;     // Fallback emoji
  imageUrl?: string; // AI Generated Image URL (Base64)
  matched: boolean;
}

export interface GameLevel {
  id: number;
  items: WordItem[];
  theme: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // The full text/story
  vocabulary: string[]; // List of specific words to learn from this lesson
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

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji avatar
  points: number;
  ownedCardIds: string[];
  createdAt: number;
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
  LESSON_INTRO = 'LESSON_INTRO'    // Read content before playing
}
