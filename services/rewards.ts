import { RewardCard, UserProfile } from '../types';
import { masteredCount } from './learningStats';

/** Every 10 items learned earn one free family card, on top of buying cards with points. */
export const MILESTONE_SIZE = 10;

export const milestonesAvailable = (user: UserProfile) =>
  Math.floor(masteredCount(user.wordStats) / MILESTONE_SIZE) - (user.milestoneClaims || 0);

/** The player's changes for taking a milestone card, or null when none is waiting. */
export const claimMilestoneCard = (user: UserProfile, card: RewardCard): Partial<UserProfile> | null =>
  milestonesAvailable(user) > 0
    ? { ownedCardIds: [...user.ownedCardIds, card.id], milestoneClaims: (user.milestoneClaims || 0) + 1 }
    : null;

/** The player's changes for buying a card, or null when there aren't enough points. */
export const buyCard = (user: UserProfile, card: RewardCard): Partial<UserProfile> | null =>
  user.points >= card.cost
    ? { points: user.points - card.cost, ownedCardIds: [...user.ownedCardIds, card.id] }
    : null;
