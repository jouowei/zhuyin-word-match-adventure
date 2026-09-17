
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { WordItem } from '../types';
import { PenTool, Eraser, CheckCircle, AlertCircle, PlayCircle, Volume2 } from 'lucide-react';
import { playSound } from '../utils/sound';
import { playChineseAudio } from '../utils/chineseAudio';
import { addInkPoint, evaluateShape, Point, samplePolyline, StrokeTolerance } from '../utils/strokeTracing';
import { WRITING_STAGE_NAMES, writingInstruction } from '../services/instructions';
import { InstructionButton, withInstruction } from './VoiceGuide';

interface WritingOverlayProps {
  character: WordItem | null;
  /** 0 trace with the animation, 1 numbered start dots only, 2 blank grid with the character above, 3 from its sound and zhuyin */
  stage?: number;
  onComplete: (helped: boolean) => void;
  onCancel: () => void;
}

// hanzi-writer data: 1024 box, y pointing up from a baseline at 900
const VIEW = 1024;
const BASELINE = 900;
// Tuned on 20 lesson characters written at 75% size with jitter: ~90% of complete writing passes, ~94% with a missing stroke is caught
const TOLERANCE: StrokeTolerance = { coverRadius: 70, trackRadius: 100, minGap: 12, reverseMinLength: 170 };
/** Failed checks before support comes back one stage (or, with full support, before letting the child move on). */
const TRIES_BEFORE_STEP_BACK = 2;
const TRIES_BEFORE_ACCEPTING = 3;

