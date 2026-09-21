import { useEffect, useState } from 'react';
import { onOwnRun, ownRun } from '../services/streak';

/** How many answers in a row the child has got without help (services/streak.ts). */
export const useOwnRun = () => {
  const [run, setRun] = useState(() => ownRun());
  useEffect(() => onOwnRun(setRun), []);
  return run;
};
