import React, { useEffect } from 'react';
import { Home, CheckCircle2, Lock, Play, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';
import { DailyPath, pathTotals, Station, stationIntro } from '../services/dailyPath';
import { gameInstruction, levelInfo } from '../services/instructions';
import { playChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';

interface DailyPathViewProps {
  path: DailyPath;
  currentUser: UserProfile;
  onStart: (level?: number) => void;
  onHome: () => void;
  /** What a game level is called and how it is played (English paths use the English games) */
  optionInfo?: (level: number, station: Station) => { emoji: string; title: string; desc: string; instruction: string };
}

export const DailyPathView: React.FC<DailyPathViewProps> = ({ path, currentUser, onStart, onHome, optionInfo }) => {
  const infoFor = optionInfo || ((level: number) => ({ ...levelInfo(level, path.gameMode), instruction: gameInstruction(level, path.gameMode) }));
  const station = path.stations[path.current];
  const finished = station?.kind === 'summary';
  const totals = pathTotals(path);
  const earned = Math.max(0, currentUser.points - path.startPoints);

  // Say where we are whenever a station opens (on a timer: React runs effects twice in development)
  useEffect(() => {
    if (!station) return;
    const text = finished
      ? `今天的冒險完成了！你自己答對了${totals.onOwn}題${path.newItems.length ? `，認識了${path.newItems.length}個新朋友` : ''}。休息一下，明天再來冒險吧！`
      : stationIntro(station, path.current, path.language === 'en');
    const timer = setTimeout(() => {
      if (finished) playSound('cheer');
      playChineseAudio([{ text, rate: 0.95 }]);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.current]);

  const speakOption = (level: number, s: Station) => {
    const info = infoFor(level, s);
    playChineseAudio([{ text: `${info.title}。${info.instruction}`, rate: 0.95 }]);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto p-4 md:p-6 bg-gradient-to-b from-emerald-50 to-sky-50">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-emerald-100">
        <button onClick={onHome} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 active:scale-95">
          <Home size={22} /> <span className="text-lg">回首頁</span>
        </button>
        <div className="text-yellow-800 font-bold bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">⭐ {currentUser.points}</div>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-emerald-700">🗺️ {path.language === 'en' ? '今日英文冒險' : '今日冒險'}</h1>
        <p className="text-gray-500 font-bold">{path.label}</p>
      </div>

      {/* The stations */}
      <ol className="flex flex-col gap-2 mb-6">
        {path.stations.map((s, i) => {
          const done = i < path.current;
          const isCurrent = i === path.current;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 border-4 transition
                ${isCurrent ? 'bg-white border-emerald-400 shadow-lg scale-[1.02]' : done ? 'bg-emerald-50 border-emerald-100' : 'bg-white/60 border-gray-100 text-gray-400'}`}
            >
              <span className={`text-3xl ${!done && !isCurrent ? 'grayscale opacity-50' : ''}`}>{s.emoji}</span>
              <div className="flex-1">
                <div className="font-black text-lg">{s.title}</div>
                {(s.kind === 'learn' || s.kind === 'find') && <div className={`text-sm font-bold text-emerald-600 ${path.language === 'en' ? 'font-english' : ''}`}>{s.words.join('　')}</div>}
                {done && s.chosen && <div className="text-sm text-gray-500">{infoFor(s.chosen, s).title}</div>}
              </div>
              {done && (
                <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                  {s.result && s.result.total > 0 && s.kind !== 'learn' && <span>自己答對 {s.result.onOwn}/{s.result.total}</span>}
                  <CheckCircle2 size={24} />
                </span>
              )}
              {!done && !isCurrent && <Lock size={20} />}
            </li>
          );
        })}
      </ol>

      {/* What to do now */}
      {station && !finished && (
        station.options.length > 1 ? (
          <div className="bg-white rounded-3xl shadow-xl border-b-8 border-emerald-200 p-5 animate-pop">
            <p className="text-center text-xl font-black text-emerald-700 mb-4">選一個你想玩的</p>
            <div className="grid grid-cols-2 gap-4">
              {station.options.map(level => {
                const info = infoFor(level, station);
                return (
                  <div key={level} className="relative">
                    <button
                      onClick={() => onStart(level)}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 border-4 border-emerald-200 rounded-2xl p-4 pb-8 flex flex-col items-center gap-2 transition active:scale-95"
                    >
                      <span className="text-6xl">{info.emoji}</span>
                      <span className="text-xl font-black text-gray-700">{info.title}</span>
                      <span className="text-sm text-gray-500">{info.desc}</span>
                    </button>
                    <button
                      onClick={() => speakOption(level, station)}
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-90 transition"
                      aria-label={`聽「${info.title}」怎麼玩`}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStart(station.options[0])}
            className="self-center flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white text-3xl font-black px-12 py-5 rounded-3xl shadow-xl transition active:scale-95 animate-pulse"
          >
            <Play size={32} className="fill-current" /> 出發
          </button>
        )
      )}

      {finished && (
        <div className="bg-white rounded-3xl shadow-xl border-b-8 border-yellow-200 p-6 flex flex-col items-center gap-3 animate-pop text-center">
          <div className="text-7xl animate-bounce">🏆</div>
          <p className="text-3xl font-black text-yellow-600">今天的冒險完成了！</p>
          <p className="text-xl font-bold text-gray-600">自己答對 {totals.onOwn} 題（共 {totals.total} 題）</p>
          {path.newItems.length > 0 && (
            <p className="text-lg font-bold text-emerald-700">🌱 新朋友：{path.newItems.join('、')}</p>
          )}
          {path.masteredToday.length > 0 && (
            <p className="text-lg font-bold text-amber-700">🌟 學會了：{path.masteredToday.join('、')}</p>
          )}
          <p className="text-lg font-bold text-yellow-700">這次得到 {earned} 分</p>
          <p className="text-gray-500">休息一下，明天再來冒險吧！</p>
          <button
            onClick={onHome}
            className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold px-10 py-3 rounded-2xl shadow-lg transition active:scale-95"
          >
            回首頁
          </button>
        </div>
      )}
    </div>
  );
};
