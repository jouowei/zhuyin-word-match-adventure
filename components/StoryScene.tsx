import React, { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { Companion } from '../services/companions';
import { JourneyStory, PLACES, storyText } from '../services/journey';
import { playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';

/** A page of the 環島 story: the start of the trip, or arriving somewhere new (with the souvenir from the last place). */
export const StoryScene: React.FC<{ scene: NonNullable<JourneyStory>; name: string; companion: Companion; onDone: () => void }> = ({
  scene, name, companion, onDone,
}) => {
  const text = storyText(scene, name, companion.name);
  const place = scene.kind === 'start' ? PLACES[0] : scene.place;
  const title = scene.kind === 'start' ? '環島旅行開始！' : scene.lapDone ? '環島一圈完成了！' : `到了${place.name}！`;

  useEffect(() => {
    const timer = setTimeout(() => {
      playSound('magic');
      playChineseAudio([{ text, rate: 0.95 }]);
    }, 400);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-sky-900/80 backdrop-blur-sm p-3 select-none">
      <div className="my-auto w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center gap-[1.8vh] text-center animate-pop">
        <p className="text-[clamp(1.4rem,6vw,1.9rem)] font-black text-sky-700">{title}</p>
        <div className="flex items-end justify-center gap-3 leading-none">
          <span className="text-[clamp(3rem,11vh,5rem)]">{place.emoji}</span>
          {scene.kind === 'arrive' && !scene.lapDone && <span className="text-[clamp(2.25rem,8vh,3.5rem)] animate-bob">{place.friend.emoji}</span>}
          <span className="text-[clamp(2.25rem,8vh,3.5rem)] animate-bob">{companion.emoji}</span>
        </div>
        {scene.kind === 'arrive' && (
          <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-1.5 font-black text-amber-800">
            <span className="text-3xl leading-none">{scene.left.souvenir.emoji}</span> 紀念品：{scene.left.souvenir.name}
          </div>
        )}
        <p className="text-[clamp(1rem,4.2vw,1.2rem)] font-bold text-slate-700 leading-relaxed">{text}</p>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={() => playChineseAudio([{ text, rate: 0.95 }])}
            className="flex-1 flex items-center justify-center gap-1 bg-sky-100 text-sky-700 font-black py-3 rounded-2xl active:scale-95 transition"
          >
            <Volume2 size={22} /> 再聽一次
          </button>
          <button
            type="button"
            onClick={() => { stopChineseAudio(); onDone(); }}
            className="flex-[2] bg-emerald-500 text-white text-xl font-black py-3 rounded-2xl shadow-[0_5px_0_#047857] active:scale-95 transition"
          >
            好！
          </button>
        </div>
      </div>
    </div>
  );
};
