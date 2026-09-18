import React, { useEffect, useRef, useState } from 'react';

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
