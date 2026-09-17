import { EnglishRoundItem, EnglishUnit } from '../types';

/**
 * Rhyme families (onset + rime: c-at, h-at, b-at). Children hear rhymes before single sounds
 * (Anthony & Lonigan 2004), and word families let them read new words by analogy.
 * Only words with a clear picture; the picture shows up with the sound, the written word after choosing.
 */
export interface RhymeFamily {
  rime: string;
  words: [string, string][]; // word, picture
}

export const RHYME_FAMILIES: RhymeFamily[] = [
  { rime: 'at', words: [['cat', '🐱'], ['hat', '👒'], ['bat', '🦇'], ['rat', '🐀']] },
  { rime: 'an', words: [['van', '🚐'], ['pan', '🍳'], ['can', '🥫'], ['man', '👨']] },
  { rime: 'ap', words: [['map', '🗺️'], ['cap', '🧢'], ['nap', '😴']] },
  { rime: 'ag', words: [['bag', '👜'], ['flag', '🚩'], ['tag', '🏷️']] },
  { rime: 'en', words: [['hen', '🐔'], ['pen', '🖊️'], ['ten', '🔟']] },
  { rime: 'et', words: [['net', '🥅'], ['jet', '✈️'], ['wet', '💦']] },
  { rime: 'ed', words: [['bed', '🛏️'], ['red', '🔴'], ['sled', '🛷']] },
  { rime: 'ig', words: [['pig', '🐷'], ['dig', '⛏️']] },
  { rime: 'in', words: [['pin', '📌'], ['bin', '🗑️'], ['win', '🏆']] },
  { rime: 'ip', words: [['lip', '👄'], ['ship', '🚢']] },
  { rime: 'og', words: [['dog', '🐶'], ['log', '🪵'], ['frog', '🐸']] },
  { rime: 'ot', words: [['pot', '🍲'], ['hot', '🔥'], ['dot', '⚫']] },
  { rime: 'op', words: [['hop', '🦘'], ['top', '🔝']] },
  { rime: 'ox', words: [['fox', '🦊'], ['box', '📦']] },
  { rime: 'ug', words: [['bug', '🐛'], ['hug', '🤗']] },
  { rime: 'un', words: [['sun', '☀️'], ['run', '🏃'], ['bun', '🍞']] },
  { rime: 'ut', words: [['nut', '🥜'], ['cut', '✂️'], ['hut', '🛖']] },
  { rime: 'ee', words: [['bee', '🐝'], ['tree', '🌳'], ['three', '3️⃣']] },
  { rime: 'ake', words: [['cake', '🎂'], ['snake', '🐍'], ['lake', '🏞️']] },
  { rime: 'oon', words: [['moon', '🌙'], ['spoon', '🥄'], ['balloon', '🎈']] },
];

const familyOf = (word: string) => RHYME_FAMILIES.find(f => f.words.some(([w]) => w === word.toLowerCase()));

/** A word unit gets the rhyme game when at least two of its words belong to a family. */
export const hasRhymeFamilies = (unit: EnglishUnit) =>
  unit.kind === 'words' && (unit.words || []).filter(w => familyOf(w.word)).length >= 2;

export interface RhymeCard {
  word: string;
  emoji: string;
  member: boolean; // Same rime as the question word
}

export interface RhymeQuestion {
  item: EnglishRoundItem; // The question word; matched when all rhyming cards are found
  rime: string;
  cards: RhymeCard[];
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/** Families with the unit's words come first, so the game follows the unit (short a → -at, -an, -ap…). */
export const buildRhymeRound = (unit: EnglishUnit, count = 3): RhymeQuestion[] | null => {
  const unitWords = new Set((unit.words || []).map(w => w.word.toLowerCase()));
  const inUnit = (f: RhymeFamily) => f.words.some(([w]) => unitWords.has(w));
  const families = [...shuffle(RHYME_FAMILIES.filter(inUnit)), ...shuffle(RHYME_FAMILIES.filter(f => !inUnit(f)))].slice(0, count);
  if (families.length < count) return null;
  const stamp = Date.now();

  return families.map((family, index) => {
    // The question word: one the child met in this unit when possible
    const [head, ...others] = [...shuffle(family.words.filter(([w]) => unitWords.has(w))), ...shuffle(family.words.filter(([w]) => !unitWords.has(w)))];
    const members = others.slice(0, Math.min(others.length, Math.random() < 0.5 ? 1 : 2) || 1);
    const cards: RhymeCard[] = members.map(([word, emoji]) => ({ word, emoji, member: true }));
    const pictures = new Set([head[1], ...members.map(([, e]) => e)]);
    for (const [word, emoji] of shuffle(RHYME_FAMILIES.filter(f => f.rime !== family.rime).flatMap(f => f.words))) {
      if (cards.length >= 4) break;
      if (pictures.has(emoji) || word.endsWith(family.rime)) continue;
      pictures.add(emoji);
      cards.push({ word, emoji, member: false });
    }
    return {
      item: { id: `rhyme-${stamp}-${index}`, kind: 'word', text: head[0], keyword: head[0], emoji: head[1], zh: '', matched: false },
      rime: family.rime,
      cards: shuffle(cards),
    };
  });
};
