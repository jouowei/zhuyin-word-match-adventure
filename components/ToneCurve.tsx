import React from 'react';
import { Tone } from '../services/zhuyinPractice';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round' as const };

/** Pitch shapes kids learn with hand gestures: flat, rising, dip, falling, light dot. */
export const ToneCurve: React.FC<{ tone: Tone; className?: string }> = ({ tone, className = '' }) => (
  <svg viewBox="0 0 40 30" className={className} aria-hidden>
    {tone === 1 && <path d="M6 8 H34" {...line} />}
    {tone === 2 && <path d="M6 24 L34 6" {...line} />}
    {tone === 3 && <path d="M6 12 Q18 32 34 7" {...line} />}
    {tone === 4 && <path d="M6 6 L34 24" {...line} />}
    {tone === 5 && <circle cx="20" cy="16" r="4" fill="currentColor" />}
  </svg>
);
