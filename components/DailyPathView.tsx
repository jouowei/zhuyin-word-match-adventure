import React, { useEffect } from 'react';
import { Check, Home, Play, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';
import { DailyPath, pathTotals, Station, stationIntro } from '../services/dailyPath';
import { gameInstruction, levelInfo } from '../services/instructions';
import { companionOf, chineseNumber } from '../services/companions';
import { englishStatKey, statKey } from '../services/learningStats';
import { thingFor, WorldThing } from '../services/world';
import { playChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';

interface DailyPathViewProps {
  path: DailyPath;
  currentUser: UserProfile;
  onStart: (level?: number) => void;
  onHome: () => void;
  onShop?: () => void;
  /** What a game level is called and how it is played (English paths use the English games) */
  optionInfo?: (level: number, station: Station) => { emoji: string; title: string; desc: string; instruction: string };
}

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

/** Today's adventure on one screen: the stations as a trail with the companion at the current one, and what to do there. */
export const DailyPathView: React.FC<DailyPathViewProps> = ({ path, currentUser, onStart, onHome, onShop, optionInfo }) => {
  const infoFor = optionInfo || ((level: number) => ({ ...levelInfo(level, path.gameMode), instruction: gameInstruction(level, path.gameMode) }));
  const english = path.language === 'en';
  const station = path.stations[path.current];
  const finished = station?.kind === 'summary';
  const totals = pathTotals(path);
  const earned = Math.max(0, currentUser.points - path.startPoints);
  const companion = companionOf(currentUser);

  // What grew in the child's world today: new friends planted, and things learned
  const keyOf = (item: string) => (english ? englishStatKey({ kind: item.length === 1 ? 'letter' : 'word', text: item }) : statKey(path.gameMode, item));
  const thingOf = (item: string) => thingFor(currentUser.wordStats, keyOf(item));
  const grown = path.masteredToday.map(thingOf).filter((t): t is WorldThing => !!t);
  const planted = path.newItems.filter(item => !path.masteredToday.includes(item)).map(thingOf).filter((t): t is WorldThing => !!t);

  // Say where we are whenever a station opens (on a timer: React runs effects twice in development)
  useEffect(() => {
    if (!station) return;
    const growth = [
      planted.length ? `你的世界種下了${chineseNumber(planted.length)}個新朋友` : '',
      grown.length ? `${chineseNumber(grown.length)}個長大了` : '',
    ].filter(Boolean).join('，');
    const text = finished
      ? `今天的冒險完成了！你自己答對了${totals.onOwn}題。${growth ? `${growth}。` : ''}${path.gift ? '送你一次免費轉蛋！去轉轉看吧！' : '休息一下，明天再來冒險吧！'}`
      : stationIntro(station, path.current, english);
    const timer = setTimeout(() => {
      if (finished) playSound('cheer');
      say(text);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.current]);

  const speakOption = (level: number, s: Station) => {
    const info = infoFor(level, s);
    say(`${info.title}。${info.instruction}`);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-emerald-100 to-sky-50 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm font-black text-slate-600 active:scale-95 transition"
        >
          <Home size={22} /> 回家
        </button>
        <div className="flex-1 text-center min-w-0">
          <div className="text-[clamp(1.2rem,5vw,1.7rem)] font-black text-emerald-700 leading-tight">{english ? '英文冒險' : '今日冒險'}</div>
          <div className="text-xs font-bold text-slate-500 truncate">{path.label}</div>
        </div>
        <div className="text-yellow-800 font-black bg-yellow-100 px-3 py-1 rounded-full border-2 border-yellow-300">⭐ {currentUser.points}</div>
      </header>

      {/* The trail: done stations ticked, the companion standing at the current one (all ticked at the end: room for the results) */}
      <ol className={`${finished ? 'hide-on-short-screen' : ''} shrink-0 flex items-end justify-center gap-[clamp(0.25rem,2vw,0.75rem)] px-3 pt-2 pb-3`}>
        {path.stations.map((s, i) => {
          const done = i < path.current;
          const here = i === path.current;
          return (
            <li key={i} className="relative flex flex-col items-center">
              {here && <span className="text-[clamp(1.4rem,min(8vw,7vh),2.6rem)] leading-none animate-bob mb-0.5" aria-hidden>{companion.emoji}</span>}
              <span
                className={`relative flex items-center justify-center rounded-full border-4 transition
                  ${here ? 'w-[clamp(2.6rem,min(14vw,11vh),4.25rem)] h-[clamp(2.6rem,min(14vw,11vh),4.25rem)] bg-white border-emerald-400 shadow-lg text-[clamp(1.3rem,min(7vw,5.5vh),2.2rem)]'
                    : 'w-[clamp(2.1rem,min(11vw,9vh),3.25rem)] h-[clamp(2.1rem,min(11vw,9vh),3.25rem)] text-[clamp(1rem,min(5.5vw,4.5vh),1.7rem)] ' + (done ? 'bg-emerald-50 border-emerald-200' : 'bg-white/60 border-slate-200 grayscale opacity-60')}`}
              >
                {s.emoji}
                {done && <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5"><Check size={12} strokeWidth={4} /></span>}
              </span>
            </li>
          );
        })}
      </ol>

      <main className="flex-1 min-h-0 flex flex-col px-3 pb-3">
        {station && !finished && (
          <div className="fit-screen-main flex-1 min-h-0 flex flex-col items-center justify-center gap-[2vh] bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-4 animate-pop">
            <div className="flex flex-col items-center gap-[1.5vh]">
              <button type="button" onClick={() => say(stationIntro(station, path.current, english))} className="flex flex-col items-center gap-1">
                <span className="text-[clamp(2.2rem,min(15vw,11vh),5rem)] leading-none">{station.emoji}</span>
                <span className="text-[clamp(1.2rem,min(7vw,6vh),2.25rem)] font-black text-slate-700 flex items-center gap-2">{station.title} <Volume2 size={20} className="text-slate-400" /></span>
              </button>
              {(station.kind === 'learn' || station.kind === 'find') && station.words.length > 0 && (
                <div className={`flex flex-wrap justify-center gap-2 ${english ? 'font-english' : 'font-kai'}`}>
                  {station.words.map(word => (
                    <span key={word} className="bg-emerald-50 text-emerald-800 border-2 border-emerald-200 rounded-2xl px-3 py-1 text-[clamp(1.2rem,min(6vw,5.5vh),2rem)]">{word}</span>
                  ))}
                </div>
              )}
            </div>

            {station.options.length > 1 ? (
              <div className="w-full max-w-lg grid grid-cols-2 gap-3 min-h-0">
                {station.options.map(level => {
                  const info = infoFor(level, station);
                  return (
                    <div key={level} className="relative">
                      <button
                        type="button"
                        onClick={() => onStart(level)}
                        className="w-full h-full bg-emerald-50 hover:bg-emerald-100 border-4 border-emerald-200 rounded-3xl px-2 py-[2vh] flex flex-col items-center gap-1 transition active:scale-95"
                      >
                        <span className="text-[clamp(2rem,min(13vw,10vh),4rem)] leading-none">{info.emoji}</span>
                        <span className="text-[clamp(1rem,4.8vw,1.35rem)] font-black text-slate-700 leading-tight text-center">{info.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => speakOption(level, station)}
                        className="absolute top-1.5 right-1.5 p-2 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-90 transition"
                        aria-label={`聽「${info.title}」怎麼玩`}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStart(station.options[0])}
                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[clamp(1.8rem,8vw,2.5rem)] font-black px-10 py-3 rounded-3xl shadow-[0_6px_0_#047857] transition active:scale-95 animate-breathe"
              >
                <Play size={32} className="fill-current" /> 出發
              </button>
            )}
          </div>
        )}

        {finished && (
          <div className="fit-screen-main flex-1 min-h-0 flex flex-col items-center justify-center gap-[1.5vh] bg-white rounded-3xl shadow-xl border-b-8 border-yellow-200 p-4 animate-pop text-center">
            <div className="flex flex-col items-center gap-[1vh]">
              <div className="text-[clamp(2.2rem,min(14vw,10vh),4.5rem)] leading-none animate-bounce">🏆</div>
              <p className="text-[clamp(1.3rem,min(7vw,6vh),2.1rem)] font-black text-yellow-600 leading-tight">今天的冒險完成了！</p>
              <p className="text-[clamp(0.95rem,min(4.5vw,4vh),1.125rem)] font-bold text-slate-600">自己答對 {totals.onOwn} 題（共 {totals.total} 題）・得到 {earned} 分</p>
            </div>
            <div className="flex flex-col items-center gap-[1.5vh] w-full max-w-md">

            {(planted.length > 0 || grown.length > 0) && (
              <div className="w-full max-w-md bg-lime-50 border-4 border-lime-200 rounded-3xl px-3 py-2">
                <p className="font-black text-lime-800 mb-1">你的世界</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[...grown, ...planted].map(thing => (
                    <span key={thing.key} className="flex flex-col items-center min-w-[3rem]">
                      <span className="text-[clamp(1.5rem,min(8vw,7vh),2.5rem)] leading-none">{thing.emoji}</span>
                      <span className={`text-lg text-slate-700 ${thing.kind === 'english' ? 'font-english' : 'font-kai'}`}>{thing.label}</span>
                    </span>
                  ))}
                </div>
                <p className="text-sm font-bold text-lime-700 mt-1">
                  {grown.length > 0 && `${grown.length} 個長大了`}{grown.length > 0 && planted.length > 0 && '・'}{planted.length > 0 && `種下 ${planted.length} 個新朋友`}
                </p>
              </div>
            )}

            {path.gift && onShop ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onShop}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-[clamp(1.4rem,6vw,1.8rem)] font-black px-8 py-3 rounded-3xl shadow-[0_6px_0_#6b21a8] transition active:scale-95 animate-breathe"
                >
                  🎁 免費轉蛋！
                </button>
                <button type="button" onClick={onHome} className="text-slate-400 font-bold underline">回家</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onHome}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-black px-10 py-3 rounded-3xl shadow-[0_6px_0_#047857] transition active:scale-95"
              >
                回家看看我的世界
              </button>
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
