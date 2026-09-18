// 錄音比一比: recording starts with the child's voice and stops by itself once they have finished.
import { clipVoice, VoiceDetector, VoiceState } from '../utils/voiceRecorder.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

const CHUNK = 0.05; // seconds per chunk
/** Loudness per chunk: a quiet room, then `voice` seconds of voice, then quiet. */
const room = (seconds: number, level = 0.005) => Array(Math.round(seconds / CHUNK)).fill(level);
const run = (levels: number[], opts = {}) => {
  const detector = new VoiceDetector(CHUNK, opts);
  const states: VoiceState[] = [];
  for (const level of levels) {
    const state = detector.push(level);
    states.push(state);
    if (state === 'done' || state === 'silent') break;
  }
  return { detector, states, last: states[states.length - 1], seconds: states.length * CHUNK };
};

const said = run([...room(0.5), ...room(0.4, 0.2), ...room(2)]);
check('a short sound (ㄠ): recorded, ends by itself', said.last === 'done', said.states.slice(-3));
check('  ...soon after the voice stops', said.seconds < 0.5 + 0.4 + 0.8, said.seconds);
check('  the voice starts where it was said', Math.abs(said.detector.voiceStart * CHUNK - 0.5) < 0.11, said.detector.voiceStart * CHUNK);

const silent = run(room(8));
check('nothing said: silent after 5 seconds', silent.last === 'silent' && Math.abs(silent.seconds - 5) < 0.11, silent.seconds);

const tap = run([...room(0.5), 0.3, ...room(6)]);
check('a single tap on the screen is not a voice', tap.last === 'silent', tap.states.filter(s => s === 'voice').length);

const noisy = run([...room(0.5, 0.03), ...room(0.4, 0.2), ...room(2, 0.03)]);
check('a noisy room: the voice still stands out and ends', noisy.last === 'done' && noisy.detector.voiceStart > 0, noisy.detector.voiceStart);

const atOnce = run([...room(0.15, 0.2), ...room(0.3, 0.2), ...room(2)]);
check('speaking at once: still recorded', atOnce.last === 'done', atOnce.states.slice(0, 6));

const long = run([...room(0.3), ...room(10, 0.2)]);
check('talking on and on: stops after 3 seconds of voice', long.last === 'done' && long.seconds < 0.3 + 3.2, long.seconds);

const withPause = run([...room(0.3), ...room(0.3, 0.2), ...room(0.3), ...room(0.3, 0.2), ...room(2)]);
check('a short pause inside (ㄆ…ㄛ) does not cut it', withPause.detector.lastVoice * CHUNK > 0.9, withPause.detector.lastVoice * CHUNK);

// The clip: the voice with a little margin, made loud enough to hear
const chunks = [...room(0.5, 0), ...room(0.4, 0.1), ...room(1, 0)].map((level, i) => new Float32Array(10).fill(level * (i % 2 ? 1 : -1)));
const clip = clipVoice(chunks, 10, 17, CHUNK);
check('the clip keeps the voice and a little around it', clip.length === (17 + 1 + 3 - (10 - 3)) * 10, clip.length);
check('  quiet voices are made louder', Math.max(...clip.map(Math.abs)) > 0.5, Math.max(...clip.map(Math.abs)));
check('  but never more than 6 times', Math.abs(clipVoice([new Float32Array([0.01, -0.01])], 0, 0, CHUNK)[0]) <= 0.06 + 1e-9);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
