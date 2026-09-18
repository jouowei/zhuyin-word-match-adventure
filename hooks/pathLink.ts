import { StationResult } from '../services/dailyPath';

/**
 * How rounds started from 今日冒險 report back to it. The path hook starts the rounds, so it is set up after them;
 * App passes these on to the rounds and they are called once the path hook exists.
 */
export interface PathLink {
  finish: (result: StationResult) => void; // The station's round or activity ended
  replay: (level: number) => void;         // 再玩一組: the same station again
  mastered: (label: string) => void;       // Learned during the path: shown in today's results
}
