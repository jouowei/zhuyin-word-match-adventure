import React from 'react';
import { Star } from 'lucide-react';

/** One star per game mode (1–6 for zhuyin, 1–8 for lessons); filled when that mode was completed. */
export const LevelStars: React.FC<{ completed: number[]; total?: number; size?: number; className?: string }> = ({
  completed, total = 6, size = 18, className = ''
}) => (
  <div className={`flex gap-0.5 ${className}`} title={`已過關 ${completed.length}/${total} 種玩法`}>
    {Array.from({ length: total }, (_, i) => (
      <Star key={i} size={size} className={completed.includes(i + 1) ? 'fill-yellow-400 text-yellow-500' : 'text-gray-300'} />
    ))}
  </div>
);