export const WritingOverlay: React.FC<WritingOverlayProps> = ({ character, stage = 0, onComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<Point[]>([]);
  const inkLengthRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const drawingRef = useRef(false);
  const failsRef = useRef(0);
  const helpedRef = useRef(false);
  const doneRef = useRef(false);
  const [feedback, setFeedback] = useState<{ text: string; good: boolean } | null>(null);
  const [size, setSize] = useState(320);
  const [shownStage, setShownStage] = useState(stage);

  // Stroke Data State
  const [strokeData, setStrokeData] = useState<{ strokes: string[]; medians: number[][][] } | null>(null);
  const [animateTrigger, setAnimateTrigger] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSize(Math.min(window.innerWidth - 64, 320));
    }
  }, []);

  useEffect(() => {
    if (!character) return;
    const timer = setTimeout(() => playChineseAudio(withInstruction(`writing-${stage}`, writingInstruction(stage), [{ url: character.audioUrl, text: character.character }])), 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id]);

  // Fetch Stroke Data when character changes
  useEffect(() => {
    clearCanvas();
    setFeedback(null);
    setStrokeData(null);
    setShownStage(stage);
    failsRef.current = 0;
    helpedRef.current = false;
    doneRef.current = false;

    if (character) {
      const targetChar = character.character.charAt(0);
      loadStrokeData(targetChar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const loadStrokeData = async (char: string) => {
    try {
      // 1. Try Traditional First
      let response = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-traditional@2.0/${char}.json`);

      // 2. Fallback to Standard
      if (!response.ok) {
         response = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`);
      }

      if (response.ok) {
        const data = await response.json();
        setStrokeData(data);
        setTimeout(() => setAnimateTrigger(prev => prev + 1), 100);
      } else {
        console.warn("Stroke data not found, falling back to font.");
      }
    } catch (e) {
      console.error("Error loading stroke data", e);
    }
  };

  // Centre line of each stroke in screen orientation, for the shape check
  const strokeLines = useMemo(
    () => (strokeData?.medians || []).map(median => samplePolyline(median.map(([x, y]) => ({ x, y: BASELINE - y })), 25)),
    [strokeData]
  );

  const toView = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      point: { x: ((e.clientX - rect.left) / rect.width) * VIEW, y: ((e.clientY - rect.top) / rect.height) * VIEW },
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || doneRef.current) return;
    canvas.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    setFeedback(null);

    const { px, py, point } = toView(e);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 0.1, py + 0.1);
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 15; // Slightly thicker for easier writing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPointRef.current = addInkPoint(inkRef.current, null, point, TOLERANCE);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { px, py, point } = toView(e);
    ctx.lineTo(px, py);
    ctx.stroke();
    const previous = lastPointRef.current;
    lastPointRef.current = addInkPoint(inkRef.current, previous, point, TOLERANCE);
    // Count length only for accepted points, so tiny jitter isn't measured over and over
    if (previous && lastPointRef.current !== previous) inkLengthRef.current += Math.hypot(point.x - previous.x, point.y - previous.y);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = [];
    inkLengthRef.current = 0;
    lastPointRef.current = null;
  }

  /** Shows the animation and outline again; finishing after that counts as done with help. */
  const peek = () => {
    clearCanvas();
    setFeedback(null);
    if (shownStage > 0) helpedRef.current = true;
    setShownStage(0);
    setAnimateTrigger(prev => prev + 1);
  };

  const finish = (helped: boolean, text: string) => {
    doneRef.current = true;
    playSound('success');
    setFeedback({ text, good: true });
    setTimeout(() => onComplete(helped), 900);
  };

  const handleSubmit = () => {
    if (inkRef.current.length === 0) {
      setFeedback({ text: '請先寫寫看喔！', good: false });
      playSound('error');
      return;
    }
    // Without stroke data (offline) the writing can't be checked
    if (!strokeData) {
      finish(false, '寫好了！');
      return;
    }
    // Without guides on the grid, size and position don't matter, only the shape
    const result = evaluateShape(strokeLines, inkRef.current, inkLengthRef.current, TOLERANCE, shownStage >= 2);
    if (result.pass) {
      finish(helpedRef.current || (stage === 0 && failsRef.current >= TRIES_BEFORE_STEP_BACK), '寫得真漂亮！🎉');
      return;
    }

    playSound('error');
    failsRef.current++;
    clearCanvas();
    if (shownStage > 0 && failsRef.current >= TRIES_BEFORE_STEP_BACK) {
      failsRef.current = 0;
      helpedRef.current = true;
      setShownStage(shownStage - 1);
      setAnimateTrigger(prev => prev + 1);
      setFeedback({ text: '沒關係，提示回來幫你了！', good: false });
      return;
    }
    if (shownStage === 0 && failsRef.current >= TRIES_BEFORE_ACCEPTING) {
      finish(true, '寫得很努力！');
      return;
    }
    setFeedback({
      text: result.missingStrokes > 0 ? '還有筆畫沒寫到，再寫寫看！' : result.overdrawn ? '寫太多囉，一筆一筆慢慢寫！' : '有些地方寫到外面了，再寫一次！',
      good: false,
    });
  };

  // Helper to convert median points [[x,y], [x,y]] to SVG Path "M x y L x y"
  const getMedianPath = (points: number[][]) => {
    if (!points || points.length === 0) return "";
    return "M " + points.map(p => `${p[0]} ${p[1]}`).join(" L ");
  };

  if (!character) return null;

  const char = character.character.charAt(0);
  const zhuyin = character.zhuyin.split(' ')[0] || '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm p-4">
      <div className="animate-pop max-w-md w-full">
      <div className={`bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center w-full ${feedback && !feedback.good ? 'animate-shake-once' : ''}`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <PenTool className="text-blue-500" /> 小小書法家
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{WRITING_STAGE_NAMES[shownStage]}</span>
        </h2>

        {/* The model to copy fades: outline on the grid → the character above → only its sound and zhuyin */}
        <div className="flex items-center gap-3 h-14 mb-1">
          {shownStage === 2 && <span className="font-kai text-5xl text-gray-800">{char}</span>}
          {shownStage === 3 && (
            <>
              <span className="text-2xl font-bold text-gray-600">{zhuyin}</span>
              {character.emoji && character.emoji !== '❓' && <span className="text-4xl">{character.emoji}</span>}
            </>
          )}
          <button
            onClick={() => playChineseAudio([{ url: character.audioUrl, text: character.character }])}
            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition active:scale-95"
          >
            <Volume2 size={22} />
          </button>
        </div>

        <div className="h-8 mb-2 flex items-center justify-center w-full">
           {feedback ? (
             <span className={`font-bold flex items-center gap-2 ${feedback.good ? 'text-green-600' : 'text-red-500 animate-pulse'}`}>
               {!feedback.good && <AlertCircle size={18} />} {feedback.text}
             </span>
           ) : (
             <span className="text-gray-500 text-sm flex items-center gap-1">
                {shownStage === 0 ? (strokeData ? "看清楚筆畫順序，再寫一次" : "把下面的字描一遍") : shownStage === 1 ? '照數字順序，從每個點開始寫' : '自己在格子裡寫寫看'}
             </span>
           )}
        </div>

        <div className="relative border-4 border-gray-200 rounded-2xl bg-white shadow-inner mb-4 overflow-hidden touch-none select-none" style={{width: size, height: size}}>

           {/* 1. Background Grid (Rice Grid) */}
           <div className="absolute inset-0 pointer-events-none">
             <div className="absolute inset-0 border-2 border-red-100"></div>
             <div className="absolute inset-0 border-t-2 border-dashed border-red-100 top-1/2 -translate-y-1/2"></div>
             <div className="absolute inset-0 border-l-2 border-dashed border-red-100 left-1/2 -translate-x-1/2"></div>
           </div>

           {/* 2. Character Guide */}
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {strokeData ? (
                <svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
                  <defs>
                    {strokeData.strokes.map((d, i) => (
                      <clipPath key={`clip-${i}`} id={`clip-${i}-${animateTrigger}`}>
                        <path d={d} />
                      </clipPath>
                    ))}
                  </defs>

                  {shownStage === 0 && (
                    <g transform={`translate(0, ${BASELINE}) scale(1, -1)`}>
                      {/* A. Background Template (Light Gray) - Shows the full character form */}
                      {strokeData.strokes.map((d, i) => (
                         <path key={`bg-${i}`} d={d} fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="4" />
                      ))}

                      {/* B. Animated Fill (Light Red using Medians + ClipPath) - Shows direction */}
                      {strokeData.medians.map((median, i) => (
                         <path
                           key={`anim-${i}-${animateTrigger}`}
                           d={getMedianPath(median)}
                           fill="none"
                           stroke="#fca5a5"
                           strokeWidth="150"
                           strokeLinecap="round"
                           clipPath={`url(#clip-${i}-${animateTrigger})`}
                           style={{
                             animation: `fillStroke 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                             animationDelay: `${i * 0.8}s`,
                             strokeDasharray: 2000,
                             strokeDashoffset: 2000,
                           }}
                         />
                      ))}
                    </g>
                  )}

                  {/* C. Stroke order numbers: on the stroke while tracing, at each stroke's start afterwards */}
                  {shownStage <= 1 && strokeData.medians.map((median, i) => {
                      const spot = shownStage === 0 ? median[Math.floor(median.length / 2)] : median[0];
                      const x = spot[0];
                      const y = BASELINE - spot[1];
                      return shownStage === 0 ? (
                         <text key={`num-${i}`} x={x} y={y} dy="30" textAnchor="middle" fill="rgba(0, 0, 0, 0.25)" fontSize="80" fontWeight="900" fontFamily="Arial">
                           {i + 1}
                         </text>
                      ) : (
                        <g key={`dot-${i}`}>
                          <circle cx={x} cy={y} r={42} fill="#22c55e" stroke="white" strokeWidth={10} opacity={0.9} />
                          <text x={x} y={y} dy="20" textAnchor="middle" fill="white" fontSize="58" fontWeight="900" fontFamily="Arial">{i + 1}</text>
                        </g>
                      );
                  })}
                </svg>
              ) : shownStage <= 1 ? (
                // Fallback Font
                <span className="text-gray-200 font-sans font-bold" style={{fontSize: size * 0.7}}>
                   {char}
                </span>
              ) : null}
           </div>

           {/* 3. User Drawing Canvas */}
           <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
           />
        </div>

        <style>{`
          @keyframes fillStroke {
            to { stroke-dashoffset: 0; }
          }
        `}</style>

        <div className="flex gap-3 w-full">
          <button
            onClick={peek}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1"
          >
            <PlayCircle size={20} /> {shownStage === 0 ? '再看一次' : '偷看一下'}
          </button>
          <button
            onClick={clearCanvas}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1"
          >
            <Eraser size={20} /> 清除
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-1 transform active:scale-95 transition"
          >
            <CheckCircle size={20} /> 完成了
          </button>
        </div>

        <InstructionButton text={writingInstruction(shownStage)} className="mt-3" />
        <button onClick={onCancel} className="mt-3 text-gray-400 text-sm underline hover:text-gray-600">
            放棄不寫了
        </button>
      </div>
      </div>
    </div>
  );
};
