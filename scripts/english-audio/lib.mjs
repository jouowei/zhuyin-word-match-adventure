import { KokoroTTS } from 'kokoro-js';
import { env, pipeline } from '@huggingface/transformers';
import vm from 'vm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
env.cacheDir = path.join(here, 'cache');
// lamejs's module build throws 'MPEGMode is not defined' in Node; its single-file build works
const lameContext = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, 'node_modules/lamejs/lame.all.js'), 'utf8'), lameContext);

let tts = null;
export const loadTTS = async () => {
  tts ??= await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
  return tts;
};

let asr = null;
export const loadASR = async () => {
  asr ??= await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base.en', {
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    device: 'cpu',
  });
  return asr;
};

/** Text through Kokoro's own phonemizer, or phonemes given directly. Returns 24 kHz mono samples. */
export const synth = async ({ text, phonemes }, { voice = 'af_heart', speed = 1 } = {}) => {
  const model = await loadTTS();
  if (phonemes) {
    const { input_ids } = model.tokenizer(phonemes, { truncation: true });
    return (await model.generate_from_ids(input_ids, { voice, speed })).audio;
  }
  return (await model.generate(text, { voice, speed })).audio;
};

/** Cut leading and trailing silence (keeping a short pad) and bring the peak to a common level. */
export const tidy = (samples, rate = 24000) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const threshold = peak * 0.02;
  let start = 0;
  let end = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  const pad = Math.round(rate * 0.06);
  const out = samples.slice(Math.max(0, start - pad), Math.min(samples.length, end + pad));
  const gain = 0.89 / peak;
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  // Short fades so clips don't click
  const fade = Math.min(Math.round(rate * 0.01), Math.floor(out.length / 2));
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[out.length - 1 - i] *= i / fade; }
  return out;
};

export const toMp3 = (samples, rate = 24000, kbps = 56) => {
  const encoder = new lameContext.lamejs.Mp3Encoder(1, rate, kbps);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = encoder.encodeBuffer(pcm.subarray(i, i + 1152));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
};

/** Whisper wants 16 kHz. */
const resample = (samples, from = 24000, to = 16000) => {
  const out = new Float32Array(Math.floor(samples.length * to / from));
  const ratio = from / to;
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const j = Math.floor(x);
    const t = x - j;
    out[i] = samples[j] * (1 - t) + (samples[j + 1] ?? samples[j]) * t;
  }
  return out;
};

export const transcribe = async samples => {
  const model = await loadASR();
  const result = await model(resample(samples));
  return result.text.trim();
};

export const normalize = text => text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const writeFile = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};
