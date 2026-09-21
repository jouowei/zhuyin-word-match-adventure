import { useEffect, useState } from 'react';
import { guidancePlaying, onGuidance } from '../utils/chineseAudio';
import { UserProfile } from '../types';

/**
 * 聽完才能按: true while the game is saying the question or the help, so the answers are locked until the child
 * has heard it. Children who tap fast otherwise never hear why they were wrong. A parent can turn it off.
 */
export const useAnswerLock = (user?: Pick<UserProfile, 'listenFirst'>) => {
  const [playing, setPlaying] = useState(() => guidancePlaying());
  useEffect(() => onGuidance(setPlaying), []);
  return user?.listenFirst === false ? false : playing;
};
