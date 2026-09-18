import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Lesson, UserProfile } from '../types';
import { lessonNumber, lessonShelves, Shelf } from '../services/lessonShelf';
import { chineseNumber } from '../services/companions';
import { playChineseAudio } from '../utils/chineseAudio';
import { LevelStars } from './LevelStars';
import { SpeakButton } from './VoiceGuide';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

// The term the child last opened, so coming back from a lesson goes back to it
let lastShelfKey: string | null = null;

/**
 * 練習課文: the child picks a term (一年級上學期 … 六年級下學期), then a lesson in it, to hear it, find its words and
 * play its word games. Lessons are typed in by parents from their own textbook.
 */
export const PracticeLessonsView: React.FC<{
  currentUser: UserProfile;
  lessons: Lesson[];
  onPick: (lesson: Lesson) => void;
  onBack: () => void;
}> = ({ currentUser, lessons, onPick, onBack }) => {
  const shelves = lessonShelves(lessons);
  const [shelf, setShelf] = useState<Shelf | null>(() => shelves.find(s => s.key === lastShelfKey && s.lessons.length) ?? null);

  useEffect(() => {
    const timer = setTimeout(() => say(shelf ? `${shelf.label}。選一課來練習。` : '選一個學期。點喇叭，可以聽聽是哪一個學期。'), 500);
    return () => clearTimeout(timer);
  }, [shelf?.key]);

  const open = (next: Shelf) => {
    if (!next.lessons.length) {
      say(`${next.label}還沒有課文，請爸爸媽媽到家長專區新增。`);
      return;
    }
    lastShelfKey = next.key;
    setShelf(next);
  };

  const back = () => {
    if (shelf) {
      lastShelfKey = null;
      setShelf(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-orange-50 to-amber-100 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2 max-w-3xl w-full mx-auto">
        <button type="button" onClick={back} className="flex items-center gap-1 bg-white rounded-full px-4 py-2 shadow-sm font-black text-slate-600 active:scale-95 transition">
          <ArrowLeft size={20} /> 回去
        </button>
        <h1 className="flex-1 text-center text-[clamp(1.2rem,5.5vw,1.9rem)] font-black text-orange-700 truncate">{shelf ? shelf.label : '📖 練習課文'}</h1>
        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-full px-3 py-1 font-black text-yellow-800">⭐ {currentUser.points}</div>
      </header>

      {!shelf ? (
        // The terms, 上 and 下 side by side for each year
        <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3">
            {shelves.map(s => {
              const empty = s.lessons.length === 0;
              return (
                <div key={s.key} className={`relative ${s.key === 'other' ? 'col-span-2' : ''}`}>
                  <button
                    type="button"
                    onClick={() => open(s)}
                    className={`w-full rounded-3xl p-3 pr-12 text-left border-b-8 transition active:scale-[0.97]
                      ${empty ? 'bg-white/50 border-transparent text-slate-400' : 'bg-white border-orange-200 shadow-md text-slate-800'}`}
                  >
                    <span className="block text-[clamp(1.05rem,4.6vw,1.35rem)] font-black leading-tight">{s.label}</span>
                    <span className={`block text-sm font-bold ${empty ? '' : 'text-orange-600'}`}>{empty ? '還沒有課文' : `${s.lessons.length} 課`}</span>
                  </button>
                  <SpeakButton
                    text={empty ? `${s.label}，還沒有課文` : `${s.label}，有${chineseNumber(s.lessons.length)}課`}
                    className="absolute top-1/2 -translate-y-1/2 right-2 w-9 h-9 bg-orange-50"
                    size={18}
                  />
                </div>
              );
            })}
          </div>
          {lessons.length === 0 && (
            <p className="text-center text-slate-500 font-bold py-6">還沒有課文。請爸爸媽媽到「家長專區」新增課文。</p>
          )}
        </main>
      ) : (
        // The lessons of one term; a long term scrolls here
        <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shelf.lessons.map(lesson => (
              <div key={lesson.id} className="relative">
                <button
                  type="button"
                  onClick={() => onPick(lesson)}
                  className="w-full text-left bg-white rounded-3xl p-4 pr-14 shadow-md border-b-8 border-orange-200 active:scale-[0.98] transition flex flex-col gap-2"
                >
                  <span className="text-xl font-black text-slate-800">
                    {lessonNumber(lesson) && <span className="text-orange-500 mr-1">{lessonNumber(lesson)}</span>}{lesson.title}
                  </span>
                  <LevelStars completed={currentUser.zhuyinProgress?.[lesson.id] || []} total={8} size={16} />
                  <span className="flex flex-wrap gap-1.5">
                    {lesson.vocabulary.slice(0, 6).map(word => (
                      <span key={word} className="font-kai text-xl bg-orange-50 text-orange-800 border border-orange-200 rounded-lg px-2">{word}</span>
                    ))}
                    {lesson.vocabulary.length > 6 && <span className="text-orange-400 self-end">…</span>}
                  </span>
                </button>
                <SpeakButton text={`${lessonNumber(lesson)}${lesson.title}`} className="absolute top-3 right-3 w-10 h-10 bg-orange-50" size={20} />
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
};
