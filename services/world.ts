import { WordStat } from '../types';

/**
 * The child's world on the home map: everything practised grows there, so spaced review can be seen.
 * A sprout when first met, bigger once remembered, bigger again when remembered days later, and a flower
 * (zhuyin), a tree (characters and words) or an animal (English, hatching from an egg) once learned (學會).
 * Learned things stay grown even after a later mistake.
 */

export type ThingKind = 'zhuyin' | 'word' | 'english';
export type ThingStage = 0 | 1 | 2 | 3; // Just met, remembered once, remembered after a gap, learned

export interface WorldThing {
  key: string;
  label: string; // Said when tapped: ㄇ, 快樂, b, cat
  kind: ThingKind;
  stage: ThingStage;
  emoji: string;
}

const PREFIXES: [string, ThingKind][] = [['zy:', 'zhuyin'], ['w:', 'word'], ['el:', 'english'], ['ew:', 'english']];

const GROWN: Record<ThingKind, string[]> = {
  zhuyin: ['🌸', '🌼', '🌻', '🌷', '🌺'],
  word: ['🌳', '🌲', '🌴'],
  english: ['🐰', '🐿️', '🦔', '🐢', '🦋', '🐞', '🐤', '🐸'],
};
const YOUNG: Record<ThingKind, string[]> = { // Stages 0–2
  zhuyin: ['🌱', '🌱', '🌿'],
  word: ['🌱', '🌱', '🌿'],
  english: ['🥚', '🥚', '🐣'],
};

/** A stable number for a key, so each thing keeps its look and its place. */
export const hashKey = (key: string) => {
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const stageOf = (stat: WordStat): ThingStage =>
  stat.mastered ? 3 : (stat.box ?? 0) >= 2 ? 2 : (stat.box ?? 0) >= 1 ? 1 : 0;

export const worldThings = (stats: Record<string, WordStat> | undefined): WorldThing[] =>
  Object.entries(stats || {}).flatMap(([key, stat]) => {
    const match = PREFIXES.find(([prefix]) => key.startsWith(prefix));
    if (!match) return [];
    const [prefix, kind] = match;
    const stage = stageOf(stat);
    const emoji = stage === 3 ? GROWN[kind][hashKey(key) % GROWN[kind].length] : YOUNG[kind][stage];
    return [{ key, label: key.slice(prefix.length), kind, stage, emoji }];
  });

export const thingFor = (stats: Record<string, WordStat> | undefined, key: string) => worldThings(stats && stats[key] ? { [key]: stats[key] } : {})[0];

export interface PlacedThing extends WorldThing {
  x: number;    // Centre, % of the ground's width
  y: number;    // Bottom, % of the ground's height (farther back is higher up)
  scale: number; // Of one grid cell's height
}

// Columns × rows of the ground, from a few things to many; more things means smaller ones
const GRIDS: [number, number][] = [[4, 3], [6, 4], [8, 5], [10, 6], [12, 7], [14, 8]];
const STAGE_SCALE = [0.55, 0.7, 0.85, 1];

/**
 * Where things stand: a grid with a little wobble, rows farther back drawn smaller. Each thing's cell comes from its key,
 * so things mostly stay put as the world grows. When there are more things than cells, the most grown ones are shown.
 */
export const layoutWorld = (things: WorldThing[]): { placed: PlacedThing[]; hidden: number; cols: number; rows: number } => {
  const [cols, rows] = GRIDS.find(([c, r]) => c * r >= things.length) ?? GRIDS[GRIDS.length - 1];
  const cells = cols * rows;
  const shown = [...things]
    .sort((a, b) => b.stage - a.stage || a.key.localeCompare(b.key))
    .slice(0, cells)
    .sort((a, b) => a.key.localeCompare(b.key));
  const taken: boolean[] = new Array(cells).fill(false);
  const placed = shown.map(thing => {
    const hash = hashKey(thing.key);
    let cell = hash % cells;
    while (taken[cell]) cell = (cell + 1) % cells;
    taken[cell] = true;
    const col = cell % cols;
    const row = Math.floor(cell / cols); // 0 is the back row
    const wobble = (bits: number) => (((hash >>> bits) % 100) / 100 - 0.5) * 0.5;
    const depth = rows > 1 ? row / (rows - 1) : 1;
    return {
      ...thing,
      x: ((col + 0.5 + wobble(8)) / cols) * 100,
      y: 100 - ((row + 0.9 + wobble(16) * 0.4) / rows) * 100,
      scale: (0.75 + 0.4 * depth) * STAGE_SCALE[thing.stage],
    };
  });
  // Back rows first, so nearer things are drawn over them
  placed.sort((a, b) => b.y - a.y);
  return { placed, hidden: things.length - shown.length, cols, rows };
};

/** How many of each kind are learned, for the counters over the world. */
export const worldCounts = (things: WorldThing[]) => ({
  flowers: things.filter(t => t.kind === 'zhuyin' && t.stage === 3).length,
  trees: things.filter(t => t.kind === 'word' && t.stage === 3).length,
  animals: things.filter(t => t.kind === 'english' && t.stage === 3).length,
  growing: things.filter(t => t.stage < 3).length,
});
