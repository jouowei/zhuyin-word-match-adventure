import React, { useState } from 'react';
import { BookOpen, Gift, Languages, Settings2 } from 'lucide-react';
import { Lesson, StudyFocus, UserProfile } from '../types';
import { COMPANIONS } from '../services/companions';
import { studyFor } from '../services/wordSources';
import { playSound } from '../utils/sound';

interface ParentSettingsPanelProps {
  currentUser: UserProfile;
  lessons: Lesson[];
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => void;
  onManageLessons: () => void;
  onManageEnglish: () => void;
}

const TASK_STARS: { label: string; amount: number; color: string }[] = [
  { label: '簡單任務', amount: 100, color: 'bg-green-50 text-green-700 border-green-200' },
  { label: '一般任務', amount: 300, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: '困難任務', amount: 500, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: '超級大獎', amount: 1000, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
];

/** What the child practises, their companion, lessons and words, and stars for tasks done off screen. */
export const ParentSettingsPanel: React.FC<ParentSettingsPanelProps> = ({ currentUser, lessons, onUpdateUser, onManageLessons, onManageEnglish }) => {
  const [customStars, setCustomStars] = useState('');
  const [given, setGiven] = useState<number | null>(null);
  const study = studyFor(currentUser.studyFocus, lessons);
  const kind: StudyFocus['kind'] = study.gameMode === 'zhuyin' ? 'zhuyin' : study.activeLesson ? 'lesson' : 'all';
  const lessonId = study.activeLesson?.id ?? lessons[0]?.id ?? '';

  const setFocus = (focus: StudyFocus) => onUpdateUser(currentUser.id, { studyFocus: focus });

  const giveStars = (amount: number) => {
    if (!(amount > 0)) return;
    playSound('magic');
    onUpdateUser(currentUser.id, { points: currentUser.points + amount });
    setGiven(amount);
    setCustomStars('');
  };

  const option = (value: StudyFocus['kind'], label: string, onPick: () => void, extra?: React.ReactNode) => (
    <label className={`flex flex-wrap items-center gap-2 rounded-2xl border-2 px-3 py-2 cursor-pointer ${kind === value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100'}`}>
      <input type="radio" name="study-focus" checked={kind === value} onChange={onPick} className="w-5 h-5 accent-indigo-500" />
      <span className="font-bold text-slate-700">{label}</span>
      {extra}
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="font-black text-slate-700 flex items-center gap-2 mb-1"><Settings2 className="text-indigo-500" size={20} /> {currentUser.name}的中文冒險練什麼</h2>
        <p className="text-sm text-gray-500 mb-3">孩子按「出發」就會練這裡設定的內容，遊樂場的中文遊戲也一樣。</p>
        <div className="flex flex-col gap-2">
          {option('zhuyin', '注音符號', () => setFocus({ kind: 'zhuyin' }))}
          {option('lesson', '一課課文：', () => lessonId && setFocus({ kind: 'lesson', lessonId }), (
            <select
              value={lessonId}
              onChange={e => setFocus({ kind: 'lesson', lessonId: e.target.value })}
              className="flex-1 min-w-[10rem] bg-white border-2 border-gray-200 rounded-xl px-2 py-1 font-bold text-slate-700"
            >
              {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          ))}
          {option('all', '所有課文的字（自由練習）', () => setFocus({ kind: 'all' }))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={onManageLessons} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold flex items-center gap-2">
            <BookOpen size={18} /> 管理課文（新增、修改生字）
          </button>
          <button onClick={onManageEnglish} className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-bold flex items-center gap-2">
            <Languages size={18} /> 自訂英文單字
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-black text-slate-700 mb-2">冒險夥伴</h2>
        <div className="flex flex-wrap gap-2">
          {COMPANIONS.map(c => (
            <button
              key={c.id}
              onClick={() => onUpdateUser(currentUser.id, { companion: c.id })}
              className={`flex items-center gap-1 rounded-2xl border-2 px-3 py-1.5 font-bold ${currentUser.companion === c.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-slate-600'}`}
            >
              <span className="text-2xl">{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-black text-slate-700 flex items-center gap-2 mb-1"><Gift className="text-amber-500" size={20} /> 給星星（完成實體任務）</h2>
        <p className="text-sm text-gray-500 mb-3">{currentUser.name}完成了什麼任務呢？星星可以在「獎勵」換卡片。</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TASK_STARS.map(task => (
            <button key={task.amount} onClick={() => giveStars(task.amount)} className={`rounded-xl border-2 py-2 font-bold flex flex-col items-center transition active:scale-95 ${task.color}`}>
              <span className="text-xs">{task.label}</span>
              <span className="text-lg">+{task.amount} ⭐</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            inputMode="numeric"
            value={customStars}
            onChange={e => setCustomStars(e.target.value)}
            placeholder="自訂星星數"
            className="flex-1 min-w-0 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900 outline-none focus:border-indigo-400"
          />
          <button onClick={() => giveStars(parseInt(customStars, 10))} disabled={!customStars} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-40">
            送出
          </button>
        </div>
        {given !== null && <p className="text-emerald-600 font-bold mt-2">已送出 +{given} ⭐，現在有 {currentUser.points} 顆星星</p>}
      </section>
    </div>
  );
};
