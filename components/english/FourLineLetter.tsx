import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LETTER_STROKES } from '../../english/letters';

export const VIEWBOX_SIZE = 380;
export const STROKE_WIDTH = 26;

export const getLetterViewBox = (char: string) => {
  const data = LETTER_STROKES[char];
  const width = data ? data.w : 100;
  return { x: width / 2 - VIEWBOX_SIZE / 2, y: -40, size: VIEWBOX_SIZE };
};

const getStartPoint = (d: string) => {
  const match = d.match(/^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
};

interface FourLineLetterProps {
  char: string;                 // 'A' or 'a'
  size: number;                 // Rendered px size (square)
  animKey?: number;             // Change to replay the stroke animation
  animate?: boolean;            // Draw strokes one by one
  showGuide?: boolean;          // Light gray template under the ink
  showStartDots?: boolean;      // Numbered dots where each stroke starts
  inkColor?: string;
  activeStroke?: number;        // Tracing: strokes before this are done, this one is highlighted
  showInk?: boolean;            // The red demo of the whole letter (hidden once writing support fades)
  showDirection?: boolean;      // Marching dots along the current stroke
  onPathsReady?: (paths: SVGPathElement[]) => void; // For tracing checks
}

export const FourLineLetter: React.FC<FourLineLetterProps> = ({
  char, size, animKey = 0, animate = true, showGuide = false, showStartDots = false, inkColor = '#2563eb', activeStroke, onPathsReady,
  showInk = true, showDirection = true,
}) => {
  const isTracing = activeStroke !== undefined;
  const measureRefs = useRef<SVGPathElement[]>([]);
  const [dotPositions, setDotPositions] = useState<{ x: number; y: number }[] | null>(null);
  const data = LETTER_STROKES[char];
  const vb = getLetterViewBox(char);

  useEffect(() => {
    if (onPathsReady && data) onPathsReady(measureRefs.current.slice(0, data.strokes.length).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  // Strokes that start at the same spot (the two legs of A) get their number dot nudged along the stroke
  useLayoutEffect(() => {
    if (!data || !showStartDots) return;
    const placed: { x: number; y: number }[] = [];
    measureRefs.current.slice(0, data.strokes.length).forEach(path => {
      const length = path.getTotalLength();
      let spot = path.getPointAtLength(0);
      for (const distance of [40, 70, 100]) {
        if (!placed.some(p => Math.hypot(p.x - spot.x, p.y - spot.y) < 36)) break;
        spot = path.getPointAtLength(Math.min(distance, length));
      }
      placed.push({ x: spot.x, y: spot.y });
    });
    setDotPositions(placed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, showStartDots]);

  if (!data) return null;

  const lineStart = vb.x;
  const lineEnd = vb.x + vb.size;
  const strokeDelay = 0.9;

  return (
    <svg width={size} height={size} viewBox={`${vb.x} ${vb.y} ${vb.size} ${vb.size}`} className="select-none">
      <style>{`
        @keyframes en-draw-stroke { to { stroke-dashoffset: 0; } }
        @keyframes en-march-stroke { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -0.071; } }
      `}</style>

      {/* Four-line paper: the middle band is where most lowercase letters live */}
      <rect x={lineStart} y={100} width={vb.size} height={100} fill="#fefce8" />
      <line x1={lineStart} x2={lineEnd} y1={0} y2={0} stroke="#cbd5e1" strokeWidth={3} />
      <line x1={lineStart} x2={lineEnd} y1={100} y2={100} stroke="#93c5fd" strokeWidth={3} strokeDasharray="14 10" />
      <line x1={lineStart} x2={lineEnd} y1={200} y2={200} stroke="#f87171" strokeWidth={4} />
      <line x1={lineStart} x2={lineEnd} y1={300} y2={300} stroke="#cbd5e1" strokeWidth={3} />

      {/* Invisible copies used to measure the letter shape */}
      {data.strokes.map((d, i) => (
        <path key={`measure-${char}-${i}`} ref={el => { if (el) measureRefs.current[i] = el; }} d={d} fill="none" stroke="none" />
      ))}

      {showGuide && data.strokes.map((d, i) => (
        <path key={`guide-${i}`} d={d} fill="none" stroke="#e5e7eb" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {showInk && data.strokes.map((d, i) => (
        <path
          key={`ink-${char}-${i}-${animKey}`}
          d={d}
          fill="none"
          stroke={inkColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={animate ? {
            strokeDasharray: '1 1.1',
            strokeDashoffset: 1.05,
            animation: `en-draw-stroke 0.8s ease-in-out forwards`,
            animationDelay: `${i * strokeDelay}s`,
          } : undefined}
        />
      ))}

      {/* Tracing: finished strokes turn solid blue, the current one shows marching dots in its writing direction */}
      {isTracing && data.strokes.slice(0, activeStroke).map((d, i) => (
        <path key={`done-${i}`} d={d} fill="none" stroke="#2563eb" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {isTracing && showDirection && data.strokes[activeStroke!] && (
        <path
          key={`active-${activeStroke}`}
          d={data.strokes[activeStroke!]}
          fill="none"
          stroke="#ffffff"
          strokeWidth={7}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: '0.001 0.07', animation: 'en-march-stroke 0.9s linear infinite' }}
        />
      )}

      {showStartDots && data.strokes.map((d, i) => {
        const start = dotPositions?.[i] || getStartPoint(d);
        if (!start) return null;
        if (isTracing && i < activeStroke!) return null;
        const isActive = isTracing && i === activeStroke;
        const isLater = isTracing && i > activeStroke!;
        return (
          <g key={`dot-${i}`} className={`pointer-events-none ${isActive ? 'animate-pulse' : ''}`} opacity={isLater ? 0.35 : 1}>
            <circle cx={start.x} cy={start.y} r={isActive ? 22 : 17} fill="#22c55e" stroke="white" strokeWidth={4} />
            <text x={start.x} y={start.y} dy={isActive ? 10 : 8} textAnchor="middle" fill="white" fontSize={isActive ? 28 : 22} fontWeight={900} fontFamily="Arial">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
