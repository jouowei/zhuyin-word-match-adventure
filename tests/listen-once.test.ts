// One try at the microphone always ends with exactly one outcome, whatever the phone's recognizer does.
import { pinyin } from 'pinyin-pro';
import { describeOutcome, saidZhuyin, SpeechOutcome } from '../services/speechMatch.ts';
import { listenOnce } from '../utils/listenOnce.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const toPinyin = (text: string) => pinyin(text, { toneType: 'none', type: 'array', v: true }) as string[];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

type Step = ['audiostart' | 'speechstart' | 'end'] | ['result', string[], boolean] | ['error', string];
let script: Step[] = [];
let aborted = 0;
class FakeRecognition {
  [key: string]: any;
  start() {
    setTimeout(async () => {
      for (const step of script) {
        await wait(5);
        if (step[0] === 'result') {
          const result = Object.assign(step[1].map(transcript => ({ transcript })), { isFinal: step[2] });
          this.onresult?.({ results: [result] });
        } else if (step[0] === 'error') this.onerror?.({ error: step[1] });
        else this['on' + step[0]]?.();
      }
    }, 1);
  }
  stop() { setTimeout(() => this.onend?.(), 1); }
  abort() { aborted++; }
}
(globalThis as any).window = { webkitSpeechRecognition: FakeRecognition };

/** Plays the phone's events for a child saying ㄆ, and collects every outcome. */
const tryWith = async (steps: Step[], timeoutMs = 300) => {
  script = steps;
  const outcomes: SpeechOutcome[] = [];
  let ready = false;
  listenOnce({ lang: 'zh-TW', isMatch: heard => saidZhuyin('ㄆ', heard, toPinyin), onOutcome: o => outcomes.push(o), onReady: () => (ready = true), timeoutMs });
  await wait(timeoutMs + 2800);
  return { outcomes, ready };
};

(async () => {
  const heardPartway = await tryWith([['audiostart'], ['speechstart'], ['result', ['破'], false], ['error', 'no-match'], ['end']]);
  check('heard part-way, then "no match": still a match', heardPartway.outcomes.length === 1 && heardPartway.outcomes[0].kind === 'match', heardPartway.outcomes);
  check('the microphone opening is reported', heardPartway.ready);

  const final = await tryWith([['audiostart'], ['result', ['潑', '波'], true], ['end']]);
  check('a final result that sounds like ㄆ', final.outcomes.length === 1 && final.outcomes[0].kind === 'match', final.outcomes);

  const wrong = await tryWith([['audiostart'], ['result', ['貓'], true], ['end']]);
  check('a different sound: heard, not a match', wrong.outcomes.length === 1 && wrong.outcomes[0].kind === 'heard' && describeOutcome(wrong.outcomes[0]) === '手機聽到：貓', wrong.outcomes);

  const silent = await tryWith([['end']]);
  check('ends with nothing at all: one silent outcome', silent.outcomes.length === 1 && silent.outcomes[0].kind === 'silent', silent.outcomes);
  check('  the parent is told the microphone never opened', describeOutcome(silent.outcomes[0]) === '手機的麥克風沒有開始收音');

  const abortedTry = await tryWith([['audiostart'], ['speechstart'], ['error', 'aborted'], ['end']]);
  check('"aborted" still answers the child', abortedTry.outcomes.length === 1 && abortedTry.outcomes[0].kind === 'silent', abortedTry.outcomes);
  check('  the parent sees why', describeOutcome(abortedTry.outcomes[0]) === '手機有聽到聲音，但認不出字（aborted）');

  const noSpeech = await tryWith([['audiostart'], ['error', 'no-speech'], ['end']]);
  check('no speech', noSpeech.outcomes.length === 1 && describeOutcome(noSpeech.outcomes[0]) === '手機沒有聽到聲音（no-speech）', noSpeech.outcomes);

  const network = await tryWith([['error', 'network'], ['end']]);
  check('a network error is one outcome', network.outcomes.length === 1 && network.outcomes[0].kind === 'error' && describeOutcome(network.outcomes[0]).includes('network'), network.outcomes);

  const language = await tryWith([['error', 'language-not-supported'], ['end']]);
  check('language not supported', language.outcomes.length === 1 && describeOutcome(language.outcomes[0]).includes('language-not-supported'));

  const denied = await tryWith([['error', 'not-allowed'], ['end']]);
  check('no microphone permission', denied.outcomes.length === 1 && denied.outcomes[0].kind === 'denied', denied.outcomes);

  const hangs = await tryWith([['audiostart']], 200);
  check('keeps listening: stopped, and answered once', hangs.outcomes.length === 1 && hangs.outcomes[0].kind === 'silent', hangs.outcomes);

  // A recognizer that never ends, even after stop()
  const OldStop = FakeRecognition.prototype.stop;
  FakeRecognition.prototype.stop = function () {};
  const stuck = await tryWith([['audiostart']], 200);
  FakeRecognition.prototype.stop = OldStop;
  check('never ends even after stop: still answered once', stuck.outcomes.length === 1, stuck.outcomes);

  // The game closes while listening: no outcome, the recognizer is stopped
  script = [['audiostart'], ['result', ['破'], true], ['end']];
  const before = aborted;
  const late: SpeechOutcome[] = [];
  const cancel = listenOnce({ lang: 'zh-TW', isMatch: () => true, onOutcome: o => late.push(o), timeoutMs: 200 });
  cancel();
  await wait(3000);
  check('cancelled: no outcome after the game closed', late.length === 0 && aborted > before, late);

  check('unsupported browser', (() => {
    (globalThis as any).window = {};
    const got: SpeechOutcome[] = [];
    listenOnce({ lang: 'zh-TW', isMatch: () => true, onOutcome: o => got.push(o) });
    return got.length === 1 && describeOutcome(got[0]) === '這個瀏覽器沒有語音辨識';
  })());

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  if (fails) process.exitCode = 1;
})();
