import React, { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, TrendingUp, TrendingDown, Minus, Lightbulb, BookOpen, Calendar } from 'lucide-react';
import { EnglishUnit, Lesson, UserProfile } from '../types';
import { summarizeWeek } from '../services/activityLog';
import { CHINESE_PREFIXES, ENGLISH_PREFIXES, masteredCount, reviewSchedule, startOfDay } from '../services/learningStats';
import { confusionLabel, ENGLISH_TIPS, GENERAL_TIPS, readingPrompts, tipForConfusion } from '../services/parentTips';
import { ParentPasswordSetup, ParentUnlock } from './ParentLock';
import { OfflineModePanel } from './OfflineModePanel';

interface ParentReportViewProps {
  currentUser: UserProfile;
  lessons: Lesson[];
  englishUnits: EnglishUnit[];
  activeLesson: Lesson | null;
  onBack: () => void;
}

const percent = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

const Trend: React.FC<{ now: number | null; before: number | null }> = ({ now, before }) => {
  if (now === null || before === null) return null;
  const diff = Math.round((now - before) * 100);
  const last = `上週 ${percent(before)}`;
  if (Math.abs(diff) < 3) return <span className="text-gray-400 text-xs flex items-center gap-0.5"><Minus size={14} /> 跟上週差不多（{last}）</span>;
  return diff > 0
    ? <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5"><TrendingUp size={14} /> 進步了（{last}）</span>
    : <span className="text-orange-600 text-xs font-bold flex items-center gap-0.5"><TrendingDown size={14} /> 比上週低（{last}）</span>;
};

const itemLabel = (key: string) => key.replace(/^(w|zy|el|ew):/, '');

