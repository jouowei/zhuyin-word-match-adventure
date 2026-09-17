import React, { useEffect, useRef, useState } from 'react';
import { EnglishRoundItem } from '../../types';
import { getLetter } from '../../english/letters';
import { FourLineLetter, getLetterViewBox, STROKE_WIDTH } from './FourLineLetter';
import { PenTool, Eraser, AlertCircle, PlayCircle, Volume2 } from 'lucide-react';
import { playSound } from '../../utils/sound';
import { speakEnglish, speakLetterName, speakPraise } from '../../utils/englishSpeech';
import { playChineseAudio } from '../../utils/chineseAudio';
import { addInkPoint, evaluateStroke, Point, sampleSvgPath, StrokeTolerance } from '../../utils/strokeTracing';
import { WRITING_STAGE_NAMES } from '../../services/instructions';
import { InstructionButton, speakHelp, withInstruction } from '../VoiceGuide';

interface LetterTraceOverlayProps {
  item: EnglishRoundItem | null;
  /** 0 trace the gray letter, 1 numbered start dots only, 2 blank four-line paper with the letter above, 3 from its name and picture */
  stage?: number;
  onComplete: (helped: boolean) => void;
  onCancel: () => void;
}

// Tolerances in four-line-paper units (baseline-to-top height is 200)
const TOLERANCE: StrokeTolerance = { coverRadius: 34, trackRadius: 50, minGap: 4, reverseMinLength: 60 };
/** Wrong tries on one stroke before support comes back one stage. */
const TRIES_BEFORE_STEP_BACK = 2;

export const letterTraceInstruction = (stage: number) => [
  '從綠色的一號點開始，順著白點的方向，在四線格上一筆一筆寫。',
  '這次沒有灰色的字母了。從綠色的一號點開始，一筆一筆寫。',
  '看著上面的字母，自己在四線格上寫。',
  '聽聽看是哪一個字母，自己把它寫出來。',
][stage] || '';

