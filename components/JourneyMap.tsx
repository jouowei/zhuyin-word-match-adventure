import React from 'react';
import { Companion } from '../services/companions';
import { journeyPosition, LEGS_PER_PLACE, MAP_HEIGHT, MAP_WIDTH, Place, PLACES, project } from '../services/journey';
import { playChineseAudio } from '../utils/chineseAudio';
import { CompanionBubble } from './CompanionBubble';

type PlaceState = 'taken' | 'current' | 'next' | 'future';

const say = (text: string) => playChineseAudio([{ text, rate: 0.95 }]);

const placeText = (place: Place, state: PlaceState) =>
  state === 'future' ? `${place.name}，還沒到喔，繼續冒險就會到！`
    : state === 'next' ? `${place.name}，是我們的下一站！`
    : state === 'taken' ? `${place.name}。我們在這裡拿到了${place.souvenir.name}。${place.story}`
    : `我們現在在${place.name}。${place.story}`;

/**
 * The watercolor map (public/journey/map.jpg) was painted over the same coastline the places are projected on,
 * from a 900 × 1600 picture with the map's frame fitted in it: this is where that picture sits in the map's units.
 */
const ART = { href: '/journey/map.jpg', x: -8, y: -7.83, width: MAP_WIDTH + 16, height: 410.67 };

/**
 * 環島冒險 on the home screen: Taiwan with the route around it. The way already travelled is drawn in full, the rest
 * lightly; only the next place is named, so the crowded north stays readable. Tapping a place tells about it.
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
  const nextIndex = (current + 1) % PLACES.length;
  const stateOf = (i: number): PlaceState =>
    i === current ? 'current' : i === nextIndex ? 'next' : (position.lap > 0 || i < current) ? 'taken' : 'future';

  const points = PLACES.map(p => project(p.lon, p.lat));
  // The companion walks from this place towards the next one
  const from = points[current];
  const to = points[nextIndex];
  const t = position.legs / LEGS_PER_PLACE;
  const walker = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  const line_ = (ps: { x: number; y: number }[]) => ps.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // This lap so far, and what is still ahead (back to 基隆港)
  const travelled = line_([...points.slice(0, current + 1), walker]);
  const ahead = line_([walker, ...points.slice(current + 1), points[0]]);
  const legsLeft = position.legsLeft;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[#f7f5ef] shadow-inner flex flex-col ${className}`} style={{ overflow: 'clip' }}>
      <CompanionBubble companion={companion} line={line} onTap={onCompanion} className="shrink-0 relative z-20 pt-2" compact />

      <div className="relative flex-1 min-h-0">
        <svg viewBox={`-8 -6 ${MAP_WIDTH + 16} ${MAP_HEIGHT + 12}`} className="absolute inset-x-0 top-0 bottom-9 w-full h-[calc(100%-2.25rem)]" preserveAspectRatio="xMidYMid meet">
          <image href={ART.href} x={ART.x} y={ART.y} width={ART.width} height={ART.height} preserveAspectRatio="none" />

          <polyline points={ahead} fill="none" stroke="#b45309" strokeOpacity={0.45} strokeWidth={1.8} strokeDasharray="2 4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={travelled} fill="none" stroke="#d97706" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />

          {PLACES.map((place, i) => {
            const { x, y } = points[i];
            const state = stateOf(i);
            // Only the next place is named: the companion stands at the current one, and its bubble says where it is
            const named = state === 'next';
            // Names go into the island (east coast: to the left), unless the place says otherwise
            const side = place.label ?? (x > 140 ? 'left' : 'right');
            const label = side === 'left' ? { x: x - 14, y: y + 4, anchor: 'end' }
              : side === 'right' ? { x: x + 14, y: y + 4, anchor: 'start' }
              : side === 'top' ? { x, y: y - 14, anchor: 'middle' }
              : { x, y: y + 22, anchor: 'middle' };
            const r = state === 'future' ? 6 : 9.5;
            return (
              <g key={place.id} onClick={() => say(placeText(place, state))} style={{ cursor: 'pointer' }}>
                {/* A bigger invisible target, for small fingers */}
                <circle cx={x} cy={y} r={13} fill="transparent" />
                {state === 'next' && (
                  <circle cx={x} cy={y} r={r} fill="none" stroke="#d97706" strokeWidth={2}>
                    <animate attributeName="r" values={`${r};${r + 9}`} dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="white"
                  fillOpacity={state === 'future' ? 0.75 : 1}
                  stroke={state === 'taken' ? '#16a34a' : state === 'future' ? '#94a3b8' : '#d97706'}
                  strokeWidth={state === 'future' ? 1.2 : 2}
                />
                {state !== 'future' && (
                  <text x={x} y={y + 4.5} fontSize={11.5} textAnchor="middle">
                    {state === 'taken' ? place.souvenir.emoji : place.emoji}
                  </text>
                )}
                {named && (
                  <text
                    x={label.x}
                    y={label.y}
                    fontSize={14}
                    fontWeight={900}
                    textAnchor={label.anchor}
                    fill={state === 'next' ? '#92400e' : '#0f172a'}
                    stroke="white"
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {place.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* The companion, on the way */}
          <g onClick={onCompanion} style={{ cursor: 'pointer' }}>
            <circle cx={walker.x} cy={walker.y - 20} r={17} fill="white" fillOpacity={0.85} />
            <text x={walker.x} y={walker.y - 9} fontSize={30} textAnchor="middle">{companion.emoji}</text>
          </g>
        </svg>

        {/* How far to the next place, in words (and said when tapped) */}
        <button
          type="button"
          onClick={() => say(`再完成${legsLeft === 1 ? '一' : '兩'}次冒險，就到${position.next.name}了！`)}
          className="absolute left-2 bottom-2 z-20 flex items-center gap-1 bg-white/90 rounded-full px-3 py-1 text-sm font-black text-amber-800 shadow"
        >
          🚩 再冒險 {legsLeft} 次，就到{position.next.name}！
          {position.lap > 0 && <span className="text-amber-600">（第 {position.lap + 1} 圈）</span>}
        </button>
      </div>
    </div>
  );
};
