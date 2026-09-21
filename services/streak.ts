/**
 * 一次就答對: how many answers in a row the child got without help. Points are abstract at six or seven, so this is
 * what the game shows off — a row of stars that fills up, and the companion cheering at every third one.
 * Any hint or wrong answer ends the run.
 */
export const OWN_RUN_GOAL = 3;

let run = 0;
const listeners = new Set<(run: number) => void>();
const notify = () => listeners.forEach(listener => listener(run));

export const ownRun = () => run;

/** Returns the unsubscribe function. */
export const onOwnRun = (listener: (run: number) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** Call on every answer; true when the run has just reached another full set of three. */
export const noteOwnAnswer = (onOwn: boolean) => {
  run = onOwn ? run + 1 : 0;
  notify();
  return onOwn && run % OWN_RUN_GOAL === 0;
};

/** A wrong answer ends the run. */
export const endOwnRun = () => {
  if (!run) return;
  run = 0;
  notify();
};

/** Stars to show: the run fills up again after every cheer. */
export const ownRunStars = (current = run) => current % OWN_RUN_GOAL;
