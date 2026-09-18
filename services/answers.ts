import { Confusion, EnglishRoundItem, EnglishUnit, Skill, UserProfile } from '../types';
import { isReviewDue, logAnswer, logMistake, logNewItems } from './activityLog';
import { isEnglishKey, recordIntroduced, recordMistake, recordSkill, recordSuccess } from './learningStats';
import { MASTERY_BONUS, pointsFor } from './scaffolding';
import { StationResult } from './dailyPath';

/**
 * What an answer does to the player's record: points, the parent report's activity log, spaced review and skills.
 * Kept free of React so the rules can be tested; hooks/useAnswers.ts applies them to the current player.
 */

export interface AnswerRecord {
  key: string;           // Stat key: 'w:快樂', 'zy:ㄇ', 'el:b', 'ew:cat'
  helpLevel: number;     // 0: answered on own
  tracksMemory: boolean; // False where the game can't tell what the child remembers (speech recognition, tracing)
  skill?: Skill;
  now: number;
}

/** Points go to answers given without help (fewer with help), and the item moves on in spaced review. */
export const applyAnswer = (user: UserProfile, answer: AnswerRecord): { user: UserProfile; mastered: boolean } => {
  const { key, helpLevel, tracksMemory, skill, now } = answer;
  const independent = helpLevel === 0;
  const result = tracksMemory ? recordSuccess(user.wordStats, key, independent, now) : { stats: user.wordStats, mastered: false };
  const review = tracksMemory && isReviewDue(user.wordStats?.[key], now);
  return {
    mastered: result.mastered,
    user: {
      ...user,
      points: user.points + pointsFor(helpLevel) + (result.mastered ? MASTERY_BONUS : 0),
      activity: logAnswer(user.activity, now, { independent, review, mastered: result.mastered, english: isEnglishKey(key) }),
      // Answers on own per skill let support fade: writing stages, blending before spelling, tone comparison
      wordStats: skill && independent ? recordSkill(result.stats, key, skill) : result.stats,
    },
  };
};

/** A wrong answer brings the item back soon (spaced review box 0); the mistake always goes into the parent report. */
export const applyMistake = (
  user: UserProfile, mistake: { key: string; confusion?: Confusion; tracksMemory: boolean; now: number },
): UserProfile => {
  const { key, confusion, tracksMemory, now } = mistake;
  return {
    ...user,
    wordStats: tracksMemory ? recordMistake(user.wordStats, key, now) : user.wordStats,
    activity: logMistake(user.activity, now, { review: tracksMemory && isReviewDue(user.wordStats?.[key], now), confusion, english: isEnglishKey(key) }),
  };
};

/** Items met in 認識新朋友 come back for practice later today. */
export const applyIntroduced = (user: UserProfile, keys: string[], now: number): UserProfile => ({
  ...user,
  wordStats: keys.reduce((stats, key) => recordIntroduced(stats, key, now), user.wordStats || {}),
  activity: logNewItems(user.activity, now, keys.length),
});

/** What a game level's answers say about the child. */
export interface LevelRules {
  tracksMemory: boolean;        // A correct answer counts as remembering
  mistakesTrackMemory: boolean; // A wrong answer counts as forgetting
  skill?: Skill;                // Answers on own count towards this skill
}

/** Chinese levels 1–8. */
export const chineseLevelRules = (level: number): LevelRules => ({
  // Speech recognition (4) misjudges children too often to count as remembering (or forgetting) a word;
  // 字的家族 (7) and 部件偵探 (8) are about how words and characters are built
  tracksMemory: level !== 4 && level !== 7 && level !== 8,
  mistakesTrackMemory: level !== 7 && level !== 8,
  skill: ({ 3: 'write', 5: 'spell', 6: 'tone' } as Record<number, Skill>)[level],
});

/** English levels 1–5. */
export const englishLevelRules = (level: number, unitKind: EnglishUnit['kind'], traceCase?: EnglishRoundItem['traceCase']): LevelRules => ({
  // Tracing letters and speech recognition (4) don't show whether the child remembers the letter or word;
  // 押韻家族 (5) asks about word endings, not about remembering the word
  tracksMemory: level !== 4 && level !== 5 && !(level === 3 && unitKind === 'letters'),
  mistakesTrackMemory: level !== 5,
  // Answers on own let writing support and the blending step fade
  skill: level !== 3 ? undefined : unitKind === 'words' ? 'spell' : traceCase === 'upper' ? 'writeUpper' : 'write',
});

export const EMPTY_TALLY: StationResult = { onOwn: 0, total: 0 };

/** One more answer in a round's count for 今日冒險. */
export const addToTally = (tally: StationResult, helpLevel: number): StationResult => ({
  onOwn: tally.onOwn + (helpLevel === 0 ? 1 : 0),
  total: tally.total + 1,
});

export const tallyOf = (helpLevels: number[]): StationResult => helpLevels.reduce(addToTally, EMPTY_TALLY);
