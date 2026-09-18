import {
  recordMistake, recordSuccess, reviewSchedule, orderForReview, reviewWords, masteredCount, startOfDay, pickWithReview,
} from '../services/learningStats.ts';
import { choicesToHide, pointsFor } from '../services/scaffolding.ts';

const DAY = 86400000;
const t0 = new Date(2026, 8, 16, 10, 0).getTime();
let fails = 0;
const check = (name: string, ok: boolean) => { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) fails++; };

// New item answered on own: box 1, due tomorrow
let r = recordSuccess(undefined, 'w:船', true, t0);
check('new item -> box 1', r.stats['w:船'].box === 1 && r.stats['w:船'].due === startOfDay(t0) + DAY);
// Same day again: no advance
let r2 = recordSuccess(r.stats, 'w:船', true, t0 + 3600000);
check('same day no advance', r2.stats['w:船'].box === 1);
// Next day: box 2, due +3 days
let r3 = recordSuccess(r2.stats, 'w:船', true, t0 + DAY);
check('next day box 2', r3.stats['w:船'].box === 2 && r3.stats['w:船'].due === startOfDay(t0 + DAY) + 3 * DAY);
// Day +2 (not due): no advance, not mastered
let r4 = recordSuccess(r3.stats, 'w:船', true, t0 + 2 * DAY);
check('not due no advance', r4.stats['w:船'].box === 2 && !r4.mastered);
// Day +4: box 3 -> mastered once
let r5 = recordSuccess(r4.stats, 'w:船', true, t0 + 4 * DAY);
check('mastered at box 3', r5.stats['w:船'].box === 3 && r5.mastered && masteredCount(r5.stats) === 1);
// Mistake: back to box 0, due today, mastered flag kept (bonus once)
let m = recordMistake(r5.stats, 'w:船', t0 + 5 * DAY);
check('mistake -> box 0 due today', m['w:船'].box === 0 && m['w:船'].due === startOfDay(t0 + 5 * DAY) && m['w:船'].wrong === 1);
// Helped success doesn't advance
let h = recordSuccess(m, 'w:船', false, t0 + 5 * DAY + 1000);
check('helped no advance', h.stats['w:船'].box === 0 && !h.mastered);
// Re-climb to box 3 doesn't give bonus again
let s = h.stats;
for (const d of [5, 6, 9]) s = recordSuccess(s, 'w:船', true, t0 + d * DAY + 5000).stats;
const again = recordSuccess(h.stats, 'w:船', true, t0 + 5 * DAY + 2000);
check('re-climb box', s['w:船'].box === 3);
check('bonus not repeated', !recordSuccess(recordSuccess(recordSuccess(h.stats,'w:船',true,t0+5*DAY+9).stats,'w:船',true,t0+6*DAY).stats,'w:船',true,t0+9*DAY).mastered);

// Legacy notebook entry (old format) counts as due
const legacy: any = { 'w:魚': { wrong: 2, streak: 1, last: t0 - DAY } };
check('legacy due', reviewWords(legacy, t0).includes('魚'));
const legacyUp = recordSuccess(legacy, 'w:魚', true, t0);
check('legacy success -> box 1', legacyUp.stats['w:魚'].box === 1 && legacyUp.stats['w:魚'].wrong === 2);

// Ordering: mistakes first (max 2), then new, then other due, then known
const stats: any = {
  'w:A': { wrong: 1, box: 0, due: startOfDay(t0) },
  'w:B': { wrong: 1, box: 0, due: startOfDay(t0) },
  'w:C': { wrong: 0, box: 2, due: startOfDay(t0) - DAY },
  'w:D': { wrong: 0, box: 1, due: startOfDay(t0) + DAY },
};
const order = orderForReview(['A', 'B', 'C', 'D', 'E', 'F'], w => `w:${w}`, reviewSchedule(stats, t0));
check('order review first', new Set(order.slice(0, 2)).size === 2 && order.slice(0, 2).every(x => x === 'A' || x === 'B'));
check('order new next', order.slice(2, 4).every(x => x === 'E' || x === 'F'));
check('order other due then known', order[4] === 'C' && order[5] === 'D');
check('reviewWords sorted', JSON.stringify(reviewWords(stats, t0).slice(2)) === JSON.stringify(['C']));
const pick = pickWithReview(['A', 'B', 'C', 'D', 'E', 'F'], 4, w => `w:${w}`, reviewSchedule(stats, t0));
check('pick contains A B E F', ['A','B','E','F'].every(x => pick.includes(x)));

// Help helpers
check('points', pointsFor(0) === 10 && pointsFor(1) === 2 && pointsFor(3) === 2);
for (let i = 0; i < 50; i++) {
  const hidden = choicesToHide(['x', 'y', 'z'], ['x']);
  if (hidden.length !== 2 || !hidden.includes('x')) { check('choicesToHide keeps untried', false); break; }
}
check('choicesToHide single', choicesToHide(['x'], ['x']).length === 0);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');

if (fails) process.exitCode = 1;
