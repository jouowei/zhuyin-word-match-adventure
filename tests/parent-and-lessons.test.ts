import { logAnswer, logMistake, logNewItems, summarizeWeek, isReviewDue, confusionKey } from '../services/activityLog.ts';
import { tipForConfusion, readingPrompts, confusionLabel } from '../services/parentTips.ts';
import { occurrences, sentenceRange, splitLessonPages, wordsInText } from '../services/lessonText.ts';
import { buildDailyPath } from '../services/dailyPath.ts';
import { INITIAL_LESSONS } from '../constants.ts';
import { WORD_FAMILIES } from '../services/wordFamilies.ts';

(async () => {
let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const DAY = 86400000;
const t = new Date(2026, 8, 16, 18, 0).getTime();

// Activity log
let a: any = undefined;
a = logAnswer(a, t, { independent: true, review: true, mastered: false });
a = logAnswer(a, t + 30000, { independent: false, review: false, mastered: false });
a = logMistake(a, t + 60000, { review: true, confusion: { kind: 'symbol', expected: 'ㄥ', chosen: 'ㄣ' } });
a = logMistake(a, t + 400000, { review: false, confusion: { kind: 'symbol', expected: 'ㄣ', chosen: 'ㄥ' } });
a = logNewItems(a, t + 410000, 2);
const today = a['2026-09-16'];
check('counts', today.onOwn === 1 && today.helped === 1 && today.mistakes === 2 && today.newItems === 2, today);
check('active seconds skip the long break', today.seconds === 30 + 30 + 10, today.seconds);
check('confusions merge both directions', today.confusions['symbol:ㄣ|ㄥ'] === 2, today.confusions);
check('review counts', today.reviewTried === 2 && today.reviewRemembered === 1);
a = logAnswer(a, t - 8 * DAY, { independent: true, review: false, mastered: true });
a = logAnswer(a, t - 70 * DAY, { independent: true, review: false, mastered: false });
a = logAnswer(a, t, { independent: true, review: false, mastered: false }); check('old days trimmed', !Object.keys(a).some(d => d < '2026-07-18'), Object.keys(a));
const week = summarizeWeek(a, t);
check('week totals', week.onOwn === 2 && week.helped === 1 && week.daysPlayed === 1 && Math.abs(week.onOwnRate - 2/3) < 0.01 && week.reviewRate === 0.5, week);
check('week confusions', week.confusions[0].key === 'symbol:ㄣ|ㄥ' && week.confusions[0].count === 2);
const last = summarizeWeek(a, t, 7);
check('last week has the mastered day', last.mastered === 1 && last.days.length === 7, last.days.map(d => d.date));
check('review due', isReviewDue({ wrong: 0, box: 1, due: t - 1 }, t) && !isReviewDue({ wrong: 0, box: 0, due: t - 1 }, t));
check('confusion key sorted', confusionKey({ kind: 'tone', expected: '三聲', chosen: '二聲' }) === 'tone:三聲|二聲' || confusionKey({ kind: 'tone', expected: '三聲', chosen: '二聲' }) === 'tone:二聲|三聲');

// Tips
const tips = ['symbol:ㄣ|ㄥ', 'symbol:ㄅ|ㄆ', 'symbol:ㄓ|ㄗ', 'symbol:ㄋ|ㄌ', 'symbol:ㄧ|ㄩ', 'symbol:ㄛ|ㄜ', 'symbol:ㄈ|ㄏ', 'symbol:ㄒ|ㄕ', 'symbol:ㄞ|ㄟ', 'tone:三聲|二聲', 'tone:一聲|四聲', 'word:右|左'].map(k => [k, tipForConfusion(k)?.title]);
check('every confusion has a tip', tips.every(([, title]) => !!title), tips);
check('label', confusionLabel('word:右|左') === '右 ↔ 左');
const prompts = readingPrompts(INITIAL_LESSONS[0]);
check('reading prompts', prompts.length >= 4 && prompts[0].kind === '接下去', prompts);

// Lesson text
const lesson = INITIAL_LESSONS[0];
check('pages', splitLessonPages(lesson.content).length >= 2, splitLessonPages(lesson.content));
check('occurrences', JSON.stringify(occurrences('小船水上走，小船', '小船')) === '[0,6]');
check('sentence range', JSON.stringify(sentenceRange('一二。三四五。', 4)) === '[3,7]');
check('words in text', JSON.stringify(wordsInText(lesson.content, ['小船', '外星人', '魚'])) === '["小船","魚"]');

// Lesson path has story and find stations
const p = await buildDailyPath({ gameMode: 'word', label: lesson.title, pool: lesson.vocabulary, stats: {}, points: 0, lessonContent: lesson.content, now: t });
check('lesson path stations', JSON.stringify(p.stations.map(s => s.kind)) === '["story","learn","practice","challenge","find","summary"]', p.stations.map(s => s.kind));
check('story marks new words', JSON.stringify(p.stations[0].words) === JSON.stringify(p.newItems.filter(w => lesson.content.includes(w))), p.stations[0].words);
check('find words: three, in the text, new first', p.stations[4].words.length === 3 && p.stations[4].words.every(w => lesson.content.includes(w)) && p.stations[4].words[0] === '小船', p.stations[4].words);
const free = await buildDailyPath({ gameMode: 'word', label: 'free', pool: lesson.vocabulary, stats: {}, points: 0, now: t });
check('free path has no lesson stations', !free.stations.some(s => s.kind === 'story' || s.kind === 'find'));

// Word families data
const heads = WORD_FAMILIES.map(f => f.head);
check('families unique heads', new Set(heads).size === heads.length);
check('every member contains its head and has 2+ words', WORD_FAMILIES.every(f => f.words.length >= 2 && f.words.every(([w]) => w.includes(f.head))));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
})();
