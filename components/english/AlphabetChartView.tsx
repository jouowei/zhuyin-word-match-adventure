import React, { useEffect, useRef, useState } from 'react';
import { LETTERS } from '../../english/letters';
import { LetterDetailModal } from './LetterDetailModal';
import { Map as MapIcon, Music, StopCircle, Volume2 } from 'lucide-react';
import { speakEnglish, stopEnglishSpeech } from '../../utils/englishSpeech';

interface AlphabetChartViewProps {
  onBack: () => void;
}

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

export const AlphabetChartView: React.FC<AlphabetChartViewProps> = ({ onBack }) => {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [chantIndex, setChantIndex] = useState<number | null>(null);
  const chantActive = useRef(false);

  useEffect(() => () => {
    chantActive.current = false;
    stopEnglishSpeech();
  }, []);

  const stopChant = () => {
    chantActive.current = false;
    setChantIndex(null);
    stopEnglishSpeech();
  };

  const chantFrom = (index: number) => {
    if (!chantActive.current || index >= LETTERS.length) {
      chantActive.current = false;
      setChantIndex(null);
      return;
    }
    const info = LETTERS[index];
    setChantIndex(index);
    speakEnglish(`${info.name}. ${info.keyword}.`, {
      rate: 0.8,
      onEnd: () => setTimeout(() => chantFrom(index + 1), 250),
    });
  };

  const startChant = () => {
    chantActive.current = true;
    chantFrom(0);
  };

  return (
    <div className="min-h-screen bg-pink-50 p-4 flex flex-col items-center">
      {selectedLetter && <LetterDetailModal letter={selectedLetter} onClose={() => setSelectedLetter(null)} />}

      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border-b-8 border-pink-200 mt-4">
        <div className="flex justify-between items-center mb-6 gap-2">
          <button
            onClick={() => { stopChant(); onBack(); }}
            className="px-5 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 font-bold transition shadow-sm border-2 border-gray-200 flex items-center gap-2 active:scale-95"
          >
            <MapIcon size={24} /> 英文地圖
          </button>
          {chantIndex === null ? (
            <button
              onClick={startChant}
              className="px-5 py-2 bg-pink-500 hover:bg-pink-600 rounded-xl text-white font-bold transition shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Music size={22} /> 從 A 唸到 Z
            </button>
          ) : (
            <button
              onClick={stopChant}
              className="px-5 py-2 bg-red-400 hover:bg-red-500 rounded-xl text-white font-bold transition shadow-sm flex items-center gap-2 active:scale-95"
            >
              <StopCircle size={22} /> 停止
            </button>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-center text-pink-600 mb-1">認識 26 個字母</h1>
        <p className="text-center text-gray-500 mb-6 flex items-center justify-center gap-1">
          <Volume2 size={18} /> 點字母，聽它的名字和聲音、看怎麼寫
        </p>

        <div className="flex justify-center gap-3 mb-6 text-sm font-bold">
          <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full border-2 border-pink-200">母音 a e i o u</span>
          <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full border-2 border-sky-200">子音</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {LETTERS.map((info, index) => {
            const isVowel = VOWELS.includes(info.lower);
            const isChanting = chantIndex === index;
            return (
              <button
                key={info.lower}
                onClick={() => { stopChant(); setSelectedLetter(info.lower); }}
                className={`rounded-2xl border-4 p-2 flex flex-col items-center shadow-sm transition-all active:scale-95
                  ${isChanting ? 'scale-110 ring-4 ring-yellow-300 bg-yellow-50 border-yellow-400 z-10' : isVowel ? 'bg-pink-50 border-pink-200 hover:border-pink-400' : 'bg-sky-50 border-sky-200 hover:border-sky-400'}`}
              >
                <span className={`font-english text-4xl md:text-5xl font-bold ${isVowel ? 'text-pink-600' : 'text-sky-700'}`}>
                  {info.upper}{info.lower}
                </span>
                <span className="text-3xl">{info.emoji}</span>
                <span className="font-english text-sm text-gray-500">{info.keyword}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
