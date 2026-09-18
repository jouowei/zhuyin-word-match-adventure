import React from 'react';
import { EnglishUnit, UserProfile } from '../../types';
import { ENGLISH_STAGES, ENGLISH_UNITS, REVIEW_UNITS, getRecommendedUnitId, unitStars } from '../../english/curriculum';
import { Home, Star, Plus, Settings2 } from 'lucide-react';
import { SpeakButton, useInstruction } from '../VoiceGuide';

interface EnglishHubViewProps {
  currentUser: UserProfile;
  customUnits: EnglishUnit[];
  onBack: () => void;
  onOpenUnit: (unit: EnglishUnit) => void;
  onAlphabet: () => void;
  onManageCustom?: () => void; // Parents only: shown when given
  onDailyPath?: () => void;     // 今日英文冒險 starts from the home map in 2.1
  dailyDone?: boolean;          // Today's 今日英文冒險 is finished
}

export const EnglishHubView: React.FC<EnglishHubViewProps> = ({
  currentUser, customUnits, onBack, onOpenUnit, onAlphabet, onManageCustom, onDailyPath, dailyDone
}) => {
  const progress = currentUser.englishProgress || {};
  const recommendedId = getRecommendedUnitId(progress);
  useInstruction('english-hub', onDailyPath
    ? '這是英文大冒險。按綠色的今日英文冒險，一站一站學英文。點喇叭，可以聽聽每個按鈕是什麼。'
    : '這是英文遊樂場。選一個單元來玩，點喇叭可以聽聽看是什麼。');

  // "字母 Aa – Ee" is said as "字母 A 到 E"
  const spokenTitle = (title: string) => title.replace(/([A-Z])[a-z]\s*–\s*([A-Z])[a-z]/g, '$1 到 $2');

  const renderUnitCard = (unit: EnglishUnit) => {
    const done = progress[unit.id] || [];
    const isRecommended = unit.id === recommendedId;
    return (
      <div key={unit.id} className="relative">
      <SpeakButton text={isRecommended ? `下一站：${spokenTitle(unit.title)}` : spokenTitle(unit.title)} className="absolute top-1 left-1 z-10 w-9 h-9 bg-sky-50" size={18} />
      <button
        onClick={() => onOpenUnit(unit)}
        className={`relative bg-white rounded-2xl p-4 shadow-md border-b-4 flex flex-col items-center text-center transition-transform hover:scale-105 active:scale-95
          ${isRecommended ? 'border-yellow-400 ring-4 ring-yellow-300' : unitStars(done) === 4 ? 'border-green-300' : 'border-gray-200'}`}
      >
        {isRecommended && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full shadow whitespace-nowrap animate-bounce">
            下一站 👉
          </span>
        )}
        <span className="text-5xl mb-2">{unit.icon}</span>
        <span className="font-black text-gray-800 leading-tight">{unit.title}</span>
        <span className="font-english text-sm text-gray-400 mt-0.5">{unit.subtitle}</span>
        <div className="flex gap-0.5 mt-2">
          {[1, 2, 3, 4].map(level => (
            <Star key={level} size={16} className={done.includes(level) ? 'fill-yellow-400 text-yellow-500' : 'text-gray-200'} />
          ))}
        </div>
      </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 via-yellow-50 to-sky-100 p-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="px-5 py-2 bg-white rounded-xl shadow-md text-gray-600 font-bold flex items-center gap-2 hover:bg-gray-50 transition active:scale-95"
          >
            <Home size={24} /> {onDailyPath ? '回首頁' : '回遊樂場'}
          </button>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
            <span className="text-2xl">{currentUser.avatar}</span>
            <Star size={18} className="fill-yellow-400 text-yellow-500" />
            <span className="font-bold text-yellow-700 text-lg">{currentUser.points}</span>
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center border-b-8 border-pink-200">
          <h1 className="text-4xl font-black text-pink-600">英文大冒險</h1>
          <p className="font-english text-2xl font-bold text-sky-500 -mt-1">English Adventure</p>
          <p className="text-gray-500 mt-2">從 ABC 開始，一站一站學會發音、字母和單字！</p>

          {onDailyPath && (
          <div className="relative mt-5">
          <button
            onClick={onDailyPath}
            className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-lg p-4 pr-16 flex items-center gap-4 text-left transition active:scale-95"
          >
            <span className="text-6xl">🗺️</span>
            <span className="flex-1">
              <span className="block text-2xl font-black">今日英文冒險</span>
              <span className="block font-bold opacity-90">複習、認識新朋友、練習和挑戰，大約 10 分鐘</span>
            </span>
            {dailyDone && <span className="bg-white text-emerald-600 font-black px-3 py-1 rounded-full text-sm">✓ 今天完成了</span>}
          </button>
          <SpeakButton text="今日英文冒險：複習、認識新朋友、練習和挑戰，大約十分鐘。" className="absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="relative">
              <button
                onClick={onAlphabet}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg flex flex-col items-center gap-1 transition active:scale-95"
              >
                <span className="font-english text-3xl leading-none">ABC</span>
                <span>字母表・聽發音</span>
              </button>
              <SpeakButton text="字母表：點每個字母，聽它怎麼唸。" className="absolute top-1 left-1 w-9 h-9" size={18} />
            </div>
            {onManageCustom && (
            <button
              onClick={onManageCustom}
              className="bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg flex flex-col items-center gap-1 transition active:scale-95"
            >
              <Settings2 size={30} />
              <span>家長：自訂單字</span>
            </button>
            )}
          </div>
        </div>

        {/* Stages */}
        {ENGLISH_STAGES.map(stage => {
          const units = stage.id === 5 ? customUnits : ENGLISH_UNITS.filter(u => u.stage === stage.id);
          if (stage.id === 5 && units.length === 0) return null;
          const completed = units.filter(u => unitStars(progress[u.id]) === 4).length;
          return (
            <section key={stage.id} className={`rounded-3xl border-4 p-4 md:p-6 mb-6 ${stage.panel}`}>
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-3">
                  <span className={`${stage.badge} text-white font-black w-10 h-10 rounded-full flex items-center justify-center shadow`}>{stage.id === 5 ? '★' : stage.id}</span>
                  <div>
                    <h2 className={`text-xl md:text-2xl font-black ${stage.text}`}>{stage.title}</h2>
                    <p className="font-english text-gray-500 text-sm">{stage.subtitle}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full whitespace-nowrap">
                  完成 {completed}/{units.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {units.map(renderUnitCard)}
                {stage.id === 5 && onManageCustom && (
                  <button
                    onClick={onManageCustom}
                    className="rounded-2xl border-4 border-dashed border-orange-200 text-orange-400 hover:bg-white flex flex-col items-center justify-center p-4 font-bold transition"
                  >
                    <Plus size={32} /> 新增單元
                  </button>
                )}
              </div>
            </section>
          );
        })}

        {/* Review */}
        <section className="rounded-3xl border-4 p-4 md:p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl md:text-2xl font-black text-yellow-700 mb-4">🎲 綜合挑戰 <span className="font-english text-base text-gray-500">Review</span></h2>
          <div className="grid grid-cols-2 gap-4">
            {REVIEW_UNITS.map(renderUnitCard)}
          </div>
        </section>
      </div>
    </div>
  );
};
