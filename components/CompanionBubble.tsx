import React from 'react';
import { Volume2 } from 'lucide-react';
import { Companion } from '../services/companions';

/** The companion and what it says, across the top of a scene; tapping either says it again. `compact` leaves more room below. */
export const CompanionBubble: React.FC<{ companion: Companion; line: string; onTap: () => void; className?: string; compact?: boolean }> = ({
  companion, line, onTap, className = '', compact = false,
}) => (
  <div className={`flex items-end gap-2 px-[4%] pb-1 ${className}`}>
    <button
      type="button"
      onClick={onTap}
      aria-label={`${companion.name}說話`}
      className={`shrink-0 leading-none animate-bob drop-shadow-lg active:scale-90 transition-transform ${compact ? 'text-[min(13vw,9vh,4.5rem)]' : 'text-[min(22vw,16vh,8rem)]'}`}
    >
      {companion.emoji}
    </button>
    <button
      type="button"
      onClick={onTap}
      className={`relative flex-1 text-left rounded-3xl border-4 px-3 shadow-md ${compact ? 'py-1.5 mb-1' : 'py-2 mb-[6%]'} ${companion.bubble}`}
    >
      <span className={`block text-[clamp(0.85rem,min(3.8vw,4.2vh),1.35rem)] font-black text-slate-700 leading-snug pr-6 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>{line}</span>
      <Volume2 size={18} className="absolute right-2 bottom-2 text-slate-400" />
    </button>
  </div>
);
