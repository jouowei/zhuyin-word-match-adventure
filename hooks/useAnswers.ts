import { Confusion, Skill, UserProfile } from '../types';
import { applyAnswer, applyIntroduced, applyMistake } from '../services/answers';
import { MASTERY_BONUS } from '../services/scaffolding';
import { Family } from './useFamilyData';

export interface Answer {
  key: string;
  label: string;          // Shown when the item is learned: 學會了「…」
  helpLevel: number;
  tracksMemory: boolean;  // False where the game can't tell what the child remembers (speech recognition, tracing)
  skill?: Skill;
  inPath?: boolean;       // Part of 今日冒險
  extra?: (user: UserProfile) => Partial<UserProfile>; // More changes, such as a round's stars
}

/** Records the current player's answers: points, spaced review and the parent report (rules in services/answers.ts). */
export const useAnswers = ({ family, celebrate, onMasteredInPath }: {
  family: Family;
  celebrate: (text: string) => void;
  onMasteredInPath: (label: string) => void;
}) => {
  const rewardAnswer = (answer: Answer) => {
    const before = family.latestPlayer();
    if (!before) return;
    const now = Date.now();
    if (applyAnswer(before, { ...answer, now }).mastered) {
      celebrate(`學會了「${answer.label}」！ +${MASTERY_BONUS}分`);
      if (answer.inPath) onMasteredInPath(answer.label);
    }
    family.updatePlayer(u => ({ ...applyAnswer(u, { ...answer, now }).user, ...answer.extra?.(u) }));
  };

  /** `tracksMemory` is false for tasks that don't show what the child remembers; the mistake still goes into the parent report. */
  const recordMistake = (key: string, confusion?: Confusion, tracksMemory = true) => {
    const now = Date.now();
    family.updatePlayer(u => applyMistake(u, { key, confusion, tracksMemory, now }));
  };

  /** New items met in 認識新朋友 come back for practice later today. */
  const recordIntroduced = (keys: string[]) => {
    const now = Date.now();
    family.updatePlayer(u => applyIntroduced(u, keys, now));
  };

  /** Whether the child has practised this item before (only those count for review in 課文尋寶 and 句子尋寶). */
  const practised = (key: string) => !!family.latestPlayer()?.wordStats?.[key];

  return { rewardAnswer, recordMistake, recordIntroduced, practised };
};

export type Answers = ReturnType<typeof useAnswers>;
