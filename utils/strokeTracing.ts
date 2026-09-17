/**
 * Shared stroke-by-stroke tracing checks for English letters and zhuyin symbols.
 * All distances are in the caller's drawing units; pass tolerances scaled to the glyph size.
 */

export interface Point { x: number; y: number; }

export interface StrokeTolerance {
  coverRadius: number;  // Ink this close to the stroke counts as tracing it
  trackRadius: number;  // Ink farther than this is off the stroke
  minGap: number;       // Minimum distance between recorded ink points (keeps density even)
  reverseMinLength: number; // Only open strokes longer than this get a direction check
}

export type StrokeResult = 'done' | 'wrong-place' | 'reversed' | 'overdrawn' | 'continue';

const MIN_COVERAGE = 0.7;       // Share of the current stroke that must be traced
const MIN_ON_TRACK = 0.6;       // Share of the ink that must stay on the current stroke
const WRONG_STROKE_TRACK = 0.4; // Below this the child is clearly drawing somewhere else

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const sampleSvgPath = (path: SVGPathElement, step: number): Point[] => {
  const length = path.getTotalLength();
  const count = Math.max(2, Math.ceil(length / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const pt = path.getPointAtLength((length * i) / count);
    return { x: pt.x, y: pt.y };
  });
};

export const samplePolyline = (points: Point[], step: number): Point[] => {
  if (points.length < 2) return [...points];
  const samples: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const count = Math.max(1, Math.ceil(distance(a, b) / step));
    for (let k = 1; k <= count; k++) samples.push({ x: a.x + (b.x - a.x) * (k / count), y: a.y + (b.y - a.y) * (k / count) });
  }
  return samples;
};

/** Adds an ink point, filling gaps from fast fingers and skipping jitter from slow ones. */
export const addInkPoint = (ink: Point[], last: Point | null, p: Point, tolerance: StrokeTolerance): Point | null => {
  if (last) {
    const gap = distance(p, last);
    if (gap < tolerance.minGap) return last;
    const steps = Math.floor(gap / (tolerance.minGap * 2));
    for (let i = 1; i < steps; i++) {
      ink.push({ x: last.x + (p.x - last.x) * (i / steps), y: last.y + (p.y - last.y) * (i / steps) });
    }
  }
  ink.push(p);
  return p;
};

/** Judges the ink drawn so far against the stroke the child should be writing now. */
export const evaluateStroke = (samples: Point[], ink: Point[], tolerance: StrokeTolerance): StrokeResult => {
  if (samples.length === 0 || ink.length === 0) return 'continue';

  const coverage = samples.filter(s => ink.some(p => distance(s, p) <= tolerance.coverRadius)).length / samples.length;
  const onTrack = ink.filter(p => samples.some(s => distance(s, p) <= tolerance.trackRadius)).length / ink.length;

  if (onTrack < WRONG_STROKE_TRACK && ink.length > 6) return 'wrong-place';

  const start = samples[0];
  const end = samples[samples.length - 1];
  const reachesBothEnds = [start, end].every(s => ink.some(p => distance(s, p) <= tolerance.coverRadius));

  if (coverage < MIN_COVERAGE || onTrack < MIN_ON_TRACK || !reachesBothEnds) {
    // Lots of ink but still not matching: start this stroke over instead of leaving the child stuck
    return ink.length > samples.length * 4 ? 'overdrawn' : 'continue';
  }

  // Direction matters for open strokes: start near the green dot
  if (distance(start, end) > tolerance.reverseMinLength && distance(ink[0], start) > distance(ink[0], end)) {
    return 'reversed';
  }
  return 'done';
};

const SHAPE_STROKE_COVERAGE = 0.7; // Share of each stroke's centre line that must have ink near it
const SHAPE_ON_TRACK = 0.7;        // Share of the ink that must lie near some stroke
const SHAPE_MAX_INK = 2.5;         // Ink length allowed per unit of stroke length (catches scribbling over dense characters)

const polylineLength = (points: Point[]) => points.reduce((sum, p, i) => (i ? sum + distance(points[i - 1], p) : 0), 0);

const bounds = (points: Point[]) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  return { ...box, cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, size: Math.max(box.maxX - box.minX, box.maxY - box.minY) };
};

/**
 * Whole-character check that ignores stroke order and direction, for Chinese characters
 * (the open stroke data follows the mainland stroke order for some of them).
 * With `normalize`, writing that is smaller, bigger or off-centre is scaled onto the character first
 * (for writing on a blank grid without guides).
 */
export const evaluateShape = (
  strokes: Point[][], rawInk: Point[], rawInkLength: number,
  tolerance: Pick<StrokeTolerance, 'coverRadius' | 'trackRadius'>, normalize = false,
) => {
  const samples = strokes.flat();
  if (samples.length === 0 || rawInk.length < 5) return { missingStrokes: strokes.length, onTrack: 0, overdrawn: false, pass: false };
  let ink = rawInk;
  let inkLength = rawInkLength;
  if (normalize) {
    const target = bounds(samples);
    const drawn = bounds(rawInk);
    const scale = drawn.size > 0 ? target.size / drawn.size : 1;
    ink = rawInk.map(p => ({ x: (p.x - drawn.cx) * scale + target.cx, y: (p.y - drawn.cy) * scale + target.cy }));
    inkLength = rawInkLength * scale;
  }
  const overdrawn = inkLength > SHAPE_MAX_INK * strokes.reduce((sum, stroke) => sum + polylineLength(stroke), 0);
  // Every stroke must be written, so a long stroke can't make up for a missing short one
  const missingStrokes = strokes.filter(stroke =>
    stroke.filter(s => ink.some(p => distance(s, p) <= tolerance.coverRadius)).length / stroke.length < SHAPE_STROKE_COVERAGE
  ).length;
  const onTrack = ink.filter(p => samples.some(s => distance(s, p) <= tolerance.trackRadius)).length / ink.length;
  return { missingStrokes, onTrack, overdrawn, pass: missingStrokes === 0 && onTrack >= SHAPE_ON_TRACK && !overdrawn };
};
