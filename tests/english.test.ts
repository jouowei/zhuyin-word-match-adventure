import { buildEnglishDailyPath, buildEnglishLearnCards, pathUnit, englishSentenceWords, ALL_ENGLISH_WORDS } from '../services/englishPath.ts';
import { buildRhymeRound, hasRhymeFamilies, RHYME_FAMILIES } from '../english/families.ts';
import { ENGLISH_UNITS, buildEnglishRound, getLevels, unitStars } from '../english/curriculum.ts';
import { recordSuccess, recordMistake, startOfDay } from '../services/learningStats.ts';
import { tipForConfusion } from '../services/parentTips.ts';
import { logAnswer, logMistake, summarizeWeek } from '../services/activityLog.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const now = new Date(2026, 8, 17, 10).getTime();
const DAY = 86400000;

// New child: first unit is letters A–E
const p1 = buildEnglishDailyPath({ stats: {}, points: 0, now });
check('new child: letters unit', p1.unitId === 'abc-1' && p1.language === 'en', p1.unitId);
check('new child stations', JSON.stringify(p1.stations.map(s => s.kind)) === '["learn","practice","challenge","summary"]', p1.stations.map(s => s.kind));
check('new letters a, b', JSON.stringify(p1.newItems) === '["a","b"]');
check('letters challenge is tracing or speaking', JSON.stringify(p1.stations[2].options) === '[3,4]');
const unit1 = ENGLISH_UNITS[0];
const round = buildEnglishRound(pathUnit(p1.stations[1], unit1, unit1.id), 2, undefined, 4)!;
check('planned round keeps the new letters', round.length === 4 && ['a', 'b'].every(l => round.some(i => i.text === l)), round.map(i => i.text));

// Child who knows all letters, with c and k due: warm-up avoids same-sound letters
let stats: any = {};
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(l => { stats = recordSuccess(stats, `el:${l}`, true, now - 5 * DAY).stats; });
stats['el:c'] = { ...stats['el:c'], box: 0, due: startOfDay(now) };
stats['el:k'] = { ...stats['el:k'], box: 0, due: startOfDay(now) };
const p2 = buildEnglishDailyPath({ stats, points: 0, now });
check('letters known: moves to short a words', p2.unitId === 'cvc-a', p2.unitId);
const warm = p2.stations.find(s => s.kind === 'warmup')!;
check('warm-up is letters without both c and k', warm.englishKind === 'letters' && !(warm.words.includes('c') && warm.words.includes('k')), warm.words);
check('word unit has story and find stations', p2.stations[0].kind === 'story' && p2.stations.some(s => s.kind === 'find'), p2.stations.map(s => s.kind));
check('story marks new words that are in sentences', p2.stations[0].words.every(w => englishSentenceWords(ENGLISH_UNITS.find(u => u.id === 'cvc-a')!, [w]).length === 1), p2.stations[0].words);
check('challenge includes rhyme families', p2.stations.find(s => s.kind === 'challenge')!.options.includes(5));
const find = p2.stations.find(s => s.kind === 'find')!;
check('find words appear in the sentences', find.words.length > 0 && englishSentenceWords(ENGLISH_UNITS.find(u => u.id === 'cvc-a')!, find.words).length === find.words.length, find.words);

// Learn cards: partners are easy to tell apart
const letterCards = buildEnglishLearnCards({ kind: 'letters', newItems: ['b', 'c'], candidates: ['d', 'p', 'q', 'k', 'm', 'a', 'e'] });
check('letter partners not look-alike or same sound', letterCards.length === 2 && !['d', 'p', 'q'].includes(letterCards[0].partner.text) && letterCards[1].partner.text !== 'k', letterCards.map(c => c.item.text + '/' + c.partner.text));
const wordCards = buildEnglishLearnCards({ kind: 'words', newItems: ['cat', 'hat'], candidates: ['bat', 'cap', 'map', 'bed', 'pig'] });
check('word partners differ in first letter and ending', wordCards.every(c => c.partner.text[0] !== c.item.text[0] && c.partner.text.slice(-2) !== c.item.text.slice(-2)), wordCards.map(c => c.item.text + '/' + c.partner.text));

// Rhyme rounds
const cvcA = ENGLISH_UNITS.find(u => u.id === 'cvc-a')!;
check('short a unit has rhyme level', hasRhymeFamilies(cvcA) && getLevels(cvcA).some(l => l.level === 5));
check('colors unit has no rhyme level', !getLevels(ENGLISH_UNITS.find(u => u.id === 'colors')!).some(l => l.level === 5));
let problems: string[] = [];
for (let r = 0; r < 60; r++) {
  const unit = ENGLISH_UNITS.filter(u => u.kind === 'words')[r % 13];
  const qs = buildRhymeRound(unit, 3)!;
  for (const q of qs) {
    if (q.cards.length !== 4) problems.push(`${q.item.text}: ${q.cards.length} cards`);
    if (q.cards.some(c => c.word === q.item.text)) problems.push(`${q.item.text}: head among cards`);
    if (q.cards.some(c => c.member !== c.word.endsWith(q.rime))) problems.push(`${q.item.text}: member flag`);
    if (new Set([q.item.emoji, ...q.cards.map(c => c.emoji)]).size !== 5) problems.push(`${q.item.text}: duplicate picture`);
    if (!q.cards.some(c => c.member)) problems.push(`${q.item.text}: no rhyme`);
  }
}
check('rhyme rounds valid (60 rounds)', problems.length === 0, problems.slice(0, 5));
check('families: members end with rime', RHYME_FAMILIES.every(f => f.words.length >= 2 && f.words.every(([w]) => w.endsWith(f.rime))));

// Unit stars ignore level 5
check('unit stars count 1-4 only', unitStars([1, 2, 3, 5]) === 3 && unitStars([1, 2, 3, 4, 5]) === 4);

// Tips and English activity
check('b/d tip', tipForConfusion('letter:b|d')!.title.includes('長得很像'));
check('c/k tip', tipForConfusion('letter:c|k')!.title.includes('聲音很像'));
check('hat/hot vowel tip', tipForConfusion('enword:hat|hot')!.title.includes('短母音'), tipForConfusion('enword:hat|hot'));
check('other word tip', tipForConfusion('enword:cat|dog')!.title.includes('圖卡'));
let a: any = logAnswer(undefined, now, { independent: true, review: false, mastered: false, english: true });
a = logAnswer(a, now + 1000, { independent: false, review: false, mastered: false });
a = logMistake(a, now + 2000, { review: false, english: true, confusion: { kind: 'letter', expected: 'b', chosen: 'd' } });
const week = summarizeWeek(a, now);
check('english part of the week', week.english.onOwn === 1 && week.english.helped === 0 && week.onOwn === 1 && week.helped === 1 && week.english.onOwnRate === 1, week.english);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');

if (fails) process.exitCode = 1;
