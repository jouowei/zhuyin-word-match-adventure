import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { phonemize } from 'phonemizer';
import { synth, tidy, toMp3, transcribe, writeFile } from './lib.mjs';

/** Second pass: more ways to say the clips Whisper didn't hear right, and phonics sounds Whisper can recognise. */
const PROJECT = fileURLToPath(new URL('../..', import.meta.url));
const OUT_DIR = path.join(PROJECT, 'public/audio/english');
const here = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(here, 'report.json');
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(here, 'inventory.json'), 'utf8'));

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const norm = text => text.toLowerCase().replace(/\b(\d{1,2})\b/g, (m, n) => NUMBERS[Number(n)] ?? m).replace(/-/g, ' ').replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const padded = samples => { const out = new Float32Array(samples.length + 24000); out.set(samples, 12000); return out; };

const tryCandidates = async (candidates, accept) => {
  const tries = [];
  for (const { input, voice, speed } of candidates) {
    const samples = tidy(await synth(input, { voice, speed }));
    const heard = await transcribe(padded(samples));
    tries.push({ input, voice, speed, heard });
    if (accept(norm(heard))) return { samples, input, voice, speed, heard, tries };
  }
  return { tries };
};

const save = (clip, found, status) => {
  writeFile(path.join(OUT_DIR, `${clip.file}.mp3`), toMp3(found.samples));
  report[clip.key] = { ...report[clip.key], status, voice: found.voice, speed: found.speed, heard: found.heard, input: found.input, tries: found.tries.length };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
};

for (const clip of inventory) {
  const entry = report[clip.key];
  if (!entry) continue;

  if (clip.kind === 'sound' && entry.status === 'unverified') {
    // "buh": the consonant with a short, light vowel; Whisper hears a real "buh" as buh/bu/bah
    const phonemes = clip.phonemes.replace(/\.$/, '');
    const say = clip.key;
    const VOWELS = { eh: ['eh', 'e', 'ehh'], ah: ['ah', 'aah', 'ahh', 'a'], uh: ['uh', 'uhh', 'huh', 'ah'] };
    const consonant = phonemes.replace(/ʌ$/, '');
    const forms = VOWELS[say] ? [phonemes, `${phonemes}ː`] : [`${consonant}ʌ`, `${consonant}ːʌ`, `${consonant}ə`, `${consonant}ɐ`, `${consonant}ʊ`];
    const root = say.replace(/uh$/, '').replace(/^(.)\1+$/, '$1'); // buh → b, mmm → m
    const accepted = new Set(VOWELS[say] || [say, `${root}uh`, `${root}u`, `${root}ah`, `${root}a`, `${root}uh ${root}uh`]);
    const candidates = forms.flatMap(form => [0.9, 1.0].map(speed => ({ input: { phonemes: `${form}.` }, voice: 'af_heart', speed })));
    const found = await tryCandidates(candidates, heard => accepted.has(heard));
    if (found.samples) save(clip, found, 'pass');
    console.log(`sound ${say.padEnd(6)} ${found.samples ? `pass ${JSON.stringify(found.heard)} ${found.input.phonemes}` : `still unverified: ${found.tries.map(t => t.heard).join(' | ')}`}`);
    continue;
  }

  if (entry.status !== 'fail') continue;
  const expect = clip.expect.map(norm);
  const text = clip.text;
  const base = (await phonemize(text.replace(/\.$/, ''), 'en-us')).join(' ');
  // A clearer word-initial f (Kokoro tends towards v when a word starts with f)
  const longF = base.replace(/^f/, 'fː');
  const forms = [{ text }, { text: `${text.replace(/[.!?]$/, '')}!` }, { text: `${text.replace(/[.!?]$/, '')}?` }, ...(longF !== base ? [{ phonemes: `${longF}.` }] : [])];
  const candidates = [
    ...forms.flatMap(input => [0.8, 1.05, 1.15].map(speed => ({ input, voice: 'af_heart', speed }))),
    ...forms.slice(0, 2).flatMap(input => ['af_nicole', 'af_sarah', 'af_bella'].flatMap(voice => [0.9, 1.0].map(speed => ({ input, voice, speed })))),
  ];
  const found = await tryCandidates(candidates, heard => expect.includes(heard));
  if (found.samples) save(clip, found, 'pass');
  console.log(`${clip.kind} ${clip.key.padEnd(10)} ${found.samples ? `pass ${JSON.stringify(found.heard)} (${found.voice} ${found.speed} ${JSON.stringify(found.input)})` : `still fail: ${found.tries.slice(0, 6).map(t => t.heard).join(' | ')}`}`);
}

const statuses = Object.values(report).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
console.log('FIX DONE', statuses);
console.log('needs listening:', Object.entries(report).filter(([, r]) => r.status !== 'pass').map(([k, r]) => `${k} (${r.status}, heard ${JSON.stringify(r.heard)})`).join('; '));
