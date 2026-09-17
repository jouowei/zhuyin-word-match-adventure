import React from 'react';
import { WordItem } from '../types';

interface ImageSlotProps {
  item: WordItem;
  onSlotClick: () => void;
  isCorrectlyMatched: boolean;
  highlight: boolean;
  mode?: 'reading' | 'listening';
  gameMode?: 'word' | 'zhuyin';
  showZhuyin?: boolean; // Round without pictures: show the zhuyin to read instead
  hiddenChoice?: boolean; // Help: a wrong choice taken away
  answerHint?: boolean;   // Help: the answer glows, the child still taps it
}

export const ImageSlot: React.FC<ImageSlotProps> = ({ item, onSlotClick, isCorrectlyMatched, highlight, mode = 'reading', gameMode = 'word', showZhuyin = false, hiddenChoice = false, answerHint = false }) => {
  const helpClass = hiddenChoice ? 'opacity-20 grayscale pointer-events-none' : answerHint ? 'ring-8 ring-yellow-400 rounded-xl animate-bounce' : '';

  
  // --- LISTENING MODE (Level 4) ---
  // The right side shows Text Cards that the user must match to the sound
  if (mode === 'listening') {
    return (
      <div className={`flex items-center justify-center w-full h-24 md:h-32 transition-opacity ${helpClass}`}>
        <button
          onClick={onSlotClick}
          disabled={isCorrectlyMatched}
          className={`
            w-full h-full rounded-xl border-4 flex items-center justify-center gap-2
            transition-all duration-300 transform shadow-md
            ${isCorrectlyMatched 
              ? 'border-gray-200 bg-gray-100 opacity-50 scale-95' 
              : highlight && !hiddenChoice
                ? 'border-yellow-400 bg-yellow-50 scale-105 animate-pulse'
                : 'border-indigo-200 bg-white hover:border-indigo-400'
            }
          `}
        >
          {isCorrectlyMatched ? (
             // When matched, stay visible but dimmed/checked
             <span className="text-3xl font-bold text-gray-400">{item.character}</span>
          ) : (
             <>
               <span className="text-3xl md:text-4xl font-bold text-gray-800">{item.character}</span>
             </>
          )}
        </button>
      </div>
    );
  }

  // --- READING MODE (Standard) ---
  // The right side shows Empty Slots or Images
  const showExample = gameMode === 'zhuyin' && isCorrectlyMatched && !!item.exampleWord;

  return (
    <div className={`flex flex-row items-center justify-end gap-4 w-full h-24 md:h-32 transition-opacity ${helpClass}`}>
      
      {/* The Drop Zone (Empty Square or Result) */}
      <button
        onClick={onSlotClick}
        disabled={isCorrectlyMatched}
        className={`
          w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-dashed flex items-center justify-center
          transition-all duration-300 shrink-0
          ${isCorrectlyMatched 
            ? 'border-green-500 bg-green-50 opacity-100' 
            : highlight && !hiddenChoice
              ? 'border-yellow-400 bg-yellow-50 scale-105 animate-pulse cursor-pointer'
              : 'border-gray-300 bg-gray-50'
          }
        `}
      >
        {isCorrectlyMatched ? (
          <div className="flex flex-col items-center animate-pop">
            <span className="text-2xl md:text-4xl font-bold text-green-700">{item.character}</span>
          </div>
        ) : (
          <span className="text-gray-300 text-4xl">?</span>
        )}
      </button>

      {/* The Image Area */}
      <div className="w-24 h-24 md:w-32 md:h-32 flex flex-col items-center justify-center shrink-0">
        {showZhuyin ? (
          <button
            onClick={onSlotClick}
            disabled={isCorrectlyMatched}
            className={`w-full h-full rounded-xl border-4 flex flex-wrap content-center items-center justify-center gap-x-2 gap-y-1 px-1 font-bold transition-colors
              ${isCorrectlyMatched ? 'border-green-300 bg-green-50 text-green-700' : 'border-indigo-200 bg-white text-gray-800'}
              ${item.zhuyin.split(' ').length > 2 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}
          >
            {item.zhuyin
              ? item.zhuyin.split(' ').map((syllable, i) => <span key={i} className="whitespace-nowrap">{syllable}</span>)
              : <span className="text-base text-gray-400">{item.character}</span>}
          </button>
        ) : item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.character}
            className="w-full h-full object-contain drop-shadow-md animate-pop rounded-lg"
          />
        ) : (
          <span className={`${showExample ? 'text-5xl md:text-6xl' : 'text-6xl md:text-7xl'} drop-shadow-md filter hover:brightness-110 transition-transform hover:scale-110 cursor-default animate-float`} style={{ animationDelay: `${Math.random() * 2}s` }}>
            {item.emoji}
          </span>
        )}
        {showExample && (
          <div className="flex flex-col items-center leading-tight animate-pop mt-1">
            <span className="text-lg md:text-xl font-bold text-gray-800">{item.exampleWord}</span>
            <span className="text-xs md:text-sm font-bold text-gray-500 whitespace-nowrap">
              {item.zhuyin.split('').map((ch, i) => (
                <span key={i} className={ch === item.character ? 'text-pink-600' : ''}>{ch}</span>
              ))}
            </span>
          </div>
        )}
      </div>
      
    </div>
  );
};