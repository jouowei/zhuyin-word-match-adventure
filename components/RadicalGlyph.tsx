import React, { useEffect, useState } from 'react';
import { STROKE_DATA_URL } from '../services/offline';

interface StrokeData {
  strokes: string[];
  radStrokes?: number[];
}

const cache = new Map<string, Promise<StrokeData | null>>();

/** hanzi-writer stroke data (the "-traditional" package doesn't exist, so the main one is used). */
export const loadStrokeData = (char: string): Promise<StrokeData | null> => {
  if (!cache.has(char)) {
    cache.set(char, fetch(STROKE_DATA_URL(char))
      .then(res => (res.ok ? res.json() : null))
      .catch(() => {
        cache.delete(char); // Retry next time
        return null;
      }));
  }
  return cache.get(char)!;
};

interface RadicalGlyphProps {
  char: string;
  size: number;
  highlight: boolean; // Draw the radical's strokes in red
  /** Only the radical stands out, the rest of the character is faint: shows the component where it sits (艹 on top, 氵 on the left) */
  radicalOnly?: boolean;
  className?: string;
}

/** A character drawn from stroke data, so its radical can be coloured; plain 楷書 text until the data arrives. */
export const RadicalGlyph: React.FC<RadicalGlyphProps> = ({ char, size, highlight, radicalOnly = false, className = '' }) => {
  const [data, setData] = useState<StrokeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    loadStrokeData(char).then(d => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [char]);

  if (!data) {
    return <span className={`font-kai leading-none text-gray-800 ${className}`} style={{ fontSize: size * 0.85 }}>{char}</span>;
  }
  const radical = new Set(data.radStrokes || []);
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" className={className} style={{ maxWidth: '100%', height: 'auto' }} aria-label={char}>
      <g transform="translate(0, 900) scale(1, -1)">
        {data.strokes.map((d, i) => (
          <path key={i} d={d} fill={(highlight || radicalOnly) && radical.has(i) ? '#ef4444' : radicalOnly ? '#e5e7eb' : '#1f2937'} style={{ transition: 'fill 0.4s' }} />
        ))}
      </g>
    </svg>
  );
};
