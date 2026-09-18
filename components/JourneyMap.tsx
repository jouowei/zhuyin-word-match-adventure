import React from 'react';
import { Companion } from '../services/companions';
import { COAST_PATH, journeyPosition, LEGS_PER_PLACE, MAP_HEIGHT, MAP_WIDTH, Place, PLACES, project } from '../services/journey';
import { playChineseAudio } from '../utils/chineseAudio';
import { CompanionBubble } from './CompanionBubble';

type PlaceState = 'taken' | 'current' | 'future';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

const placeText = (place: Place, state: PlaceState) =>
  state === 'future' ? `${place.name}，還沒到喔，繼續冒險就會到！`
    : state === 'taken' ? `${place.name}。我們在這裡拿到了${place.souvenir.name}。${place.story}`
    : `我們現在在${place.name}。${place.story}`;

/**
 * 環島冒險 on the home screen: Taiwan with the route around it, souvenirs where the companion has been,
 * and the companion on its way to the next place. Tapping a place tells about it.
 */
export const JourneyMap: React.FC<{
  journeyLegs: number | undefined;
  companion: Companion;
  line: string;
  onCompanion: () => void;
  className?: string;
}> = ({ journeyLegs, companion, line, onCompanion, className = '' }) => {
  const position = journeyPosition(journeyLegs);
  const current = position.visited;
  const stateOf = (i: number): PlaceState =>
    i === current ? 'current' : (position.lap > 0 || i < current) ? 'taken' : 'future';

  const points = PLACES.map(p => project(p.lon, p.lat));
  const route = [...points, points[0]].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // The companion walks from this place towards the next one
  const from = points[current];
  const to = points[(current + 1) % PLACES.length];
  const t = position.legs / LEGS_PER_PLACE;
  const walker = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 to-sky-400 shadow-inner flex flex-col ${className}`} style={{ overflow: 'clip' }}>
      <CompanionBubble companion={companion} line={line} onTap={onCompanion} className="shrink-0 relative z-20 pt-2" compact />

      <div className="relative flex-1 min-h-0">
        <svg viewBox={`-8 -6 ${MAP_WIDTH + 16} ${MAP_HEIGHT + 12}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          <path d={COAST_PATH} fill="#bbf7d0" stroke="#15803d" strokeWidth={2.5} strokeLinejoin="round" />
          {/* The central mountains, lightly */}
          <path d="M 150 60 C 130 140, 110 220, 105 300" fill="none" stroke="#86efac" strokeWidth={14} strokeLinecap="round" opacity={0.7} />
          <polyline points={route} fill="none" stroke="#f59e0b" strokeWidth={2.2} strokeDasharray="5 4" strokeLinejoin="round" />

          {PLACES.map((place, i) => {
            const { x, y } = points[i];
            const state = stateOf(i);
            // Names go into the island (east coast: to the left), unless the place says otherwise
            const side = place.label ?? (x > 140 ? 'left' : 'right');
            const label = side === 'left' ? { x: x - 15, y: y + 4, anchor: 'end' }
              : side === 'right' ? { x: x + 15, y: y + 4, anchor: 'start' }
              : side === 'top' ? { x, y: y - 15, anchor: 'middle' }
              : { x, y: y + 24, anchor: 'middle' };
            return (
              <g key={place.id} onClick={() => say(placeText(place, state))} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={state === 'current' ? 13 : 10} fill="white" stroke={state === 'current' ? '#f59e0b' : state === 'taken' ? '#22c55e' : '#cbd5e1'} strokeWidth={state === 'current' ? 3 : 2} />
                <text x={x} y={y + 5} fontSize={state === 'current' ? 15 : 12} textAnchor="middle" opacity={state === 'future' ? 0.45 : 1}>
                  {state === 'taken' ? place.souvenir.emoji : place.emoji}
                </text>
                <text
                  x={label.x}
                  y={label.y}
                  fontSize={12}
                  fontWeight={900}
                  textAnchor={label.anchor}
                  fill={state === 'future' ? '#64748b' : '#0f172a'}
                  stroke="white"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {place.name}
                </text>
              </g>
            );
          })}

          {/* The companion, on the way */}
          <g onClick={onCompanion} style={{ cursor: 'pointer' }}>
            <text x={walker.x} y={walker.y - 12} fontSize={26} textAnchor="middle">{companion.emoji}</text>
          </g>
        </svg>

        {/* How far to the next place */}
        <button
          type="button"
          onClick={() => say(`再完成${position.legsLeft === 1 ? '一' : '兩'}次冒險，就到${position.next.name}！`)}
          className="absolute left-2 bottom-2 z-20 flex items-center gap-1.5 bg-white/85 rounded-full px-2.5 py-1 text-sm font-black text-slate-600 shadow"
        >
          🚩 {position.next.name}
          <span className="flex gap-0.5">
            {Array.from({ length: LEGS_PER_PLACE }, (_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < position.legs ? 'bg-amber-400' : 'bg-slate-200'}`} />
            ))}
          </span>
          {position.lap > 0 && <span className="text-amber-600">・第 {position.lap + 1} 圈</span>}
        </button>
      </div>
    </div>
  );
};
