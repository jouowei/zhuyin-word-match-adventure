import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Volume2, Sparkles, Snail } from 'lucide-react';
import { EnglishRoundItem, UserProfile } from '../../types';
import { getLetter } from '../../english/letters';
import { EnglishLearnCard } from '../../services/englishPath';
import { HELP_RETRY, HELP_SHOW } from '../../services/scaffolding';
import { AudioStep, playChineseAudio, stopChineseAudio } from '../../utils/chineseAudio';
import { speakLetterSound } from '../../utils/englishSpeech';
import { playSound } from '../../utils/sound';
import { speakHelp } from '../VoiceGuide';
import { HighlightedKeyword } from './shared';

interface EnglishLearnViewProps {
  currentUser: UserProfile;
  cards: EnglishLearnCard[];
  onDone: (results: { item: EnglishRoundItem; helped: boolean }[]) => void;
  onBack: () => void;
}

const en = (text: string, rate?: number): AudioStep => ({ text, lang: 'en', rate });
const zh = (text: string): AudioStep => ({ text, rate: 0.95 });

/**
 * English 認識新朋友: watch and listen (letter name, its sound in the picture word; or the word, its picture
 * and its Chinese meaning), then pick it between two cards that still show their pictures.
 */
export const EnglishLearnView: React.FC<EnglishLearnViewProps> = ({ currentUser, cards, onDone, onBack }) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'watch' | 'try' | 'finished'>('watch');
  const [help, setHelp] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const results = useRef<{ item: EnglishRoundItem; helped: boolean }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const card = cards[index];
  const choices = useMemo(
    () => (card ? [card.item, card.partner].sort(() => Math.random() - 0.5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, card?.item.id]
  );

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    stopChineseAudio();
  }, []);

  const introSteps = (item: EnglishRoundItem): AudioStep[] => {
    if (item.kind === 'letter') {
      const info = getLetter(item.text);
      if (!info) return [];
      return [en(info.name), zh(info.endSound ? '它的聲音在這個字的結尾' : '它的聲音在這個字的開頭'), en(info.keyword), zh(info.zh)];
    }
    return [en(item.text), zh(item.zh), en(item.text, 0.4)];
  };
  const askSteps = (item: EnglishRoundItem): AudioStep[] =>
    item.kind === 'letter'
      ? [zh('換你試試看，哪一個是'), en(getLetter(item.text)?.name || item.text), zh('？')]
      : [zh('換你試試看，哪一個是'), en(item.text), zh('？')];
  const nameOf = (item: EnglishRoundItem): AudioStep => (item.kind === 'letter' ? en(getLetter(item.text)?.name || item.text) : en(item.text));

  // Speak on a timer so React's double-run of effects in development doesn't cut it off
  useEffect(() => {
    if (!card || phase === 'finished') return;
    const timer = setTimeout(() => {
      if (phase === 'watch') playChineseAudio([zh(index === 0 ? '這是新朋友' : '再認識一個新朋友'), ...introSteps(card.item)]);
      else playChineseAudio(askSteps(card.item));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  useEffect(() => {
    if (phase !== 'finished') return;
    const timer = setTimeout(() => {
      playSound('cheer');
      playChineseAudio([zh('新朋友都認識了！等一下的遊戲裡，還會再見到它們喔。')]);
    }, 300);
    return () => clearTimeout(timer);
  }, [phase]);

  const choose = (choice: EnglishRoundItem) => {
    if (!card || solved) return;
    if (choice.id === card.item.id) {
      setSolved(true);
      playSound('success');
      playChineseAudio([zh(help === 0 ? '對了！' : '找到了！'), nameOf(card.item)]);
      results.current.push({ item: card.item, helped: help > 0 });
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
    if (level === HELP_RETRY) speakHelp([zh('你選的是'), nameOf(choice), zh('再聽聽看'), nameOf(card.item)]);
    else speakHelp([zh('是發亮的這一個，點點看'), nameOf(card.item)]);
  };

  const renderItem = (item: EnglishRoundItem, big: boolean) => {
    if (item.kind === 'letter') {
      const info = getLetter(item.text);
      return (
        <div className="flex flex-col items-center gap-1">
          <span className={`font-english ${big ? 'text-9xl' : 'text-6xl'} font-bold text-gray-800`}>{info?.upper}{info?.lower}</span>
          <span className={big ? 'text-7xl' : 'text-5xl'}>{item.emoji}</span>
          {info && <HighlightedKeyword keyword={info.keyword} letter={info.lower} className={`${big ? 'text-4xl' : 'text-2xl'} font-bold text-gray-700`} />}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-1">
        <span className={big ? 'text-8xl' : 'text-6xl'}>{item.emoji}</span>
        <span className={`font-english ${big ? 'text-6xl' : 'text-4xl'} font-bold text-gray-800`}>{item.text}</span>
        <span className={`${big ? 'text-xl' : 'text-base'} font-bold text-gray-500`}>{item.zh}</span>
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
          <Sparkles /> 認識新朋友 <span className="font-english">New Friends</span>
        </h2>
        {phase !== 'finished' && <p className="text-gray-500 mt-1">第 {index + 1} 個，共 {cards.length} 個</p>}
      </div>

      {phase === 'watch' && card && (
        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-8 flex flex-col items-center gap-6 animate-pop">
          <p className="text-lg font-bold text-emerald-700">看一看、聽一聽</p>
          {renderItem(card.item, true)}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => playChineseAudio(introSteps(card.item))}
              className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-5 py-3 rounded-2xl transition active:scale-95"
            >
              <Volume2 size={22} /> 再聽一次
            </button>
            {card.item.kind === 'letter' ? (
              <button
                onClick={() => speakLetterSound(card.item.text)}
                className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold px-5 py-3 rounded-2xl transition active:scale-95"
              >
                <Volume2 size={22} /> 聽字母的聲音
              </button>
            ) : (
              <button
                onClick={() => playChineseAudio([en(card.item.text, 0.35)])}
                className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-800 font-bold px-5 py-3 rounded-2xl transition active:scale-95"
              >
                <Snail size={22} /> 慢慢唸
              </button>
            )}
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
            onClick={() => playChineseAudio([nameOf(card.item)])}
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
                {renderItem(choice, false)}
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
              <div key={c.item.id} className="bg-emerald-50 rounded-2xl px-4 py-2">{renderItem(c.item, false)}</div>
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
