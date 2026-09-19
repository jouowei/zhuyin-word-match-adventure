import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Companion } from '../services/companions';
import { JourneyStory, PLACES, storyPicture, storyText } from '../services/journey';
import { playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { playSound } from '../utils/sound';

/**
 * A page of the 環島 story: the start of the trip, or arriving somewhere new (with the souvenir from the last place).
 * The watercolor shows the place and the friend met there; the companion stands below it, with the souvenir.
 */
export const StoryScene: React.FC<{ scene: NonNullable<JourneyStory>; name: string; companion: Companion; onDone: () => void }> = ({
  scene, name, companion, onDone,
}) => {
  const text = storyText(scene, name, companion.name);
  const place = scene.kind === 'start' ? PLACES[0] : scene.place;
  const title = scene.kind === 'start' ? '環島旅行開始！' : scene.lapDone ? '環島一圈完成了！' : `到了${place.name}！`;
  const [pictureMissing, setPictureMissing] = useState(false); // Offline before it was downloaded

  useEffect(() => {
    const timer = setTimeout(() => {
      playSound('magic');
      playChineseAudio([{ text, rate: 0.95 }]);
    }, 400);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-sky-900/80 backdrop-blur-sm p-3 select-none">
      <div className="story-card my-auto w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center gap-[1.8vh] text-center animate-pop">
        <p className="text-[clamp(1.4rem,6vw,1.9rem)] font-black text-sky-700">{title}</p>
        <div className="story-body w-full flex flex-col items-center gap-[1.8vh]">
          {pictureMissing ? (
            <div className="story-picture w-full aspect-video max-h-[30vh] rounded-2xl bg-sky-50 flex items-center justify-center text-[clamp(3rem,11vh,5rem)] leading-none">
              {place.emoji}
            </div>
          ) : (
            <img
              src={storyPicture(scene)}
              alt=""
              onError={() => setPictureMissing(true)}
              className="story-picture w-full aspect-video max-h-[30vh] object-cover rounded-2xl bg-sky-50"
            />
          )}
          <div className="flex flex-col items-center gap-[1.8vh]">
            <div className="flex items-center justify-center gap-3">
              <span className="text-[clamp(2.25rem,7vh,3rem)] leading-none animate-bob">{companion.emoji}</span>
              {scene.kind === 'arrive' && (
                <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-1.5 font-black text-amber-800">
                  <span className="text-3xl leading-none">{scene.left.souvenir.emoji}</span> 紀念品：{scene.left.souvenir.name}
                </div>
              )}
            </div>
            <p className="text-[clamp(1rem,4.2vw,1.2rem)] font-bold text-slate-700 leading-relaxed">{text}</p>
          </div>
        </div>
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
