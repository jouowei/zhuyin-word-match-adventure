import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WordItem } from '../types';
import { ZHUYIN_STROKES, ZHUYIN_STROKE_BOX } from '../zhuyin/strokeData';
import { PenTool, Eraser, AlertCircle, PlayCircle, Volume2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { playChineseAudio, stopChineseAudio } from '../utils/chineseAudio';
import { addInkPoint, distance, evaluateStroke, Point, samplePolyline, StrokeTolerance } from '../utils/strokeTracing';
import { WRITING_STAGE_NAMES, zhuyinTraceInstruction } from '../services/instructions';
import { InstructionButton, speakHelp, withInstruction } from './VoiceGuide';

interface ZhuyinTraceOverlayProps {
  item: WordItem | null;   // item.character is the zhuyin symbol
  /** 0 trace the gray symbol, 1 only numbered start dots, 2 blank grid with the symbol shown above, 3 from its sound only */
  stage?: number;
  onComplete: (helped: boolean) => void;
  onCancel: () => void;
}

const BOX = ZHUYIN_STROKE_BOX;
// A symbol is ~1700 units tall in the 2150 box
const TOLERANCE: StrokeTolerance = { coverRadius: 210, trackRadius: 310, minGap: 25, reverseMinLength: 350 };
const DEMO_SECONDS_PER_STROKE = 0.9;
/** Wrong tries on one stroke before support comes back one stage. */
const TRIES_BEFORE_STEP_BACK = 2;

const toPoints = (track: number[][]): Point[] => track.map(([x, y]) => ({ x, y }));
const polylinePath = (track: number[][]) => 'M' + track.map(([x, y]) => `${x} ${y}`).join('L');

export const ZhuyinTraceOverlay: React.FC<ZhuyinTraceOverlayProps> = ({ item, stage = 0, onComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attemptRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(false);
  const strokeRef = useRef(0);
  const finishedRef = useRef(false);
  const strokeErrorsRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const helpedRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [size, setSize] = useState(320);
  const [animKey, setAnimKey] = useState(0);
  const [activeStroke, setActiveStroke] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Support shown right now: starts at the item's stage and steps back when the child gets stuck
  const [shownStage, setShownStage] = useState(stage);

  const symbol = item?.character || '';
  const strokes = ZHUYIN_STROKES[symbol] || [];

  // Number dots at the start of each stroke; strokes that start at the same spot get nudged along their track
  const dots = useMemo(() => {
    const placed: Point[] = [];
    return strokes.map(stroke => {
      const samples = samplePolyline(toPoints(stroke.track), 40);
      let spot = samples[0];
      for (const index of [4, 7, 10]) {
        if (!placed.some(p => distance(p, spot) < 170)) break;
        spot = samples[Math.min(index, samples.length - 1)];
      }
      placed.push(spot);
      return spot;
    });
  }, [symbol]);

  useEffect(() => {
    // The grid is as big as the screen allows, leaving room for the buttons around it
    if (typeof window !== 'undefined') setSize(Math.max(200, Math.min(window.innerWidth - 56, window.innerHeight - 355, 340)));
    return () => {
      timers.current.forEach(clearTimeout);
      stopChineseAudio();
    };
  }, []);

  useEffect(() => {
    resetStrokes();
    setShownStage(stage);
    helpedRef.current = false;
    totalErrorsRef.current = 0;
    if (!item) return;
    // On a timer, so the instruction isn't used up by React's double-run of effects in development
    const timer = setTimeout(() => playChineseAudio(withInstruction(`trace-zhuyin-${stage}`, zhuyinTraceInstruction(stage), [{ url: item.audioUrl, text: item.character }])), 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  function clearInk() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    attemptRef.current = [];
    lastPointRef.current = null;
  }

  function resetStrokes() {
    clearInk();
    strokeRef.current = 0;
    strokeErrorsRef.current = 0;
    finishedRef.current = false;
    setActiveStroke(0);
    setFeedback(null);
  }

  /** Brings support back to stage `to`; finishing after that counts as done with help. */
  const stepBack = (to: number) => {
    if (to >= shownStage) return;
    helpedRef.current = true;
    setShownStage(to);
    setAnimKey(k => k + 1);
  };

  const toBox = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * BOX, y: ((clientY - rect.top) / rect.height) * BOX };
  };

  const addPoint = (p: Point) => {
    lastPointRef.current = addInkPoint(attemptRef.current, lastPointRef.current, p, TOLERANCE);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || finishedRef.current) return;
    canvas.setPointerCapture?.(e.pointerId);
    isDrawingRef.current = true;
    setFeedback(null);

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineTo(e.clientX - rect.left + 0.1, e.clientY - rect.top + 0.1);
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.85)';
    ctx.lineWidth = rect.width * 0.06;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = null;
    const p = toBox(e.clientX, e.clientY);
    if (p) addPoint(p);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    const p = toBox(e.clientX, e.clientY);
    if (p) addPoint(p);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    checkCurrentStroke();
  };

  const checkCurrentStroke = () => {
    const stroke = strokes[strokeRef.current];
    if (!stroke) return;
    const strokeNumber = strokeRef.current + 1;
    const result = evaluateStroke(samplePolyline(toPoints(stroke.track), 60), attemptRef.current, TOLERANCE);
    if (result === 'continue') return;
    if (result !== 'done') {
      playSound('error');
      strokeErrorsRef.current++;
      totalErrorsRef.current++;
      const stuck = strokeErrorsRef.current >= TRIES_BEFORE_STEP_BACK && shownStage > 0;
      if (stuck) {
        strokeErrorsRef.current = 0;
        stepBack(shownStage - 1);
      }
      const where = shownStage <= 1 ? `從綠色 ${strokeNumber} 號點開始` : '想想這一筆從哪裡開始';
      const message = stuck ? '沒關係，提示回來幫你了！'
        : result === 'wrong-place' ? `先寫第 ${strokeNumber} 筆：${where}喔！`
        : result === 'reversed' ? `方向反了！${where}喔`
        : `再寫一次第 ${strokeNumber} 筆！`;
      setFeedback(message);
      speakHelp([{ text: message }]); // Five-year-olds can't read the message
      clearInk();
      return;
    }

    clearInk();
    strokeErrorsRef.current = 0;
    const next = strokeRef.current + 1;
    strokeRef.current = next;
    setActiveStroke(next);
    if (next >= strokes.length) {
      finishedRef.current = true;
      playSound('success');
      if (item) playChineseAudio([{ url: item.audioUrl, text: item.character }]);
      // With full tracing support, only lots of trouble counts as needing help
      const helped = helpedRef.current || (stage === 0 && totalErrorsRef.current >= 3);
      timers.current.push(setTimeout(() => onComplete(helped), 1000));
    } else {
      playSound('pop');
    }
  };

  if (!item) return null;
  const finished = strokes.length > 0 && activeStroke >= strokes.length;
  const showOutline = shownStage === 0;
  const showDots = shownStage <= 1;
  const showModel = shownStage <= 2 || finished;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black bg-opacity-90 backdrop-blur-sm p-3">
      {/* Pop only once on open: replaying it when feedback clears would scale the canvas under the child's finger */}
      <div className="animate-pop max-w-md w-full my-auto">
      <div className={`bg-white p-4 md:p-6 rounded-3xl shadow-2xl flex flex-col items-center w-full ${feedback ? 'animate-shake-once' : ''}`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <PenTool className="text-amber-500" /> 小小書法家
          <span className="text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{WRITING_STAGE_NAMES[shownStage]}</span>
        </h2>

        <div className="flex items-center gap-3 mb-1 h-12">
          {showModel ? <span className="text-4xl font-bold text-gray-800">{symbol}</span> : <span className="text-4xl font-bold text-gray-300">？</span>}
          {item.exampleWord && <span className="text-gray-500 font-bold">{item.emoji} {item.exampleWord}</span>}
          <button
            onClick={() => playChineseAudio([{ url: item.audioUrl, text: symbol }])}
            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full transition active:scale-95"
          >
            <Volume2 size={22} />
          </button>
        </div>

        <div className="h-8 mb-2 flex items-center justify-center w-full text-center">
          {feedback ? (
            <span className="text-red-500 font-bold flex items-center gap-2 animate-pulse"><AlertCircle size={18} /> {feedback}</span>
          ) : finished ? (
            <span className="text-green-600 font-black text-lg">寫得真漂亮！🎉</span>
          ) : strokes.length === 0 ? (
            <span className="text-gray-500 text-sm">照著灰色的字描一遍</span>
          ) : (
            <span className="text-gray-500 text-sm">第 <b className="text-green-600 text-lg">{activeStroke + 1}</b> 筆（共 {strokes.length} 筆）{showOutline ? '，從綠色點沿著白點方向寫' : showDots ? '，從綠色點開始寫' : ''}</span>
          )}
        </div>

        <div className="relative border-4 border-gray-200 rounded-2xl bg-white shadow-inner mb-4 overflow-hidden touch-none select-none" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0 pointer-events-none">
            <style>{`
              @keyframes zy-draw-stroke { to { stroke-dashoffset: 0; } }
              @keyframes zy-march-stroke { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -0.071; } }
            `}</style>
            {/* 田字格 */}
            <line x1={BOX / 2} y1={0} x2={BOX / 2} y2={BOX} stroke="#fecaca" strokeWidth={12} strokeDasharray="60 45" />
            <line x1={0} y1={BOX / 2} x2={BOX} y2={BOX / 2} stroke="#fecaca" strokeWidth={12} strokeDasharray="60 45" />

            <defs>
              {strokes.map((stroke, i) => (
                <clipPath key={`clip-${i}`} id={`zy-clip-${symbol.codePointAt(0)}-${i}`}>
                  <path d={stroke.outline} />
                </clipPath>
              ))}
            </defs>

            {strokes.length === 0 && (
              <text x={BOX / 2} y={BOX * 0.72} textAnchor="middle" fontSize={BOX * 0.7} fill="#e5e7eb">{symbol}</text>
            )}

            {showOutline && strokes.map((stroke, i) => (
              <path key={`bg-${i}`} d={stroke.outline} fill="#e5e7eb" />
            ))}

            {/* Written strokes turn blue in the standard shape; on the tracing stage the rest fill in as a demo */}
            {strokes.map((stroke, i) => (i < activeStroke || showOutline) && (
              <path
                key={`demo-${i}-${animKey}`}
                d={polylinePath(stroke.track)}
                fill="none"
                stroke={i < activeStroke ? '#2563eb' : '#fca5a5'}
                strokeWidth={260}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#zy-clip-${symbol.codePointAt(0)}-${i})`}
                pathLength={1}
                style={i < activeStroke ? undefined : {
                  strokeDasharray: '1 1.1',
                  strokeDashoffset: 1.05,
                  animation: 'zy-draw-stroke 0.8s ease-in-out forwards',
                  animationDelay: `${i * DEMO_SECONDS_PER_STROKE}s`,
                }}
              />
            ))}

            {/* Current stroke: marching dots show the direction */}
            {showOutline && strokes[activeStroke] && (
              <path
                key={`active-${activeStroke}`}
                d={polylinePath(strokes[activeStroke].track)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={45}
                strokeLinecap="round"
                pathLength={1}
                style={{ strokeDasharray: '0.001 0.07', animation: 'zy-march-stroke 0.9s linear infinite' }}
              />
            )}

            {showDots && dots.map((dot, i) => i < activeStroke ? null : (
              <g key={`dot-${i}`} opacity={i > activeStroke ? 0.35 : 1} className={i === activeStroke ? 'animate-pulse' : ''}>
                <circle cx={dot.x} cy={dot.y} r={i === activeStroke ? 120 : 95} fill="#22c55e" stroke="white" strokeWidth={25} />
                <text x={dot.x} y={dot.y} dy={i === activeStroke ? 55 : 45} textAnchor="middle" fill="white" fontSize={i === activeStroke ? 155 : 125} fontWeight={900} fontFamily="Arial">
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>

          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="absolute inset-0 cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => { resetStrokes(); stepBack(0); setAnimKey(k => k + 1); }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1"
          >
            <PlayCircle size={20} /> {shownStage === 0 ? '再看一次' : '偷看一下'}
          </button>
          <button onClick={resetStrokes} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1">
            <Eraser size={20} /> 重寫
          </button>
          {strokes.length === 0 && (
            <button onClick={() => onComplete(false)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl">完成了</button>
          )}
        </div>

        <InstructionButton text={zhuyinTraceInstruction(shownStage)} className="mt-3" />
        <button onClick={onCancel} className="mt-3 text-gray-400 text-sm underline hover:text-gray-600">先跳過，下次再寫</button>
        <p className="text-[10px] text-gray-300 mt-2">筆順：教育部《國語注音符號手冊》開放部件（CC BY 4.0）</p>
      </div>
      </div>
    </div>
  );
};
