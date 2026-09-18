
import React, { useEffect, useState } from 'react';
import { STROKE_DATA_URL } from '../services/offline';
import { X, BookOpen, Loader2, Volume2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { playChineseWord, stopChineseAudio } from '../utils/chineseAudio';
import { getWordReading } from '../services/moedict';
import { ZhuyinText } from './ZhuyinText';

interface CharacterDetailModalProps {
  word: string; // The full word (e.g., "太陽")
  onClose: () => void;
}

// Custom override map for characters that need specific radical definitions or names
// Indicies are 0-based.
const CUSTOM_RADICAL_INFO: Record<string, { name?: string; strokes?: number[] }> = {
  '前': { name: '刀', strokes: [7, 8] }, // Manual fix: 刂 (last 2 strokes)
  '魚': { name: '魚' },
  '日': { name: '日' },
  '月': { name: '月' },
  '水': { name: '水' },
  '火': { name: '火' },
  '山': { name: '山' },
  '口': { name: '口' },
  '手': { name: '手' },
  '心': { name: '心' },
  '言': { name: '言' },
  '人': { name: '人' },
  '木': { name: '木' },
};

// Sub-component to handle individual character logic
const SingleCharacterView: React.FC<{ char: string }> = ({ char }) => {
  const [data, setData] = useState<{ strokes: string[]; radStrokes?: number[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(STROKE_DATA_URL(char));

        if (response.ok) {
          const json = await response.json();
          if (isMounted) setData(json);
        }
      } catch (e) {
        console.error("Failed to load character data", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [char]);

  if (loading) {
    return (
      <div className="w-32 h-40 flex flex-col items-center justify-center bg-gray-50 rounded-xl animate-pulse">
        <Loader2 className="animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-32 h-40 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-gray-200">
        <span className="text-6xl font-bold text-gray-800 font-serif">{char}</span>
      </div>
    );
  }

  // Calculate scaling for SVG (Hanzi Writer data is 1024x1024)
  const size = 1024;
  const displaySize = 160;

  // --- Logic to determine radical display ---

  // 1. Check for manual override info
  const customInfo = CUSTOM_RADICAL_INFO[char];

  // 2. Determine strokes to highlight
  let radicalStrokesToUse = data.radStrokes || [];

  // If we have a manual stroke override, use it
  if (customInfo?.strokes) {
    radicalStrokesToUse = customInfo.strokes;
  }

  const totalStrokes = data.strokes.length;

  // Check if it is a "Self Radical" (e.g., Fish, Sun)
  // Condition: No radical strokes defined (and no override), OR radical strokes equal total strokes
  const isSelfRadical = (radicalStrokesToUse.length === 0 || radicalStrokesToUse.length === totalStrokes);

  // Final list of indices to highlight red
  const strokesToHighlight = isSelfRadical
    ? data.strokes.map((_, i) => i) // Highlight all
    : radicalStrokesToUse;

  // 3. Determine Display Text
  let radicalLabel = isSelfRadical ? "這個字本身就是部首喔" : "部首是這個";
  if (customInfo?.name) {
    radicalLabel = `部首：${customInfo.name}部`;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 1. Main Character Display with Highlighted Radical */}
      <div className="relative bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-2 overflow-hidden">
        {/* Rice Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
             <div className="absolute inset-0 border-2 border-red-100"></div>
             <div className="absolute inset-0 border-t-2 border-dashed border-red-100 top-1/2 -translate-y-1/2"></div>
             <div className="absolute inset-0 border-l-2 border-dashed border-red-100 left-1/2 -translate-x-1/2"></div>
        </div>

        <svg width={displaySize} height={displaySize} viewBox={`0 0 ${size} ${size}`}>
          <g transform="translate(0, 900) scale(1, -1)">
            {data.strokes.map((path, index) => {
              const isRadical = strokesToHighlight.includes(index);
              return (
                <path
                  key={index}
                  d={path}
                  fill={isRadical ? "#ef4444" : "#1f2937"} // Red for radical, Dark Gray for others
                  className={isRadical ? "drop-shadow-sm" : "opacity-90"}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* 2. Isolated Radical Display */}
      <div className="flex flex-col items-center bg-red-50 px-3 py-2 rounded-xl border border-red-100 mt-1 w-full min-h-[70px] justify-center">
         <span className="text-sm text-red-500 font-bold mb-1 text-center">
           {radicalLabel}
         </span>
         <svg width={40} height={40} viewBox={`0 0 ${size} ${size}`}>
          <g transform="translate(0, 900) scale(1, -1)">
            {data.strokes.map((path, index) => {
              // Draw only if it's part of the highlight list
              if (!strokesToHighlight.includes(index)) return null;
              return (
                <path
                  key={index}
                  d={path}
                  fill="#ef4444"
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({ word, onClose }) => {
  const chars = word.split('');

  const [zhuyin, setZhuyin] = useState<string>('');

  useEffect(() => {
    getWordReading(word).then(reading => setZhuyin(reading.zhuyin));
  }, [word]);

  // 教育部 recording when 萌典 has one, otherwise speech synthesis
  const speakWord = async () => {
    const reading = await getWordReading(word);
    playChineseWord(word, reading.audioUrl);
  };

  useEffect(() => {
    playSound('pop');
    // Auto play pronunciation after a short delay
    const timer = setTimeout(() => {
      speakWord();
    }, 500);
    return () => {
      clearTimeout(timer);
      stopChineseAudio();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] p-6 max-w-2xl w-full shadow-2xl animate-pop border-8 border-indigo-200 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6 mt-2">
           <div className="flex items-center justify-center gap-2">
             <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2">
               <BookOpen className="text-indigo-500" /> 生字小教室
             </h2>
             <button
               onClick={speakWord}
               className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors shadow-sm"
               title="再聽一次"
             >
               <Volume2 size={20} />
             </button>
           </div>

           <div className="flex justify-center my-4 text-6xl text-orange-500">
             <ZhuyinText text={word} readings={zhuyin.split(' ')} />
           </div>

           <p className="text-gray-500 font-bold mt-1">
             紅色的地方就是「部首」喔！
           </p>
        </div>

        <div className="flex flex-wrap justify-center items-start gap-6 mb-4">
           {chars.map((char, idx) => (
             <SingleCharacterView key={`${char}-${idx}`} char={char} />
           ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md transform active:scale-95 transition mt-4"
        >
          知道了！
        </button>
      </div>
    </div>
  );
};
