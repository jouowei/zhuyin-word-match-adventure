import React, { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { AudioStep, playChineseAudio, playGuidance } from '../utils/chineseAudio';

// Instructions are spoken because five-year-olds can't read them yet.
// Each game says its instruction once per visit to the app; the button repeats it any time.
const alreadySaid = new Set<string>();

export const instructionStep = (text: string): AudioStep => ({ text, rate: 0.95 });

/** Puts the instruction in front of the steps the first time this game is played. */
export const withInstruction = (key: string, text: string, steps: AudioStep[] = []): AudioStep[] => {
  if (alreadySaid.has(key)) return steps;
  alreadySaid.add(key);
  return [instructionStep(text), ...steps];
};

/** Says the instruction shortly after the screen opens, the first time only. */
export const useInstruction = (key: string, text: string, enabled = true) => {
  useEffect(() => {
    if (!enabled || alreadySaid.has(key)) return;
    // Marked when it actually plays, so React's double-run of effects in development doesn't swallow it
    const timer = setTimeout(() => playGuidance(withInstruction(key, text)), 500);
    return () => clearTimeout(timer);
  }, [key, text, enabled]);
};

export const InstructionButton: React.FC<{ text: string; className?: string; label?: string }> = ({ text, className = '', label = '聽說明' }) => (
  <button
    type="button"
    onClick={e => {
      e.stopPropagation();
      playChineseAudio([instructionStep(text)]);
    }}
    className={`inline-flex items-center gap-1 bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold px-3 py-1.5 rounded-full text-sm transition active:scale-95 ${className}`}
  >
    <Volume2 size={18} /> {label}
  </button>
);

/** A round speaker button that reads out what's next to it: menus and shops for children who can't read yet. */
export const SpeakButton: React.FC<{ text: string; className?: string; size?: number }> = ({ text, className = '', size = 22 }) => (
  <button
    type="button"
    onClick={e => {
      e.stopPropagation();
      playChineseAudio([instructionStep(text)]);
    }}
    aria-label={`聽聽看：${text}`}
    className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/90 text-sky-700 hover:bg-white shadow-md transition active:scale-90 ${className}`}
  >
    <Volume2 size={size} />
  </button>
);

/**
 * 聽完才能按 (hooks/useAnswerLock): covers the choices while the question or the hint is spoken, so a child who
 * taps fast hears it first. Put it in a `relative` box around the choices, which are dimmed at the same time.
 */
export const ListenChip: React.FC<{ show: boolean }> = ({ show }) => show ? (
  <div className="absolute inset-0 z-20 flex items-center justify-center" aria-hidden>
    <span className="bg-white/90 text-slate-600 font-black rounded-full px-4 py-2 shadow">👂 聽完再按</span>
  </div>
) : null;

/** Help that appears on a hint level: speaks, and the caller highlights or hides choices. */
export const speakHelp = (steps: AudioStep[]) => playGuidance(steps.map(step => (step.url || step.lang ? step : { ...step, rate: step.rate ?? 0.95 })));
