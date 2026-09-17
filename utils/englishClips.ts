import { ENGLISH_CLIPS } from '../english/audioClips';

/**
 * English speech from recorded clips (generated once with the Kokoro voice), so it sounds the same on every device;
 * computers without an English voice would otherwise read English with a Chinese one.
 */

const clipKey = (text: string) => text.toLowerCase().replace(/^[\s"'“”]+|[\s.!?,"'“”]+$/g, '').replace(/\s+/g, ' ');
const clipUrl = (file: string) => `/audio/english/${file}.mp3`;

/** Clips for the whole text, or for each of its sentences ("bee. bear."); null when any part is missing. */
export const englishClipUrls = (text: string): string[] | null => {
  const whole = ENGLISH_CLIPS[clipKey(text)];
  if (whole) return [clipUrl(whole)];
  const parts = text.split(/(?<=[.!?])\s+/).filter(part => clipKey(part));
  if (parts.length < 2) return null;
  const files = parts.map(part => ENGLISH_CLIPS[clipKey(part)]);
  return files.every(Boolean) ? files.map(clipUrl) : null;
};

/**
 * Speech-synthesis rates the games ask for (0.75–0.9 normal, 0.35–0.45 slow) → how much longer to make a clip.
 * The clips are already at a child-friendly pace.
 */
export const clipStretch = (rate?: number) => (rate === undefined || rate >= 0.7 ? 1 : Math.min(2, 0.8 / rate));

/**
 * Slower speech at the same pitch (WSOLA: overlap-add of short frames, each shifted to line up with the previous one).
 * `factor` > 1 makes it longer.
 */
export const stretchSamples = (input: Float32Array, sampleRate: number, factor: number): Float32Array => {
  if (factor === 1) return input;
  const frame = Math.round(sampleRate * 0.03);
  const hopOut = Math.round(frame / 2);
  const hopIn = hopOut / factor;
  const search = Math.round(sampleRate * 0.012);
  const hann = new Float32Array(frame).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1)));
  const out = new Float32Array(Math.ceil(input.length * factor) + frame);
  const weight = new Float32Array(out.length);

  let previous = 0;
  for (let k = 0; ; k++) {
    const nominal = Math.round(k * hopIn);
    if (nominal + frame >= input.length) break;
    let start = nominal;
    if (k > 0) {
      // The frame that best continues the audio already written: a coarse search, then around the best match
      const natural = previous + hopOut;
      const stride = Math.max(2, Math.round(sampleRate / 12000));
      const similarity = (candidate: number) => {
        let score = 0;
        for (let i = 0; i < hopOut && natural + i < input.length; i += stride) score += input[natural + i] * input[candidate + i];
        return score;
      };
      const best = (from: number, to: number, step: number) => {
        let bestScore = -Infinity;
        for (let candidate = from; candidate <= to; candidate += step) {
          if (candidate < 0 || candidate + frame >= input.length) continue;
          const score = similarity(candidate);
          if (score > bestScore) {
            bestScore = score;
            start = candidate;
          }
        }
      };
      best(nominal - search, nominal + search, stride);
      best(start - stride, start + stride, 1);
    }
    const at = k * hopOut;
    for (let i = 0; i < frame; i++) {
      out[at + i] += input[start + i] * hann[i];
      weight[at + i] += hann[i];
    }
    previous = start;
  }
  // Hann frames at half overlap already sum to 1; only the faded edges need evening out
  for (let i = 0; i < out.length; i++) if (weight[i] > 0.1) out[i] /= weight[i];
  return out;
};
