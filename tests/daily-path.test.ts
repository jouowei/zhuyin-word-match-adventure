import { buildDailyPath, roundSizeFor, pathTotals, maxSymbolsFor, toneSupportNeeded } from '../services/dailyPath.ts';
import { recordSkill, recordSuccess, startOfDay } from '../services/learningStats.ts';
import { evaluateShape, samplePolyline } from '../utils/strokeTracing.ts';
import { ZHUYIN_VOCABULARY, INITIAL_LESSONS } from '../constants.ts';
(async () => {

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const now = new Date(2026, 8, 16, 10).getTime();
const DAY = 86400000;

// Brand-new child, zhuyin
const p1 = await buildDailyPath({ gameMode: 'zhuyin', label: '注音', pool: ZHUYIN_VOCABULARY, stats: {}, points: 0, now });
check('new child: stations', JSON.stringify(p1.stations.map(s => s.kind)) === '["learn","practice","challenge","summary"]', p1.stations.map(s => s.kind));
check('new child: ㄅ and ㄇ (ㄆ clashes with 跑步)', JSON.stringify(p1.newItems) === '["ㄅ","ㄇ"]', p1.newItems);
check('new child: challenge write or speak', JSON.stringify(p1.stations[2].options) === '[3,4]', p1.stations[2].options);
check('practice words start with new items', p1.stations[1].words.slice(0, 2).join('') === 'ㄅㄇ' && p1.stations[1].words.length === ZHUYIN_VOCABULARY.length);

// Child who knows 12 symbols, 3 due (one mistake)
let stats: any = {};
ZHUYIN_VOCABULARY.slice(0, 12).forEach(s => { stats = recordSuccess(stats, `zy:${s}`, true, now - 5 * DAY).stats; });
stats['zy:ㄅ'].due = startOfDay(now) - DAY; stats['zy:ㄆ'].due = startOfDay(now); stats['zy:ㄇ'] = { ...stats['zy:ㄇ'], box: 0, due: startOfDay(now) };
const p2 = await buildDailyPath({ gameMode: 'zhuyin', label: '注音', pool: ZHUYIN_VOCABULARY, stats, points: 50, now });
check('known child: stations', JSON.stringify(p2.stations.map(s => s.kind)) === '["warmup","learn","practice","challenge","summary"]', p2.stations.map(s => s.kind));
check('warmup starts with the mistake', p2.stations[0].words[0] === 'ㄇ' && p2.stations[0].focus.length === 4, p2.stations[0].focus);
check('new items are the next unseen ones', p2.newItems.every(s => !stats[`zy:${s}`]), p2.newItems);
check('challenge offers a sound game', [5, 6].includes(p2.stations[3].options[1]), p2.stations[3].options);

// Adaptive round size
p2.current = 2;
p2.stations[0].result = { onOwn: 1, total: 4 };
check('struggling -> smaller rounds', roundSizeFor(p2, 1) === 3 && roundSizeFor(p2, 3) === 2);
p2.stations[0].result = { onOwn: 4, total: 4 };
check('doing well -> 4 items', roundSizeFor(p2, 1) === 4 && roundSizeFor(p2, 3) === 3);
check('totals skip learn', JSON.stringify(pathTotals(p2)) === '{"onOwn":4,"total":4}');

// Word mode, lesson 1
const lesson = INITIAL_LESSONS[0];
const p3 = await buildDailyPath({ gameMode: 'word', label: lesson.title, pool: lesson.vocabulary, stats: {}, points: 0, now });
check('lesson: first two words are new', JSON.stringify(p3.newItems) === JSON.stringify(lesson.vocabulary.slice(0, 2)), p3.newItems);
check('lesson: writing offered (single characters exist)', p3.stations.find(s => s.kind === 'challenge')!.options[0] === 3);

// Many due -> only one new item
let many: any = {};
lesson.vocabulary.slice(0, 9).forEach(w => { many = { ...many, [`w:${w}`]: { wrong: 1, box: 0, due: startOfDay(now) } }; });
const p4 = await buildDailyPath({ gameMode: 'word', label: lesson.title, pool: lesson.vocabulary, stats: many, points: 0, now });
check('many due -> one new item', p4.newItems.length === 1, p4.newItems);

// Fading thresholds
let s2: any = {};
check('beginner spells short syllables, tone support on', maxSymbolsFor(s2) === 2 && toneSupportNeeded(s2));
for (let i = 0; i < 8; i++) { s2 = recordSkill(s2, `w:x${i}`, 'tone'); s2 = recordSkill(s2, `w:x${i}`, 'spell'); }
check('experienced: all syllables, tone support off', maxSymbolsFor(s2) === undefined && !toneSupportNeeded(s2));

// Shape check: a horizontal stroke
const median = samplePolyline([{ x: 200, y: 500 }, { x: 800, y: 500 }], 25);
const goodInk = samplePolyline([{ x: 210, y: 520 }, { x: 790, y: 480 }], 12);
const halfInk = samplePolyline([{ x: 210, y: 500 }, { x: 480, y: 500 }], 12);
const scribble = Array.from({ length: 200 }, (_, i) => ({ x: 100 + (i * 37) % 800, y: 100 + (i * 53) % 800 }));
check('shape: good stroke passes', evaluateShape([median], goodInk, 600, { coverRadius: 95, trackRadius: 135 }).pass);
check('shape: half stroke fails', !evaluateShape([median], halfInk, 280, { coverRadius: 95, trackRadius: 135 }).pass);
check('shape: scribble fails', !evaluateShape([median], scribble, 20000, { coverRadius: 95, trackRadius: 135 }).pass);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;

})();
