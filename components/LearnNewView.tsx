import React, { useEffect, useMemo, useRef, useState } from 'react';
import { praise } from './Praise';
import { ArrowRight, Volume2 } from 'lucide-react';
import { UserProfile, WordItem } from '../types';
import { AudioStep, playChineseAudio, preloadChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';
import { hasPicture } from '../utils/wordPicture';
import { LearnCard } from '../services/learnItems';
import { HELP_RETRY, HELP_SHOW } from '../services/scaffolding';
import { speakHelp } from './VoiceGuide';
import { ZhuyinText } from './ZhuyinText';
import { GameScreen } from './GameScreen';

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
      praise(help, 'look', { speak: false });
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
          <span className={`${big ? 'text-[clamp(4rem,16vh,8rem)]' : 'text-[clamp(2.75rem,10vh,4.5rem)]'} leading-none font-bold text-gray-800`}>{item.character}</span>
        ) : item.zhuyin ? (
          <ZhuyinText text={item.character} readings={item.zhuyin.split(' ')} className={`${big ? 'text-[clamp(3.5rem,min(20vw,13vh),6rem)]' : 'text-[clamp(2rem,min(11vw,7vh),3rem)]'} text-gray-800`} />
        ) : (
          <span className={`font-kai ${big ? 'text-[clamp(3.5rem,min(20vw,13vh),6rem)]' : 'text-[clamp(2rem,min(11vw,7vh),3rem)]'} text-gray-800`}>{item.character}</span>
        )}
        {/* Choices have no picture: children found the answer by its picture instead of reading it */}
        {!big && zhuyin && item.exampleWord && (
          <span className="text-[clamp(1rem,3vh,1.35rem)] font-bold text-gray-600 whitespace-nowrap">{item.exampleWord}</span>
        )}
        {big && hasPicture(item) && (
          <div className="flex flex-col items-center">
            {item.imageUrl
              ? <img src={item.imageUrl} alt="" className={`${big ? 'h-[clamp(5rem,16vh,8rem)]' : 'h-[clamp(3.5rem,10vh,5rem)]'} w-auto object-contain`} />
              : <span className={`leading-none ${big ? 'text-[clamp(3.5rem,13vh,6rem)]' : 'text-[clamp(2.25rem,8vh,3.75rem)]'}`}>{item.emoji}</span>}
            {zhuyin && item.exampleWord && (
              <span className={`${big ? 'text-[clamp(1.1rem,3.5vh,1.5rem)]' : 'text-[clamp(0.9rem,2.5vh,1.125rem)]'} font-bold text-gray-600`}>{item.exampleWord}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <GameScreen
      currentUser={currentUser}
      title="✨ 認識新朋友"
      instruction={phase === 'try' ? '哪一個是剛剛聽到的？點點看。' : '看一看、聽一聽新朋友，再按「換我試試」。'}
      onHome={onBack}
      accent="text-emerald-600"
    >
      {/* Which new friend this is */}
      <div className="shrink-0 flex justify-center gap-3 mb-[1.5vh]">
        {cards.map((c, i) => (
          <div key={c.item.id} className={`w-4 h-4 rounded-full border-2 ${phase === 'finished' || i < index ? 'bg-emerald-400 border-emerald-500' : i === index ? 'bg-emerald-200 border-emerald-500 scale-125' : 'bg-gray-100 border-gray-300'}`} />
        ))}
      </div>

      {phase === 'watch' && card && (
        <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-4 flex flex-col items-center justify-center gap-[2.5vh] animate-pop">
          <p className="text-lg font-bold text-emerald-700">看一看、聽一聽</p>
          {renderItem(card.item, 'big')}
          {zhuyin && card.item.exampleWord && (
            <p className="text-[clamp(1.1rem,3.2vh,1.25rem)] font-bold text-gray-500">
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
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-[2vh] animate-pop">
          <button
            onClick={() => playChineseAudio([sound(card.item)])}
            className="shrink-0 w-[clamp(4rem,12vh,6rem)] h-[clamp(4rem,12vh,6rem)] rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner transition active:scale-95"
            aria-label="再聽一次"
          >
            <Volume2 size={48} />
          </button>
          <p className="shrink-0 text-[clamp(1.1rem,3.2vh,1.25rem)] font-bold text-gray-600">哪一個是剛剛聽到的？</p>
          <div className="min-h-0 grid grid-cols-2 gap-4 w-full">
            {choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => choose(choice)}
                className={`bg-white rounded-3xl border-4 p-[2.5vh] shadow-lg transition active:scale-95
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
        <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-4 flex flex-col items-center justify-center gap-[2.5vh] animate-pop">
          <div className="text-[clamp(3rem,9vh,3.75rem)] leading-none">🎉</div>
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
    </GameScreen>
  );
};
