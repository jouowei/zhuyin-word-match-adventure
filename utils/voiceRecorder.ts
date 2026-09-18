/**
 * 錄音比一比: records one short utterance so the child can hear it right after the model sound. Recording starts
 * when the microphone opens and stops by itself once the child has finished, so there is nothing to press.
 *
 * Phones can't recognize a zhuyin symbol said on its own (ㄨ and ㄠ both came back as 福), so zhuyin symbols
 * are judged by ear, the child's or a parent's, instead of by speech recognition.
 */
import { sharedAudioContext } from './chineseAudio';

export type RecordOutcome =
  | { kind: 'voice'; buffer: AudioBuffer }
  | { kind: 'silent' }
  | { kind: 'denied' }
  | { kind: 'error'; error: string };

export type VoiceState = 'waiting' | 'voice' | 'done' | 'silent';

interface DetectorOptions {
  calibrate: number;    // Seconds of room noise measured first
  silenceToEnd: number; // Quiet after the voice that ends it
  maxWait: number;      // Seconds to wait for the voice to start
  maxVoice: number;     // Longest recording once the voice has started
}

/** Decides, chunk by chunk, when the voice starts and when the child has finished. */
export class VoiceDetector {
  voiceStart = -1;
  lastVoice = -1;
  private chunks = 0;
  private floor = Infinity;
  private loudRun = 0;
  private opts: DetectorOptions;

  constructor(private chunkSeconds: number, opts: Partial<DetectorOptions> = {}) {
    this.opts = { calibrate: 0.15, silenceToEnd: 0.6, maxWait: 5, maxVoice: 3, ...opts };
  }

  /** Louder than the room by a clear margin; the lowest early chunk is the room (a child may start speaking at once). */
  get threshold() {
    const floor = this.floor === Infinity ? 0 : this.floor;
    return Math.min(0.08, Math.max(0.02, floor * 3));
  }

  /** One chunk's loudness (RMS, 0–1). */
  push(rms: number): VoiceState {
    const index = this.chunks++;
    const elapsed = this.chunks * this.chunkSeconds;
    if (elapsed <= this.opts.calibrate) {
      this.floor = Math.min(this.floor, rms);
      return 'waiting';
    }
    const loud = rms > this.threshold;
    if (this.voiceStart < 0) {
      // Two loud chunks in a row: a voice, not a tap on the screen
      this.loudRun = loud ? this.loudRun + 1 : 0;
      if (this.loudRun >= 2) {
        this.voiceStart = index - 1;
        this.lastVoice = index;
        return 'voice';
      }
      return elapsed >= this.opts.maxWait ? 'silent' : 'waiting';
    }
    if (loud) this.lastVoice = index;
    const quiet = (index - this.lastVoice) * this.chunkSeconds;
    const length = (index - this.voiceStart) * this.chunkSeconds;
    return quiet >= this.opts.silenceToEnd || length >= this.opts.maxVoice ? 'done' : 'voice';
  }
}

/** The voice with a little before and after it, made loud enough to hear next to the model recording. */
export const clipVoice = (chunks: Float32Array[], voiceStart: number, lastVoice: number, chunkSeconds: number): Float32Array => {
  const margin = Math.ceil(0.15 / chunkSeconds);
  const from = Math.max(0, voiceStart - margin);
  const to = Math.min(chunks.length, lastVoice + 1 + margin);
  const length = chunks.slice(from, to).reduce((sum, chunk) => sum + chunk.length, 0);
  const samples = new Float32Array(length);
  let at = 0;
  for (const chunk of chunks.slice(from, to)) {
    samples.set(chunk, at);
    at += chunk.length;
  }
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const gain = peak > 0 ? Math.min(6, 0.9 / peak) : 1;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
};

export const canRecord = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** iPhone: web audio is set to play even with the silent switch on; recording needs the microphone too. */
const setAudioSession = (type: 'playback' | 'play-and-record') => {
  try {
    const session = (navigator as any).audioSession;
    if (session) session.type = type;
  } catch (e) {}
};

const CHUNK = 2048;

/** Starts recording (call it inside the tap); returns a function that cancels without an outcome. */
export const recordVoice = ({ onReady, onVoice, onOutcome }: {
  onReady?: () => void;   // The microphone is open: the child can speak
  onVoice?: () => void;   // The child's voice has started
  onOutcome: (outcome: RecordOutcome) => void;
}): (() => void) => {
  if (!canRecord()) {
    onOutcome({ kind: 'error', error: 'unsupported' });
    return () => {};
  }
  let done = false;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  const cleanup = () => {
    clearTimeout(safety);
    if (processor) processor.onaudioprocess = null;
    processor?.disconnect();
    source?.disconnect();
    // Stop the microphone before anything plays: phones play quietly while it is open
    stream?.getTracks().forEach(track => track.stop());
    setAudioSession('playback');
  };
  const finish = (outcome: RecordOutcome) => {
    if (done) return;
    done = true;
    cleanup();
    onOutcome(outcome);
  };
  // In case audio processing never runs at all
  const safety = setTimeout(() => finish({ kind: 'silent' }), 12000);

  setAudioSession('play-and-record');
  const ctx = sharedAudioContext();
  ctx.resume().catch(() => {});
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } })
    .then(opened => {
      stream = opened;
      if (done) {
        cleanup();
        return;
      }
      source = ctx.createMediaStreamSource(opened);
      processor = ctx.createScriptProcessor(CHUNK, 1, 1);
      const chunkSeconds = CHUNK / ctx.sampleRate;
      const detector = new VoiceDetector(chunkSeconds);
      const chunks: Float32Array[] = [];
      let voiced = false;
      processor.onaudioprocess = event => {
        if (done) return;
        const input = event.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const state = detector.push(Math.sqrt(sum / input.length));
        if (state === 'voice' && !voiced) {
          voiced = true;
          onVoice?.();
        }
        if (state === 'silent') finish({ kind: 'silent' });
        if (state === 'done') {
          const samples = clipVoice(chunks, detector.voiceStart, detector.lastVoice, chunkSeconds);
          const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          buffer.copyToChannel(samples, 0);
          finish({ kind: 'voice', buffer });
        }
      };
      source.connect(processor);
      processor.connect(ctx.destination); // Chrome only runs a processor that is connected; its output is silent
      onReady?.();
    })
    .catch(error => {
      const name = String(error?.name || 'error');
      finish(name === 'NotAllowedError' || name === 'SecurityError' ? { kind: 'denied' } : { kind: 'error', error: name });
    });

  return () => {
    if (done) return;
    done = true;
    cleanup();
  };
};
