import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { Map as MapIcon, Star, RefreshCw } from 'lucide-react';

interface EnglishTopBarProps {
  currentUser: UserProfile;
  onHome: () => void;
  onRefresh?: () => void;
}

export const EnglishTopBar: React.FC<EnglishTopBarProps> = ({ currentUser, onHome, onRefresh }) => (
  <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-pink-100">
    <button
      onClick={onHome}
      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 border-2 border-transparent hover:border-gray-200 transform active:scale-95"
    >
      <MapIcon size={24} /> <span className="text-lg">英文地圖</span>
    </button>
    <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
      <Star className="fill-yellow-400 text-yellow-500 animate-pulse" />
      <span className="font-bold text-yellow-800 text-xl">{currentUser.points}</span>
    </div>
    {onRefresh ? (
      <button onClick={onRefresh} className="p-2 hover:bg-pink-50 rounded-full text-pink-500 transition" title="換一組">
        <RefreshCw size={24} />
      </button>
    ) : <div className="w-10" />}
  </div>
);

export const useFeedback = () => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (text: string, duration = 1500) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), duration);
  };

  return [message, show] as const;
};

export const FeedbackToast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop z-40 whitespace-nowrap">
      <span className="text-2xl font-bold text-yellow-600">{message}</span>
    </div>
  );
};

/** Shows a keyword with its target letter highlighted: b in "bear", x in "fox". */
export const HighlightedKeyword: React.FC<{ keyword: string; letter: string; className?: string }> = ({ keyword, letter, className = '' }) => {
  const index = keyword.toLowerCase().indexOf(letter.toLowerCase());
  if (index < 0) return <span className={`font-english ${className}`}>{keyword}</span>;
  return (
    <span className={`font-english ${className}`}>
      {keyword.slice(0, index)}
      <span className="text-pink-500 underline decoration-4 underline-offset-4">{keyword[index]}</span>
      {keyword.slice(index + 1)}
    </span>
  );
};
