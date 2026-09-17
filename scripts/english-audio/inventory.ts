import fs from 'fs';
import { LETTERS } from '../../english/letters.ts';
import { ENGLISH_UNITS } from '../../english/curriculum.ts';
import { RHYME_FAMILIES } from '../../english/families.ts';

// Key as the app will look it up: lower case, no surrounding punctuation
const key = (text: string) => text.toLowerCase().replace(/^[\s"'“”]+|[\s.!?,"'“”]+$/g, '').replace(/\s+/g, ' ');
const slug = (text: string) => key(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Clip { key: string; file: string; kind: 'name' | 'sound' | 'word' | 'sentence' | 'praise'; text?: string; phonemes?: string; expect: string[]; aliases?: string[] }
const clips = new Map<string, Clip>();
const add = (clip: Clip) => { if (!clips.has(clip.key)) clips.set(clip.key, clip); };

const HOMOPHONES: Record<string, string[]> = {
  a: ['a', 'ay', 'eh', 'hey'], b: ['b', 'be', 'bee'], c: ['c', 'see', 'sea'], d: ['d', 'dee'], e: ['e', 'ee'], f: ['f', 'ef', 'eff'], g: ['g', 'gee', 'jee'],
  h: ['h', 'age', 'aitch', 'eight', '8'], i: ['i', 'eye', 'aye', 'ai'], j: ['j', 'jay'], k: ['k', 'kay', 'okay', 'ok'], l: ['l', 'el', 'elle'], m: ['m', 'em'],
  n: ['n', 'en', 'and'], o: ['o', 'oh', 'owe'], p: ['p', 'pee', 'pea'], q: ['q', 'cue', 'queue'], r: ['r', 'are', 'our'], s: ['s', 'es', 'ess', 'yes'],
  t: ['t', 'tea', 'tee'], u: ['u', 'you', 'yu'], v: ['v', 'vee'], w: ['w', 'double you', 'double u'], x: ['x', 'ex', 'ax'], y: ['y', 'why'], z: ['z', 'zee', 'zed'],
};

for (const l of LETTERS) {
  add({ key: key(l.name), file: `letter-${l.lower}`, kind: 'name', text: `${l.upper}.`, expect: HOMOPHONES[l.lower], aliases: [l.lower] });
}
// Phonics sounds as a short "buh": Whisper can't judge these, so they are listed for listening
const SOUND_PHONEMES: Record<string, string> = {
  b: 'bʌ', c: 'kʌ', d: 'dʌ', e: 'ˈɛ', f: 'fʌ', g: 'ɡʌ', h: 'hʌ', j: 'dʒʌ', k: 'kʌ', l: 'lʌ', m: 'mʌ', n: 'nʌ', o: 'ˈɑː',
  p: 'pʌ', q: 'kwʌ', r: 'ɹʌ', s: 'sʌ', t: 'tʌ', u: 'ˈʌ', v: 'vʌ', w: 'wʌ', y: 'jʌ', z: 'zʌ',
};
for (const l of LETTERS) {
  if (l.say) add({ key: key(l.say), file: `sound-${slug(l.say)}`, kind: 'sound', phonemes: `${SOUND_PHONEMES[l.lower]}.`, expect: [] });
}
const word = (w: string) => add({ key: key(w), file: `word-${slug(w)}`, kind: 'word', text: w, expect: [key(w).replace(/-/g, ' ')] });
LETTERS.forEach(l => { word(l.keyword); l.examples.forEach(word); });
ENGLISH_UNITS.forEach(u => (u.words || []).forEach(w => word(w.word)));
RHYME_FAMILIES.forEach(f => f.words.forEach(([w]) => word(w)));
ENGLISH_UNITS.forEach(u => (u.sentences || []).forEach(s => {
  s.split(' ').map(t => t.toLowerCase().replace(/[^a-z-]/g, '')).filter(Boolean).forEach(word);
  add({ key: key(s), file: `sentence-${slug(s)}`, kind: 'sentence', text: s, expect: [key(s)] });
}));
['Great job!', 'Awesome!', 'Well done!', 'You did it!', 'Super!'].forEach(p => add({ key: key(p), file: `praise-${slug(p)}`, kind: 'praise', text: p, expect: [key(p)] }));

const list = [...clips.values()];
fs.writeFileSync(new URL('./inventory.json', import.meta.url), JSON.stringify(list, null, 1));
const count = (k: string) => list.filter(c => c.kind === k).length;
console.log('total', list.length, { name: count('name'), sound: count('sound'), word: count('word'), sentence: count('sentence'), praise: count('praise') });
const files = list.map(c => c.file); console.log('duplicate files', files.length - new Set(files).size);
