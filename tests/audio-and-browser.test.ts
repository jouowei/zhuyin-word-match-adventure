import { createHash } from 'crypto';
import { detectInAppBrowser, externalBrowserUrl } from '../utils/browserSupport';
import { clipStretch, stretchSamples } from '../utils/englishClips';
import { isResetCode, sha256 } from '../services/parentLock';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

// In-app browsers (LINE has no speech synthesis)
const agents: [string, ReturnType<typeof detectInAppBrowser>][] = [
  ['Mozilla/5.0 (Linux; Android 16; SM-F9660 Build/BP4A.251205.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/151.0.7922.199 Mobile Safari/537.36 Line/26.14.0/IAB', 'line'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/26.14.1', 'line'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36', null],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1', null],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', null],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]', 'other'],
];
for (const [agent, want] of agents) check(`browser ${want ?? 'normal'}: ${agent.slice(13, 40)}`, detectInAppBrowser(agent) === want);
check('LINE external link', externalBrowserUrl('https://x.run.app/?a=1') === 'https://x.run.app/?a=1&openExternalBrowser=1');

// Slower English clips keep their pitch
const rate = 24000;
const tone = new Float32Array(rate * 0.8).map((_, i) => Math.sin((2 * Math.PI * 220 * i) / rate) * (0.3 + 0.5 * Math.sin((Math.PI * i) / (rate * 0.8))));
const pitch = (x: Float32Array, from: number, to: number) => { let n = 0; for (let i = from + 1; i < to; i++) if (x[i - 1] < 0 && x[i] >= 0) n++; return n / ((to - from) / rate); };
for (const factor of [1.6, 2]) {
  const out = stretchSamples(tone, rate, factor);
  let last = out.length - 1;
  while (last > 0 && Math.abs(out[last]) < 1e-4) last--;
  const seconds = last / rate;
  const hz = pitch(out, Math.round(rate * 0.1), Math.round(last * 0.9));
  check(`stretch x${factor} length`, Math.abs(seconds - 0.8 * factor) < 0.1, seconds.toFixed(2));
  check(`stretch x${factor} pitch`, Math.abs(hz - 220) < 5, Math.round(hz));
}
check('normal speeds are not stretched', clipStretch(0.9) === 1 && clipStretch(0.75) === 1);
check('slow speeds are stretched up to 2x', clipStretch(0.4) === 2 && clipStretch(0.35) === 2);

// Parent password hash
const texts = ['', 'abc', '1234', '家長密碼', 'a'.repeat(55), 'b'.repeat(56), 'c'.repeat(64), 'd'.repeat(119), '混合 mix 🦁 123'];
check('sha256 matches node crypto', texts.every(t => sha256(t) === createHash('sha256').update(t, 'utf8').digest('hex')));
check('reset code', isResetCode(' AU4A83 ') && !isResetCode('密碼'));

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