export const ParentReportView: React.FC<ParentReportViewProps> = ({ currentUser, lessons, englishUnits, activeLesson, onBack }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const readableLessons = lessons.filter(l => l.content?.trim());
  const [lessonId, setLessonId] = useState(activeLesson?.id || readableLessons[0]?.id || '');

  const now = Date.now();
  const week = useMemo(() => summarizeWeek(currentUser.activity, now), [currentUser.activity]);
  const lastWeek = useMemo(() => summarizeWeek(currentUser.activity, now, 7), [currentUser.activity]);
  const stats = currentUser.wordStats || {};
  const chineseKeys = Object.keys(stats).filter(key => key.startsWith('w:') || key.startsWith('zy:'));
  const schedule = reviewSchedule(stats, now);
  const needPractice = chineseKeys.filter(key => schedule.dueRank(key) !== undefined && (stats[key].box ?? 0) === 0).slice(0, 12);
  const englishKeys = Object.keys(stats).filter(key => ENGLISH_PREFIXES.some(p => key.startsWith(p)));
  const englishNeedPractice = englishKeys.filter(key => schedule.dueRank(key) !== undefined && (stats[key].box ?? 0) === 0).slice(0, 12);
  const englishConfusions = week.confusions.filter(c => c.key.startsWith('letter:') || c.key.startsWith('enword:')).slice(0, 2);
  const weekStart = startOfDay(now) - 6 * 86400000;
  const masteredThisWeek = chineseKeys.filter(key => (stats[key].mastered ?? 0) >= weekStart);
  const lesson = readableLessons.find(l => l.id === lessonId);
  const topConfusions = week.confusions.filter(c => !c.key.startsWith('letter:') && !c.key.startsWith('enword:')).slice(0, 3);
  const maxDay = Math.max(1, ...week.days.map(d => d.activity.onOwn + d.activity.helped));

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
          <ParentUnlock subtitle="請輸入家長密碼（和「實體任務兌換」相同）" onUnlock={() => setUnlocked(true)} />
          <button onClick={onBack} className="text-gray-400 text-sm underline">回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="px-4 py-2 bg-white rounded-full shadow-sm text-gray-600 font-bold flex items-center gap-2">
            <ArrowLeft size={18} /> 回首頁
          </button>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar size={16} /> {week.days[0].date.slice(5)} ～ {week.days[6].date.slice(5)}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow p-5">
          <h1 className="text-2xl font-black text-slate-800">{currentUser.avatar} {currentUser.name} 這一週</h1>
          <p className="text-gray-500 mt-1">
            玩了 {week.daysPlayed} 天，大約 {week.minutes} 分鐘（上週 {lastWeek.daysPlayed} 天、{lastWeek.minutes} 分鐘）
          </p>
        </div>

        {/* The three numbers that show whether the scaffolding works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm font-bold text-gray-500">自己答對的比例</div>
            <div className="text-4xl font-black text-emerald-600 my-1">{percent(week.onOwnRate)}</div>
            <Trend now={week.onOwnRate} before={lastWeek.onOwnRate} />
            <p className="text-xs text-gray-400 mt-2">沒用提示就答對的題目。常常低於六成，表示內容偏難，可以多從「今日冒險」玩起。</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm font-bold text-gray-500">隔幾天還記得</div>
            <div className="text-4xl font-black text-sky-600 my-1">{percent(week.reviewRate)}</div>
            <Trend now={week.reviewRate} before={lastWeek.reviewRate} />
            <p className="text-xs text-gray-400 mt-2">學過的字隔了 1–30 天再出現時，第一次就自己答對的比例（這週 {week.reviewTried} 次）。</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm font-bold text-gray-500">新朋友與學會</div>
            <div className="text-4xl font-black text-amber-600 my-1">{week.mastered}<span className="text-lg text-gray-400"> 個學會</span></div>
            <p className="text-xs text-gray-500">這週認識 {week.newItems} 個新朋友；總共學會 {masteredCount(stats, CHINESE_PREFIXES)} 個字和注音。</p>
            <p className="text-xs text-gray-400 mt-2">「學會」是隔 1 天、再隔 3 天都自己答對。</p>
          </div>
        </div>

        {/* Seven days */}
        <div className="bg-white rounded-3xl shadow p-5">
          <h2 className="font-black text-slate-700 mb-3">每天的練習</h2>
          <div className="flex items-end gap-2 h-40">
            {week.days.map(({ date, activity }) => {
              const total = activity.onOwn + activity.helped;
              return (
                <div key={date} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] text-gray-400">{Math.round(activity.seconds / 60)}分</span>
                  <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden" style={{ height: `${(total / maxDay) * 100}%`, minHeight: total ? 4 : 0 }}>
                    <div className="bg-amber-300" style={{ height: `${total ? (activity.helped / total) * 100 : 0}%` }} />
                    <div className="bg-emerald-400 flex-1" />
                  </div>
                  <span className="text-xs text-gray-500">{date.slice(5).replace('-', '/')}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded" /> 自己答對</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-300 rounded" /> 用了提示</span>
          </div>
        </div>

        {/* What got mixed up, with ideas to play off screen */}
        <div className="bg-white rounded-3xl shadow p-5">
          <h2 className="font-black text-slate-700 mb-3 flex items-center gap-2"><Lightbulb className="text-amber-500" size={20} /> 這週容易搞混的（中文），和陪玩建議</h2>
          {topConfusions.length === 0 ? (
            <p className="text-gray-500">這週沒有明顯搞混的音或字。</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topConfusions.map(({ key, count }) => {
                const tip = tipForConfusion(key);
                return (
                  <div key={key} className="border-2 border-amber-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl font-black text-slate-800">{confusionLabel(key)}</span>
                      <span className="text-sm text-amber-700 font-bold">搞混 {count} 次</span>
                    </div>
                    {tip && (
                      <>
                        <div className="font-bold text-slate-700">{tip.title}</div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{tip.how}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h2 className="font-black text-slate-700 mb-2">最近答錯、要多練的</h2>
            {needPractice.length === 0
              ? <p className="text-gray-500 text-sm">目前沒有。</p>
              : <div className="flex flex-wrap gap-2">{needPractice.map(key => <span key={key} className="font-kai text-2xl bg-orange-50 border border-orange-200 rounded-xl px-3 py-1">{itemLabel(key)}</span>)}</div>}
          </div>
          <div>
            <h2 className="font-black text-slate-700 mb-2">這週學會的</h2>
            {masteredThisWeek.length === 0
              ? <p className="text-gray-500 text-sm">還沒有。學會要隔幾天再答對，多玩幾天就會出現。</p>
              : <div className="flex flex-wrap gap-2">{masteredThisWeek.map(key => <span key={key} className="font-kai text-2xl bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1">{itemLabel(key)}</span>)}</div>}
          </div>
        </div>

        {/* English */}
        <div className="bg-white rounded-3xl shadow p-5">
          <h2 className="font-black text-slate-700 mb-3">🔤 英文</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-pink-50 rounded-2xl p-4">
              <div className="text-sm font-bold text-gray-500">英文自己答對的比例</div>
              <div className="text-4xl font-black text-pink-600 my-1">{percent(week.english.onOwnRate)}</div>
              <Trend now={week.english.onOwnRate} before={lastWeek.english.onOwnRate} />
              <p className="text-xs text-gray-400 mt-1">這週英文答了 {week.english.onOwn + week.english.helped} 題</p>
            </div>
            <div className="bg-pink-50 rounded-2xl p-4">
              <div className="text-sm font-bold text-gray-500">英文學會的字母和單字</div>
              <div className="text-4xl font-black text-pink-600 my-1">{masteredCount(stats, ENGLISH_PREFIXES)}</div>
              {englishNeedPractice.length > 0 && (
                <p className="text-xs text-gray-500">最近答錯：<span className="font-english font-bold">{englishNeedPractice.map(itemLabel).join(', ')}</span></p>
              )}
            </div>
          </div>
          {englishConfusions.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {englishConfusions.map(({ key, count }) => {
                const tip = tipForConfusion(key);
                return (
                  <div key={key} className="border-2 border-pink-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl font-black text-slate-800 font-english">{confusionLabel(key)}</span>
                      <span className="text-sm text-pink-700 font-bold">搞混 {count} 次</span>
                    </div>
                    {tip && (
                      <>
                        <div className="font-bold text-slate-700">{tip.title}</div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{tip.how}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {ENGLISH_TIPS.map(tip => (
              <div key={tip.title}>
                <div className="font-bold text-slate-700">{tip.title}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{tip.how}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dialogic reading prompts for the lesson */}
        {readableLessons.length > 0 && (
          <div className="bg-white rounded-3xl shadow p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-black text-slate-700 flex items-center gap-2"><BookOpen className="text-indigo-500" size={20} /> 一起讀課文時可以問</h2>
              <select value={lessonId} onChange={e => setLessonId(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-1 font-bold text-gray-700">
                {readableLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
            {lesson && (
              <ol className="flex flex-col gap-2">
                {readingPrompts(lesson).map((p, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{p.kind}</span>
                    <span className="text-gray-700">{p.prompt}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-gray-400 mt-3">孩子回答後，先稱讚、再幫忙把句子說得更完整，最後請孩子再說一次。</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow p-5">
          <h2 className="font-black text-slate-700 mb-3">其他陪玩點子</h2>
          <div className="flex flex-col gap-3">
            {GENERAL_TIPS.map(tip => (
              <div key={tip.title}>
                <div className="font-bold text-slate-700">{tip.title}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{tip.how}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow p-5">
          <OfflineModePanel lessons={lessons} englishUnits={englishUnits} />
        </div>

        <div className="bg-white rounded-3xl shadow p-5">
          {changingPassword ? (
            <div className="max-w-sm mx-auto">
              <ParentPasswordSetup
                title="更改家長密碼"
                intro="新密碼會同時用在「家長專區」和「實體任務兌換」。"
                onDone={() => { setChangingPassword(false); setPasswordChanged(true); }}
                onSkip={() => setChangingPassword(false)}
                skipLabel="取消"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black text-slate-700 flex items-center gap-2"><KeyRound className="text-indigo-500" size={20} /> 家長密碼</h2>
              <div className="flex items-center gap-3">
                {passwordChanged && <span className="text-emerald-600 text-sm font-bold">密碼已更新</span>}
                <button onClick={() => { setChangingPassword(true); setPasswordChanged(false); }} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold">
                  更改密碼
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          依據：Wood, Bruner &amp; Ross (1976) 鷹架理論；Cepeda et al. (2008) 間隔練習；Whitehurst et al. (1988) 對話式共讀；Takeuchi &amp; Stevens (2011) 親子共用媒體。
        </p>
      </div>
    </div>
  );
};
