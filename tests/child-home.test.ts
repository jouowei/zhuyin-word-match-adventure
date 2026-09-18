// 2.1 child side: the companion's lines, the growing world, and the content a parent chooses.
import { chineseNumber, companionOf, companionTip, COMPANIONS, homeLine } from '../services/companions.ts';
import { hashKey, layoutWorld, stageOf, thingFor, worldCounts, worldThings } from '../services/world.ts';
import { focusName, studyFor } from '../services/wordSources.ts';
import { INITIAL_LESSONS } from '../constants.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

// --- Companion ---
check('four companions', COMPANIONS.length === 4 && new Set(COMPANIONS.map(c => c.emoji)).size === 4);
check('fox until one is chosen', companionOf({}).id === 'fox' && companionOf({ companion: 'dragon' }).name === '小龍');
check('numbers as children count', chineseNumber(2) === '兩' && chineseNumber(3) === '三' && chineseNumber(10) === '十' && chineseNumber(12) === '12');
const fox = COMPANIONS[0];
const base = { name: '小安', focus: '注音符號', chineseDone: false, englishDone: false, stationsLeft: 0, things: 0, greet: true };
const first = homeLine(fox, base);
check('first line: hello, who I am, what we practise', first.startsWith('嗨，小安！') && first.includes('我是小狐狸') && first.includes('練注音符號') && first.includes('出發'), first);
check('no hello the second time', !homeLine(fox, { ...base, greet: false }).includes('嗨'));
check('adventure under way', homeLine(fox, { ...base, greet: false, stationsLeft: 2 }).includes('還有兩站'));
check('Chinese done: playground open', homeLine(fox, { ...base, chineseDone: true }).includes('遊樂場開門'));
check('English done only: still go', homeLine(fox, { ...base, englishDone: true }).includes('按出發'));
check('both done: look at the world', homeLine(fox, { ...base, chineseDone: true, englishDone: true, things: 3 }).includes('點點看你種的花和樹'));
check('tip mentions the world only when it has things', companionTip('走吧。', 0) === '走吧。' && companionTip('走吧。', 2).includes('花和樹'));

// --- World ---
const now = Date.now();
const stats = {
  'zy:ㄅ': { wrong: 0, box: 0 },
  'zy:ㄆ': { wrong: 0, box: 1 },
  'zy:ㄇ': { wrong: 0, box: 2 },
  'zy:ㄈ': { wrong: 0, box: 3, mastered: now },
  'w:快樂': { wrong: 1, box: 0, mastered: now }, // Learned, then forgotten once: stays a tree
  'el:b': { wrong: 0, box: 1 },
  'ew:cat': { wrong: 0, box: 4, mastered: now },
  'other:x': { wrong: 0, box: 1 },
};
const things = worldThings(stats);
check('only practised items, not other keys', things.length === 7);
check('stages follow review', stageOf(stats['zy:ㄅ']) === 0 && stageOf(stats['zy:ㄆ']) === 1 && stageOf(stats['zy:ㄇ']) === 2 && stageOf(stats['zy:ㄈ']) === 3);
check('learned stays grown after a mistake', thingFor(stats, 'w:快樂')?.stage === 3 && ['🌳', '🌲', '🌴'].includes(thingFor(stats, 'w:快樂')!.emoji));
check('zhuyin grows into flowers', ['🌸', '🌼', '🌻', '🌷', '🌺'].includes(thingFor(stats, 'zy:ㄈ')!.emoji) && thingFor(stats, 'zy:ㄇ')!.emoji === '🌿');
check('English hatches: egg, then an animal', thingFor(stats, 'el:b')!.emoji === '🥚' && thingFor(stats, 'ew:cat')!.stage === 3 && thingFor(stats, 'ew:cat')!.label === 'cat');
check('labels without prefix', thingFor(stats, 'zy:ㄅ')!.label === 'ㄅ' && thingFor(stats, 'w:快樂')!.label === '快樂');
check('same look every time', hashKey('zy:ㄈ') === hashKey('zy:ㄈ') && worldThings(stats).map(t => t.emoji).join() === things.map(t => t.emoji).join());
check('counts', JSON.stringify(worldCounts(things)) === '{"flowers":1,"trees":1,"animals":1,"growing":4}', worldCounts(things));

const small = layoutWorld(things);
check('small world: 4 × 3 grid', small.cols === 4 && small.rows === 3 && small.placed.length === 7 && small.hidden === 0);
check('inside the ground', small.placed.every(p => p.x > 0 && p.x < 100 && p.y >= 0 && p.y < 100), small.placed.map(p => [Math.round(p.x), Math.round(p.y)]));
check('back rows first (drawn behind)', small.placed.every((p, i) => i === 0 || small.placed[i - 1].y >= p.y));
const cellOf = (p: { x: number; y: number }, cols: number, rows: number) => `${Math.floor(p.x / 100 * cols)}:${Math.floor((100 - p.y) / 100 * rows)}`;
check('one thing per cell', new Set(small.placed.map(p => cellOf(p, small.cols, small.rows))).size === small.placed.length);
check('grown things drawn bigger than sprouts', small.placed.find(p => p.key === 'zy:ㄈ')!.scale / small.placed.find(p => p.key === 'zy:ㄅ')!.scale > 1.5);

const many = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`w:字${i}`, { wrong: 0, box: i < 20 ? 3 : 1, mastered: i < 20 ? now : undefined }]));
const big = layoutWorld(worldThings(many));
check('big world: largest grid, the most grown shown', big.cols === 14 && big.placed.length === 112 && big.hidden === 38 && big.placed.filter(p => p.stage === 3).length === 20);
const grown = layoutWorld(worldThings({ ...stats, 'zy:ㄉ': { wrong: 0, box: 1 } }));
const moved = small.placed.filter(p => { const q = grown.placed.find(g => g.key === p.key)!; return q.x !== p.x || q.y !== p.y; });
check('adding one thing keeps the others in place (same grid)', moved.length <= 1, moved.map(m => m.key));

// --- What the parent chose ---
const lesson = INITIAL_LESSONS[0];
check('zhuyin until chosen', studyFor(undefined, INITIAL_LESSONS).gameMode === 'zhuyin' && focusName(studyFor(undefined, INITIAL_LESSONS)) === '注音符號');
const chosen = studyFor({ kind: 'lesson', lessonId: lesson.id }, INITIAL_LESSONS);
check('a lesson', chosen.gameMode === 'word' && chosen.activeLesson?.id === lesson.id && focusName(chosen) === lesson.title);
check('every lesson', studyFor({ kind: 'all' }, INITIAL_LESSONS).activeLesson === null && focusName(studyFor({ kind: 'all' }, INITIAL_LESSONS)) === '所有課文的字');
check('removed lesson: back to zhuyin', studyFor({ kind: 'lesson', lessonId: 'gone' }, INITIAL_LESSONS).gameMode === 'zhuyin');

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