export const LetterTraceOverlay: React.FC<LetterTraceOverlayProps> = ({ item, stage = 0, onComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<SVGPathElement[]>([]);
  const attemptRef = useRef<Point[]>([]);   // Ink drawn for the current stroke (may span several finger lifts)
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
  const [shownStage, setShownStage] = useState(stage);

  const info = item ? getLetter(item.text) : undefined;
  const upper = item?.traceCase === 'upper';
  const char = info ? (upper ? info.upper : info.lower) : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSize(Math.min(window.innerWidth - 64, 340));
    }
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Say which letter to write: its name, and for dictation also its picture word
  const letterSteps = () => info ? [
    { text: upper ? '大寫' : '小寫', rate: 0.95 },
    { text: info.name, lang: 'en' as const },
    ...(stage === 3 ? [{ text: '就是', rate: 0.95 }, { text: info.keyword, lang: 'en' as const }, { text: info.endSound ? '結尾的字母' : '開頭的字母', rate: 0.95 }] : []),
  ] : [];

  useEffect(() => {
    resetStrokes();
    setShownStage(stage);
    helpedRef.current = false;
    totalErrorsRef.current = 0;
    if (!item) return;
    // On a timer, so the instruction isn't used up by React's double-run of effects in development
    const timer = setTimeout(() => playChineseAudio(withInstruction(`trace-letter-${stage}`, letterTraceInstruction(stage), letterSteps())), 150);
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

  const toViewBox = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const vb = getLetterViewBox(char);
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.size,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.size,
    };
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1); // Show a dot for taps (i, j)
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.85)';
    ctx.lineWidth = (STROKE_WIDTH * 0.75 * rect.width) / getLetterViewBox(char).size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = null;
    const p = toViewBox(e.clientX, e.clientY);
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

    const p = toViewBox(e.clientX, e.clientY);
    if (p) addPoint(p);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    checkCurrentStroke();
  };

  const checkCurrentStroke = () => {
    const path = pathsRef.current[strokeRef.current];
    const ink = attemptRef.current;
    if (!path || ink.length === 0) return;

    const strokeNumber = strokeRef.current + 1;
    const result = evaluateStroke(sampleSvgPath(path, 8), ink, TOLERANCE);
    if (result === 'continue') return; // Maybe the finger was lifted halfway
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

    if (next >= pathsRef.current.length) {
      finishedRef.current = true;
      playSound('success');
      speakPraise();
      // With full tracing support, only lots of trouble counts as needing help
      const helped = helpedRef.current || (stage === 0 && totalErrorsRef.current >= 3);
      timers.current.push(setTimeout(() => onComplete(helped), 900));
    } else {
      playSound('pop');
    }
  };

  const peek = () => {
    resetStrokes();
    stepBack(0);
    setAnimKey(k => k + 1);
  };

  if (!item || !info) return null;
  const finished = activeStroke >= pathsRef.current.length && pathsRef.current.length > 0;
  const showModel = shownStage <= 2 || finished;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm p-4">
      {/* Pop only once on open: replaying it when feedback clears would scale the canvas under the child's finger */}
      <div className="animate-pop max-w-md w-full">
      <div className={`bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center w-full ${feedback ? 'animate-shake-once' : ''}`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <PenTool className="text-amber-500" /> 字母描寫
          <span className="text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{WRITING_STAGE_NAMES[shownStage]}</span>
        </h2>

        <div className="flex items-center gap-3 mb-2 h-12">
          {showModel
            ? <span className="font-english text-4xl font-bold text-gray-800">{info.upper}{info.lower}</span>
            : <span className="text-lg font-bold text-gray-500">{upper ? '大寫' : '小寫'} ？</span>}
          <span className="text-4xl">{info.emoji}</span>
          <button
            onClick={() => (shownStage === 3 ? speakEnglish(`${info.name}. ${info.keyword}.`, { rate: 0.75 }) : speakLetterName(item.text))}
            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full transition active:scale-95"
          >
            <Volume2 size={22} />
          </button>
        </div>

        <div className="h-8 mb-2 flex items-center justify-center w-full text-center">
          {feedback ? (
            <span className="text-red-500 font-bold flex items-center gap-2 animate-pulse">
              <AlertCircle size={18} /> {feedback}
            </span>
          ) : finished ? (
            <span className="text-green-600 font-black text-lg">寫好了！Great job! 🎉</span>
          ) : (
            <span className="text-gray-500 text-sm">
              {upper ? '大寫' : '小寫'} {showModel && <b className="font-english text-lg">{char}</b>}：
              第 <b className="text-green-600 text-lg">{activeStroke + 1}</b> 筆{shownStage === 0 ? '，從綠色點沿著白點方向寫' : shownStage === 1 ? '，從綠色點開始寫' : ''}
            </span>
          )}
        </div>

        <div className="relative border-4 border-gray-200 rounded-2xl bg-white shadow-inner mb-4 overflow-hidden touch-none select-none" style={{ width: size, height: size }}>
          <div className="absolute inset-0 pointer-events-none">
            <FourLineLetter
              char={char}
              size={size}
              animKey={animKey}
              showGuide={shownStage === 0}
              showInk={shownStage === 0}
              showDirection={shownStage === 0}
              showStartDots={shownStage <= 1}
              inkColor="#fca5a5"
              activeStroke={activeStroke}
              onPathsReady={paths => { pathsRef.current = paths; }}
            />
          </div>
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
            onClick={peek}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1"
          >
            <PlayCircle size={20} /> {shownStage === 0 ? '再看一次' : '偷看一下'}
          </button>
          <button
            onClick={resetStrokes}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1"
          >
            <Eraser size={20} /> 重寫
          </button>
        </div>

        <InstructionButton text={letterTraceInstruction(shownStage)} className="mt-3" />
        <button onClick={onCancel} className="mt-3 text-gray-400 text-sm underline hover:text-gray-600">
          先跳過，下次再寫
        </button>
      </div>
      </div>
    </div>
  );
};
