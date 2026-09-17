import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { phonemize } from 'phonemizer';
import { synth, tidy, toMp3, transcribe, writeFile } from './lib.mjs';

/**
 * Remake the clips from phonemes in the form Kokoro v1.0 was trained on (misaki: one symbol per diphthong),
 * which kokoro-js doesn't do by itself: with eSpeak's two-symbol "ɔɪ", "boy" comes out as "bye".
 * A clip is replaced only when Whisper hears the new one correctly, so nothing gets worse.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = fileURLToPath(new URL('../..', import.meta.url));
const OUT_DIR = path.join(PROJECT, 'public/audio/english');
const REPORT = path.join(here, 'report.json');
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(here, 'inventory.json'), 'utf8'));

export const toMisaki = ipa => ipa
  .replace(/eɪ/g, 'A').replace(/aɪ/g, 'I').replace(/oʊ/g, 'O').replace(/aʊ/g, 'W').replace(/ɔɪ/g, 'Y')
  .replace(/dʒ/g, 'ʤ').replace(/tʃ/g, 'ʧ')
  .replace(/ɜː/g, 'ɜ').replace(/ː/g, '').replace(/ɐ/g, 'ə').replace(/ᵻ/g, 'ɪ')
  .replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ʲ/g, 'j').replace(/ɬ/g, 'l');

/** Phonemes with the punctuation kept, like kokoro-js does. */
const textToPhonemes = async text => {
  const parts = text.split(/([,.!?;:]+\s*)/).filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (/^[,.!?;:]+\s*$/.test(part)) out.push(part.trim() + ' ');
    else out.push((await phonemize(part, 'en-us')).join(' '));
  }
  return toMisaki(out.join('').replace(/\s+/g, ' ').trim());
};

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const norm = text => text.toLowerCase().replace(/\b(\d{1,2})\b/g, (m, n) => NUMBERS[Number(n)] ?? m).replace(/-/g, ' ').replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
// Whisper can't tell these apart by sound
const SAME_SOUND = { by: ['bye', 'buy'], high: ['hi'], your: ["you're"], the: ['thee', 'thuh'] };
const padded = samples => { const out = new Float32Array(samples.length + 24000); out.set(samples, 12000); return out; };

// Phonics sounds Whisper can't confirm: a glottal stop keeps "buh" from gliding into "bye" (heard as "but", "cut")
const CHOSEN_SOUNDS = { buh: 'bʌʔ', kuh: 'kʌʔ', kwuh: 'kwˈʌʔ', suh: 'sə', yuh: 'jˈʌʔ', uh: 'ˈʌʔ', ah: 'ˈɑ' };

const save = (clip, samples, fields) => {
  writeFile(path.join(OUT_DIR, `${clip.file}.mp3`), toMp3(samples));
  report[clip.key] = { ...report[clip.key], ...fields, seconds: +(samples.length / 24000).toFixed(2) };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
};

const t0 = Date.now();
let n = 0;
for (const clip of inventory) {
  n++;
  const entry = report[clip.key];
  if (entry?.misaki !== undefined) continue; // Done in an earlier run of this script

  if (clip.kind === 'sound') {
    if (CHOSEN_SOUNDS[clip.key]) {
      const phonemes = `${CHOSEN_SOUNDS[clip.key]}.`;
      const samples = tidy(await synth({ phonemes }, { voice: 'af_heart', speed: 0.95 }));
      const heard = await transcribe(padded(samples));
      save(clip, samples, { status: 'chosen', voice: 'af_heart', speed: 0.95, heard, input: { phonemes }, misaki: true });
      console.log(`[${n}] sound ${clip.key} chosen ${phonemes} heard ${JSON.stringify(heard)}`);
    } else {
      report[clip.key] = { ...entry, misaki: false };
    }
    continue;
  }

  const phonemes = await textToPhonemes(clip.text);
  const expect = [...clip.expect, ...(SAME_SOUND[clip.key] || [])].map(norm);
  let result = null;
  const tries = [];
  for (const [voice, speed] of [['af_heart', 0.95], ['af_heart', 1.05], ['af_heart', 0.9]]) {
    const samples = tidy(await synth({ phonemes }, { voice, speed }));
    const heard = await transcribe(padded(samples));
    tries.push(heard);
    if (expect.includes(norm(heard))) { result = { samples, voice, speed, heard }; break; }
  }
  if (result) {
    save(clip, result.samples, { status: 'pass', voice: result.voice, speed: result.speed, heard: result.heard, input: { phonemes }, misaki: true });
  } else {
    // Keep the earlier clip, but homophones Whisper wrote differently count as heard right
    const sameSound = entry && expect.includes(norm(entry.heard));
    report[clip.key] = { ...entry, status: sameSound ? 'pass' : entry.status, misaki: false, misakiTries: tries };
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
  }
  console.log(`[${n}/${inventory.length}] ${clip.kind} ${clip.key.padEnd(24)} ${result ? `misaki ${JSON.stringify(result.heard)} (${result.speed})` : `kept earlier (${report[clip.key].status}); misaki heard ${tries.join(' | ')}`}  ${phonemes}`);
}

const statuses = Object.values(report).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
const misaki = Object.values(report).filter(r => r.misaki).length;
console.log('GEN2 DONE', statuses, 'misaki clips', misaki, 'minutes', ((Date.now() - t0) / 60000).toFixed(1));
console.log('not pass:', Object.entries(report).filter(([, r]) => r.status !== 'pass').map(([k, r]) => `${k} (${r.status}, heard ${JSON.stringify(r.heard)})`).join('; '));
