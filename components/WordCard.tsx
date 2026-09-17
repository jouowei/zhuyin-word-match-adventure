import React from 'react';
import { WordItem } from '../types';
import { Volume2, Ear, MousePointerClick } from 'lucide-react';
import { hasPicture } from '../utils/wordPicture';
import { ZhuyinText } from './ZhuyinText';

interface WordCardProps {
  item: WordItem;
  isSelected: boolean;
  onClick: () => void;
  mode?: 'reading' | 'listening';
  gameMode?: 'word' | 'zhuyin';
  hideZhuyin?: boolean; // The zhuyin is the question in rounds without pictures
}

export const WordCard: React.FC<WordCardProps> = ({ item, isSelected, onClick, mode = 'reading', gameMode = 'word', hideZhuyin = false }) => {
  
  // --- LISTENING MODE (Level 4) ---
  if (mode === 'listening') {
    if (item.matched) {
      // In Listening Mode, the Left card reveals the IMAGE when matched!
      return (
        <div className="w-full h-24 md:h-32 rounded-xl border-4 border-green-500 bg-white flex items-center justify-center animate-pop shadow-sm">
           {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.character}
              className="w-full h-full object-contain rounded-lg p-1"
            />
          ) : hasPicture(item) ? (
            <span className="text-5xl">{item.emoji}</span>
          ) : (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-3xl md:text-4xl font-bold text-green-700">{item.character}</span>
              <span className="text-sm font-bold text-gray-500">{item.zhuyin}</span>
            </span>
          )}
        </div>
      );
    }

    // Unmatched: Show Speaker Button
    return (
      <button
        onClick={onClick}
        className={`
          w-full h-24 md:h-32 rounded-xl border-4 flex flex-col items-center justify-center relative gap-1
          transition-all duration-300 transform shadow-lg
          ${isSelected 
            ? 'border-yellow-500 bg-yellow-100 ring-4 ring-yellow-300 ring-offset-2 scale-105 z-10' 
            : 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:scale-105 active:scale-95'
          }
        `}
      >
        <div className={`p-3 rounded-full ${isSelected ? 'bg-yellow-300 text-yellow-800 animate-bounce' : 'bg-orange-200 text-orange-600'}`}>
          <Ear size={32} />
        </div>
        <span className={`text-sm font-bold ${isSelected ? 'text-yellow-800' : 'text-gray-500'}`}>
          {isSelected ? '選取中...' : '點我聽聲音'}
        </span>
      </button>
    );
  }

  // --- READING MODE (Standard) ---
  if (item.matched) {
    return <div className="w-full h-24 md:h-32 opacity-0 pointer-events-none" />;
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full h-24 md:h-32 rounded-xl border-4 flex flex-row items-center justify-center relative gap-3 px-2
        transition-all duration-300 transform shadow-lg
        ${isSelected 
          ? 'border-yellow-500 bg-yellow-100 ring-4 ring-yellow-300 ring-offset-2 scale-105 z-10' 
          : 'border-blue-400 bg-white hover:border-blue-500 hover:scale-105 active:scale-95'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-yellow-500 text-white p-1 rounded-full shadow-md animate-bounce">
          <MousePointerClick size={20} className="fill-current" />
        </div>
      )}

      {/* Main Character: textbook 楷書 with zhuyin from the font, or plain when the zhuyin is the question */}
      {gameMode === 'word' ? (
        hideZhuyin || !item.zhuyin ? (
          <span className={`font-kai text-gray-800 ${[...item.character].length > 2 ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl'}`}>{item.character}</span>
        ) : (
          <ZhuyinText
            text={item.character}
            readings={item.zhuyin.split(' ')}
            className={`text-gray-800 ${[...item.character].length > 2 ? 'text-3xl md:text-5xl' : 'text-5xl md:text-6xl'}`}
          />
        )
      ) : (
        <span className="text-4xl md:text-5xl font-bold text-gray-800 font-sans tracking-wide">{item.character}</span>
      )}

      {gameMode === 'word' && (
        <div className={`absolute bottom-1 right-2 flex items-center gap-1 text-xs font-bold transition-opacity duration-300 ${isSelected ? 'opacity-100 text-yellow-700' : 'opacity-0 text-blue-500'}`}>
           <Volume2 size={14} className={isSelected ? 'animate-pulse' : ''} />
           <span>讀音</span>
        </div>
      )}
      {gameMode === 'zhuyin' && (
        <div className={`absolute bottom-1 right-2 flex items-center gap-1 text-xs font-bold transition-opacity duration-300 ${isSelected ? 'opacity-100 text-yellow-700' : 'opacity-0 text-blue-500'}`}>
           <Volume2 size={14} className={isSelected ? 'animate-pulse' : ''} />
           <span>讀音</span>
        </div>
      )}
    </button>
  );
};