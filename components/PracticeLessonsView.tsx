import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Lesson, UserProfile } from '../types';
import { playChineseAudio } from '../utils/chineseAudio';
import { LevelStars } from './LevelStars';
import { SpeakButton } from './VoiceGuide';

/** 練習課文: the child picks a lesson to hear, find words in, and play its word games. Lessons are added by parents. */
export const PracticeLessonsView: React.FC<{
  currentUser: UserProfile;
  lessons: Lesson[];
  onPick: (lesson: Lesson) => void;
  onBack: () => void;
}> = ({ currentUser, lessons, onPick, onBack }) => {
  useEffect(() => {
    const timer = setTimeout(() => playChineseAudio([{ text: '選一課來練習。點喇叭，可以聽聽是哪一課。', rate: 0.95 }]), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-orange-50 to-amber-100 overflow-hidden select-none">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2 max-w-3xl w-full mx-auto">
        <button type="button" onClick={onBack} className="flex items-center gap-1 bg-white rounded-full px-4 py-2 shadow-sm font-black text-slate-600 active:scale-95 transition">
          <ArrowLeft size={20} /> 回去
        </button>
        <h1 className="flex-1 text-center text-[clamp(1.4rem,6vw,2rem)] font-black text-orange-700">📖 練習課文</h1>
        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-full px-3 py-1 font-black text-yellow-800">⭐ {currentUser.points}</div>
      </header>

      {/* Many lessons scroll here; everything else fits the screen */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lessons.map(lesson => (
            <div key={lesson.id} className="relative">
              <button
                type="button"
                onClick={() => onPick(lesson)}
                className="w-full text-left bg-white rounded-3xl p-4 pr-14 shadow-md border-b-8 border-orange-200 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <span className="text-xl font-black text-slate-800">{lesson.title}</span>
                <LevelStars completed={currentUser.zhuyinProgress?.[lesson.id] || []} total={8} size={16} />
                <span className="flex flex-wrap gap-1.5">
                  {lesson.vocabulary.slice(0, 6).map(word => (
                    <span key={word} className="font-kai text-xl bg-orange-50 text-orange-800 border border-orange-200 rounded-lg px-2">{word}</span>
                  ))}
                  {lesson.vocabulary.length > 6 && <span className="text-orange-400 self-end">…</span>}
                </span>
              </button>
              <SpeakButton text={lesson.title} className="absolute top-3 right-3 w-10 h-10 bg-orange-50" size={20} />
            </div>
          ))}
          {lessons.length === 0 && (
            <p className="text-center text-slate-500 font-bold py-10">還沒有課文。請爸爸媽媽到「家長專區」新增課文。</p>
          )}
        </div>
      </main>
    </div>
  );
};
