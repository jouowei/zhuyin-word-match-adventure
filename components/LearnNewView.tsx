import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Volume2, Sparkles } from 'lucide-react';
import { UserProfile, WordItem } from '../types';
import { AudioStep, playChineseAudio, preloadChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';
import { hasPicture } from '../utils/wordPicture';
import { LearnCard } from '../services/learnItems';
import { HELP_RETRY, HELP_SHOW } from '../services/scaffolding';
import { speakHelp } from './VoiceGuide';
import { ZhuyinText } from './ZhuyinText';

interface LearnNewViewProps {
  currentUser: UserProfile;
  cards: LearnCard[];
  gameMode: 'word' | 'zhuyin';
  onDone: (results: { character: string; helped: boolean }[]) => void;
  onBack: () => void;
}

/**
 * 認識新朋友 — gradual release of responsibility (Pearson & Gallagher 1983):
 * watch and listen (I do), then choose it between two items with the picture cues still showing (we do).
 * Choosing it without cues among four happens later in the practice round (you do).
 */
export const LearnNewView: React.FC<LearnNewViewProps> = ({ currentUser, cards, gameMode, onDone, onBack }) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'watch' | 'try' | 'finished'>('watch');
  const [help, setHelp] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const results = useRef<{ character: string; helped: boolean }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const card = cards[index];
  const zhuyin = gameMode === 'zhuyin';
  const choices = useMemo(
    () => (card ? [card.item, card.partner].sort(() => Math.random() - 0.5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, card?.item.id]
  );

  useEffect(() => {
    preloadChineseAudio(cards.flatMap(c => [c.item, c.partner]).flatMap(item => [
      { url: item.audioUrl, text: item.character },
      { url: item.exampleAudioUrl, text: item.exampleWord || '' },
    ]));
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sound = (item: WordItem): AudioStep => ({ url: item.audioUrl, text: item.character });
  const introSteps = (item: WordItem): AudioStep[] => zhuyin && item.exampleWord
    ? [sound(item), { text: '聽聽看' }, { url: item.exampleAudioUrl, text: item.exampleWord }, { text: '裡面有' }, sound(item), { text: '的聲音' }]
    : [sound(item)];

  // Speak on a timer so React's double-run of effects in development doesn't cut it off
  useEffect(() => {
    if (!card || phase === 'finished') return;
    const timer = setTimeout(() => {
      if (phase === 'watch') playChineseAudio([{ text: index === 0 ? '這是新朋友' : '再認識一個新朋友' }, ...introSteps(card.item)]);
      else playChineseAudio([{ text: '換你試試看，哪一個是' }, sound(card.item), { text: '？' }]);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  useEffect(() => {
    if (phase !== 'finished') return;
    const timer = setTimeout(() => {
      playSound('cheer');
      playChineseAudio([{ text: '新朋友都認識了！等一下的遊戲裡，還會再見到它們喔。' }]);
    }, 300);
    return () => clearTimeout(timer);
  }, [phase]);

  const choose = (choice: WordItem) => {
    if (!card || solved) return;
    if (choice.id === card.item.id) {
      setSolved(true);
      playSound('success');
      playChineseAudio([{ text: help === 0 ? '對了！' : '找到了！' }, ...introSteps(card.item).slice(0, 1)]);
      results.current.push({ character: card.item.character, helped: help > 0 });
      later(() => {
        if (index + 1 < cards.length) {
          setIndex(index + 1);
          setPhase('watch');
          setHelp(0);
          setSolved(false);
        } else {
          setPhase('finished');
        }
      }, 1600);
      return;
    }
    playSound('error');
    setShakeId(choice.id);
    later(() => setShakeId(null), 500);
    // Only two choices, so the second level already shows the answer
    const level = help === 0 ? HELP_RETRY : HELP_SHOW;
    setHelp(level);
    if (level === HELP_RETRY) speakHelp([{ text: '你選的是' }, sound(choice), { text: '再聽聽看' }, sound(card.item)]);
    else speakHelp([{ text: '是發亮的這一個，點點看' }, sound(card.item)]);
  };

  const renderItem = (item: WordItem, size: 'big' | 'choice') => {
    const big = size === 'big';
    return (
      <div className="flex items-center justify-center gap-4">
        {zhuyin ? (
          <span className={`${big ? 'text-9xl' : 'text-7xl'} font-bold text-gray-800`}>{item.character}</span>
        ) : item.zhuyin ? (
          <ZhuyinText text={item.character} readings={item.zhuyin.split(' ')} className={`${big ? 'text-8xl' : 'text-5xl'} text-gray-800`} />
        ) : (
          <span className={`font-kai ${big ? 'text-8xl' : 'text-5xl'} text-gray-800`}>{item.character}</span>
        )}
        {hasPicture(item) && (
          <div className="flex flex-col items-center">
            {item.imageUrl
              ? <img src={item.imageUrl} alt="" className={`${big ? 'w-32 h-32' : 'w-20 h-20'} object-contain`} />
              : <span className={big ? 'text-8xl' : 'text-6xl'}>{item.emoji}</span>}
            {zhuyin && item.exampleWord && (
              <span className={`${big ? 'text-2xl' : 'text-lg'} font-bold text-gray-600`}>{item.exampleWord}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-emerald-100">
        <button onClick={onBack} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 active:scale-95">
          <ArrowLeft size={22} /> <span className="text-lg">冒險地圖</span>
        </button>
        <div className="text-yellow-800 font-bold bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">⭐ {currentUser.points}</div>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-2">
          <Sparkles /> 認識新朋友
        </h2>
        {phase !== 'finished' && <p className="text-gray-500 mt-1">第 {index + 1} 個，共 {cards.length} 個</p>}
      </div>

      {phase === 'watch' && card && (
        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-8 flex flex-col items-center gap-6 animate-pop">
          <p className="text-lg font-bold text-emerald-700">看一看、聽一聽</p>
          {renderItem(card.item, 'big')}
          {zhuyin && card.item.exampleWord && (
            <p className="text-xl font-bold text-gray-500">
              {card.item.exampleWord}（{[...card.item.zhuyin].map((ch, i) => (
                <span key={i} className={ch === card.item.character ? 'text-pink-600' : ''}>{ch}</span>
              ))}）
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => playChineseAudio(introSteps(card.item))}
              className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-5 py-3 rounded-2xl transition active:scale-95"
            >
              <Volume2 size={22} /> 再聽一次
            </button>
            <button
              onClick={() => { stopChineseAudio(); setPhase('try'); }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-6 py-3 rounded-2xl shadow-lg transition active:scale-95"
            >
              換我試試 <ArrowRight size={22} />
            </button>
          </div>
        </div>
      )}

      {phase === 'try' && card && (
        <div className="flex flex-col items-center gap-4 animate-pop">
          <button
            onClick={() => playChineseAudio([sound(card.item)])}
            className="w-24 h-24 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner transition active:scale-95"
            aria-label="再聽一次"
          >
            <Volume2 size={48} />
          </button>
          <p className="text-xl font-bold text-gray-600">哪一個是剛剛聽到的？</p>
          <div className="grid grid-cols-2 gap-4 w-full">
            {choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => choose(choice)}
                className={`bg-white rounded-3xl border-4 p-6 shadow-lg transition active:scale-95
                  ${solved && choice.id === card.item.id ? 'border-green-400 bg-green-50' : 'border-emerald-200 hover:border-emerald-400'}
                  ${shakeId === choice.id ? 'animate-shake-once border-red-300' : ''}
                  ${help >= HELP_SHOW && !solved && choice.id === card.item.id ? 'ring-8 ring-yellow-400 animate-bounce' : ''}`}
              >
                {renderItem(choice, 'choice')}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-8 flex flex-col items-center gap-6 animate-pop">
          <div className="text-6xl">🎉</div>
          <p className="text-2xl font-black text-emerald-700 text-center">新朋友都認識了！</p>
          <div className="flex flex-wrap justify-center gap-4">
            {cards.map(c => (
              <div key={c.item.id} className="bg-emerald-50 rounded-2xl px-4 py-2">{renderItem(c.item, 'choice')}</div>
            ))}
          </div>
          <button
            onClick={() => onDone(results.current)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-8 py-3 rounded-2xl shadow-lg transition active:scale-95"
          >
            下一站 <ArrowRight size={22} />
          </button>
        </div>
      )}
    </div>
  );
};
