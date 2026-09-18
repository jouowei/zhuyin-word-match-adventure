/**
 * One try at the microphone with the browser's speech recognition. However the recognizer behaves, the try ends with
 * exactly one outcome. Phones often:
 * - stop without a result or an error
 * - report `aborted` or `no-match` for a short sound (ㄆ), even when they had already heard it part-way
 * - keep listening
 */
import type { SpeechOutcome } from '../services/speechMatch';

const recognizerClass = (): any =>
  typeof window === 'undefined' ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

export const canListen = () => !!recognizerClass();

interface ListenOptions {
  lang: string;
  /** Checked on everything heard, including guesses heard part-way. */
  isMatch: (heard: string[]) => boolean | Promise<boolean>;
  onOutcome: (outcome: SpeechOutcome) => void;
  /** The microphone is open: the child can start speaking. */
  onReady?: () => void;
  timeoutMs?: number;
}

/** Starts listening; returns a function that cancels the try without an outcome (when the game closes). */
export const listenOnce = ({ lang, isMatch, onOutcome, onReady, timeoutMs = 8000 }: ListenOptions): (() => void) => {
  const Recognition = recognizerClass();
  if (!Recognition) {
    onOutcome({ kind: 'error', error: 'unsupported' });
    return () => {};
  }
  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.continuous = false;
  // Guesses heard part-way count too
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  const heard: string[] = [];
  let best = '';
  let micOpened = false;
  let soundHeard = false;
  let lastError = '';
  let done = false;
  let ready = false;
  // Matching can be async (the pinyin table loads lazily): outcomes wait for the checks before them
  let checking: Promise<void> = Promise.resolve();
  const timers: ReturnType<typeof setTimeout>[] = [];

  const settle = () => {
    done = true;
    timers.forEach(clearTimeout);
    try { recognition.abort(); } catch (e) {}
  };
  const end = (outcome: () => SpeechOutcome) => {
    checking = checking.then(() => {
      if (done) return;
      settle();
      onOutcome(outcome());
    });
  };
  const noMatch = (): SpeechOutcome => (heard.length
    ? { kind: 'heard', heard: best ? [best, ...heard.filter(h => h !== best)] : heard }
    : { kind: 'silent', micOpened, soundHeard, error: lastError || undefined });
  const markReady = () => {
    if (ready || done) return;
    ready = true;
    onReady?.();
  };

  recognition.onaudiostart = () => { micOpened = true; markReady(); };
  recognition.onsoundstart = recognition.onspeechstart = () => { soundHeard = true; };

  recognition.onresult = (event: any) => {
    const fresh: string[] = [];
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      for (let j = 0; j < result.length; j++) {
        const text = String(result[j]?.transcript ?? '').trim();
        if (!text) continue;
        if (result.isFinal && j === 0) best = text;
        if (!heard.includes(text)) {
          heard.push(text);
          fresh.push(text);
        }
      }
    }
    if (!fresh.length) return;
    checking = checking.then(async () => {
      if (done || !(await isMatch(fresh))) return;
      settle();
      onOutcome({ kind: 'match', heard: [...fresh, ...heard.filter(h => !fresh.includes(h))] });
    });
  };

  recognition.onerror = (event: any) => {
    lastError = String(event?.error || 'unknown');
    if (lastError === 'not-allowed' || lastError === 'service-not-allowed') end(() => ({ kind: 'denied', error: lastError }));
    // What was heard part-way still counts: the outcome comes when the recognizer ends
    else if (lastError !== 'no-speech' && lastError !== 'no-match' && lastError !== 'aborted' && !heard.length) {
      end(() => ({ kind: 'error', error: lastError }));
    }
  };

  recognition.onend = () => end(noMatch);

  // Some recognizers keep listening, or never end after stop(): the try still ends
  timers.push(setTimeout(() => { try { recognition.stop(); } catch (e) {} }, timeoutMs));
  timers.push(setTimeout(() => end(noMatch), timeoutMs + 2500));
  // Browsers that don't report the microphone opening
  timers.push(setTimeout(markReady, 1500));

  try {
    recognition.start();
  } catch (e) {
    end(() => ({ kind: 'error', error: 'start-failed' }));
  }

  return () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    try { recognition.abort(); } catch (e) {}
  };
};
