import React from 'react';
import { Music } from 'lucide-react';
import { AudioStep, playChineseAudio } from '../utils/chineseAudio';
import { TONES } from '../zhuyin/symbols';
import { Tone } from '../services/zhuyinPractice';
import { ToneCurve } from './ToneCurve';

interface ToneCompareProps {
  references: AudioStep[];
  open: boolean;
  onOpen: () => void;      // After the support has faded, opening it again counts as help
  withNeutral?: boolean;
  hiddenFor?: string;      // The word being asked: 媽 can't be compared with itself
}

/** 媽 麻 馬 罵: tap to compare the heard word with each tone (數調). */
export const ToneCompare: React.FC<ToneCompareProps> = ({ references, open, onOpen, withNeutral = false, hiddenFor }) => {
  if (hiddenFor && TONES.some(t => t.example === hiddenFor)) return null;
  const tones: Tone[] = withNeutral ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];

  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="mb-4 flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 font-bold px-4 py-1.5 rounded-full text-sm transition active:scale-95"
      >
        <Music size={16} /> 比比看四個聲調
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 mb-4 animate-pop">
      <span className="text-xs font-bold text-purple-400">點點看，和聽到的比一比：</span>
      <div className="flex gap-2">
        {tones.map(tone => {
          const info = TONES[tone - 1];
          return (
            <button
              key={tone}
              onClick={() => playChineseAudio([references[tone - 1] || { text: info.example }])}
              className="flex flex-col items-center px-3 py-1 rounded-xl bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 transition active:scale-95"
              aria-label={`${info.name}：${info.example}`}
            >
              <span className="font-kai text-2xl text-gray-700">{info.example}</span>
              <ToneCurve tone={tone} className="w-7 h-5 text-purple-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
