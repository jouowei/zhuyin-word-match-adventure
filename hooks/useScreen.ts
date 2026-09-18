import { useEffect, useRef, useState } from 'react';
import { GameState } from '../types';

/** Which screen is showing, and whether the loading screen is up while a round is prepared. */
export const useScreen = () => {
  const [current, goTo] = useState<GameState>(GameState.LOGIN);
  const [busy, setBusy] = useState(false);
  // Latest screen for callbacks fired from timers inside game views
  const currentRef = useRef(current);
  currentRef.current = current;

  // Start each new screen from the top
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [current]);

  return {
    current,
    goTo,
    /** Still on this screen (a timer set during a round may fire after the child left it). */
    showing: (screen: GameState) => currentRef.current === screen,
    busy,
    setBusy,
  };
};

export type Screen = ReturnType<typeof useScreen>;
