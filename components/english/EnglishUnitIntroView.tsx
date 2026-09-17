import React, { useEffect, useRef, useState } from 'react';
import { EnglishUnit } from '../../types';
import { getLetter } from '../../english/letters';
import { LetterDetailModal } from './LetterDetailModal';
import { Map as MapIcon, Gamepad2, Volume2, Snail, Lightbulb, ArrowRight } from 'lucide-react';
import { speakEnglish, stopEnglishSpeech } from '../../utils/englishSpeech';

interface EnglishUnitIntroViewProps {
  unit: EnglishUnit;
  onBack: () => void;
  onStartGame: () => void;
  onFindWords?: () => void; // 句子尋寶: find the unit's words in its sentences
}

export const EnglishUnitIntroView: React.FC<EnglishUnitIntroViewProps> = ({ unit, onBack, onStartGame, onFindWords }) => {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [blending, setBlending] = useState<{ word: string; index: number } | null>(null);
  const [speakingSentence, setSpeakingSentence] = useState<number | null>(null);
  const blendTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => {
    clearInterval(blendTimer.current);
    stopEnglishSpeech();
  }, []);

  const unitWords = new Set((unit.words || []).map(w => w.word.toLowerCase()));

  const blendWord = (word: string) => {
    clearInterval(blendTimer.current);
    setSpeakingSentence(null);
    let index = 0;
    setBlending({ word, index });
    // Stretch the word slowly while the letters light up left to right, then say it normally
    speakEnglish(word, { rate: 0.4, onEnd: () => speakEnglish(word, { rate: 0.85 }) });
    blendTimer.current = setInterval(() => {
      index++;
      if (index > word.length) {
        clearInterval(blendTimer.current);
        setBlending(null);
      } else {
        setBlending({ word, index });
      }
    }, 320);
  };

  const speakSentence = (sentence: string, i: number) => {
    setSpeakingSentence(i);
    speakEnglish(sentence, { rate: 0.75, onEnd: () => setSpeakingSentence(null) });
  };

  const renderSentence = (sentence: string) =>
    sentence.split(' ').map((token, i) => {
      const [, before = '', core = token, after = ''] = token.match(/^([^A-Za-z-]*)([A-Za-z-]+)(.*)$/) || [];
      const bare = core.toLowerCase();
      const isTarget = unitWords.has(bare) || (bare.endsWith('s') && unitWords.has(bare.slice(0, -1)));
      return (
        <React.Fragment key={i}>
          {before}
          <span className={isTarget ? 'text-pink-600 underline decoration-pink-300 decoration-4 underline-offset-4' : ''}>{core}</span>
          {after}{' '}
        </React.Fragment>
      );
    });

  const handleStart = () => {
    stopEnglishSpeech();
    onStartGame();
  };

  return (
    <div className="min-h-screen bg-sky-50 p-4 flex flex-col items-center">
      {selectedLetter && <LetterDetailModal letter={selectedLetter} onClose={() => setSelectedLetter(null)} />}

      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border-b-8 border-sky-200 mt-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 gap-2">
          <button
            onClick={() => { stopEnglishSpeech(); onBack(); }}
            className="px-5 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 font-bold transition shadow-sm border-2 border-gray-200 flex items-center gap-2 active:scale-95"
          >
            <MapIcon size={24} /> 英文地圖
          </button>
          <button
            onClick={handleStart}
            className="px-5 py-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 text-white font-bold transition shadow-sm border-2 border-indigo-600 flex items-center gap-2 active:scale-95"
          >
            <Gamepad2 size={24} /> 去玩遊戲
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-6xl mb-2">{unit.icon}</div>
          <h1 className="text-3xl md:text-4xl font-black text-sky-900">{unit.title}</h1>
          <p className="font-english text-xl text-sky-500 font-bold">{unit.subtitle}</p>
        </div>

        {unit.tip && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
            <Lightbulb className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-gray-700 font-bold leading-relaxed">{unit.tip}</p>
          </div>
        )}

        {/* Letters */}
        {unit.kind === 'letters' && (
          <>
            <p className="text-center text-gray-500 font-bold mb-3">點點看每個字母，聽聽它的名字和聲音！</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {(unit.letters || []).map(letter => {
                const info = getLetter(letter);
                if (!info) return null;
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    className="bg-pink-50 hover:bg-pink-100 border-4 border-pink-200 rounded-2xl p-4 flex flex-col items-center shadow-sm transition active:scale-95"
                  >
                    <span className="font-english text-6xl font-bold text-gray-800">{info.upper}{info.lower}</span>
                    <span className="text-4xl my-1">{info.emoji}</span>
                    <span className="font-english text-lg text-gray-600">{info.keyword}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Words */}
        {unit.kind === 'words' && (
          <>
            <p className="text-center text-gray-500 font-bold mb-3">點圖卡聽單字，按「慢慢唸」聽清楚每個聲音！</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {(unit.words || []).map(item => {
                const isBlending = blending?.word === item.word;
                return (
                  <div key={item.word} className="relative bg-sky-50 border-4 border-sky-100 rounded-2xl shadow-sm flex flex-col items-center overflow-hidden">
                    <button
                      onClick={() => speakEnglish(item.word)}
                      className="w-full pt-3 pb-2 flex flex-col items-center hover:bg-sky-100 transition active:scale-95"
                    >
                      <span className="text-5xl">{item.emoji}</span>
                      <span className="font-english text-3xl font-bold text-gray-800 mt-1">
                        {item.word.split('').map((ch, i) => (
                          <span key={i} className={isBlending && i < blending!.index ? 'text-pink-500' : ''}>{ch}</span>
                        ))}
                      </span>
                      <span className="text-sm text-gray-500 font-bold">{item.zh}</span>
                    </button>
                    <button
                      onClick={() => blendWord(item.word)}
                      className="w-full bg-white border-t-2 border-sky-100 py-1.5 text-green-700 font-bold text-sm flex items-center justify-center gap-1 hover:bg-green-50"
                    >
                      <Snail size={16} /> 慢慢唸
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Sentences */}
        {unit.sentences && unit.sentences.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xl font-black text-gray-700">📖 讀讀看 Let's read!</h2>
              {onFindWords && (
                <button
                  onClick={() => { stopEnglishSpeech(); onFindWords(); }}
                  className="bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95"
                >
                  🔍 句子尋寶
                </button>
              )}
            </div>
            <div className="space-y-3">
              {unit.sentences.map((sentence, i) => (
                <button
                  key={i}
                  onClick={() => speakSentence(sentence, i)}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 transition active:scale-[0.98]
                    ${speakingSentence === i ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className={`p-2 rounded-full shrink-0 ${speakingSentence === i ? 'bg-yellow-300 text-yellow-800 animate-pulse' : 'bg-sky-100 text-sky-600'}`}>
                    <Volume2 size={22} />
                  </span>
                  <span className="font-english text-2xl md:text-3xl font-bold text-gray-800">{renderSentence(sentence)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-2xl font-bold py-4 rounded-2xl shadow-lg border-b-4 border-indigo-700 flex items-center justify-center gap-3 transition active:scale-95"
        >
          <Gamepad2 size={32} /> 學會了，開始遊戲！ <ArrowRight size={28} />
        </button>
      </div>
    </div>
  );
};
