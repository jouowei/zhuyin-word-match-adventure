// The game rules App.tsx used to hold, now in services/: answers, 今日冒險 steps, word sources, rewards.
import { addToTally, applyAnswer, applyIntroduced, applyMistake, chineseLevelRules, englishLevelRules, tallyOf } from '../services/answers.ts';
import { buyCard, claimMilestoneCard, milestonesAvailable } from '../services/rewards.ts';
import { lessonAssets, lessonFindWords, pathSource, progressKeyFor, roundSource, withDefaultLessons } from '../services/wordSources.ts';
import { chooseLevel, completeStation, DailyPath, unfinishedToday } from '../services/dailyPath.ts';
import { englishLevelInfo, englishStationLearnCards } from '../services/englishPath.ts';
import { startOfDay, todayKey } from '../services/learningStats.ts';
import { MASTERY_BONUS, POINTS_ON_OWN, POINTS_WITH_HELP } from '../services/scaffolding.ts';
import { ENGLISH_UNITS } from '../english/curriculum.ts';
import { INITIAL_LESSONS, REWARD_CARDS, ZHUYIN_VOCABULARY } from '../constants.ts';
import { Lesson, UserProfile } from '../types.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };
const now = new Date(2026, 8, 18, 10).getTime();
const DAY = 86400000;
const player = (changes: Partial<UserProfile> = {}): UserProfile =>
  ({ id: 'p1', name: '小安', avatar: '🦖', points: 0, ownedCardIds: [], createdAt: 0, ...changes });
const today = todayKey(now);

// --- Answers ---
const first = applyAnswer(player(), { key: 'w:快樂', helpLevel: 0, tracksMemory: true, skill: 'write', now });
check('on own: points', first.user.points === POINTS_ON_OWN);
check('on own: into review box 1', first.user.wordStats?.['w:快樂']?.box === 1, first.user.wordStats);
check('on own: skill counted', first.user.wordStats?.['w:快樂']?.skills?.write === 1);
check('on own: in the report', first.user.activity?.[today]?.onOwn === 1);

const helped = applyAnswer(player(), { key: 'w:快樂', helpLevel: 2, tracksMemory: true, skill: 'write', now });
check('with help: fewer points', helped.user.points === POINTS_WITH_HELP);
check('with help: no review step, no skill', !helped.user.wordStats?.['w:快樂']?.box && !helped.user.wordStats?.['w:快樂']?.skills);
check('with help: in the report', helped.user.activity?.[today]?.helped === 1);

const almost = player({ points: 5, wordStats: { 'zy:ㄇ': { wrong: 0, box: 2, due: startOfDay(now) } } });
const learned = applyAnswer(almost, { key: 'zy:ㄇ', helpLevel: 0, tracksMemory: true, now });
check('learned: bonus once', learned.mastered && learned.user.points === 5 + POINTS_ON_OWN + MASTERY_BONUS, learned.user.points);
check('learned: counted as review remembered', learned.user.activity?.[today]?.reviewRemembered === 1 && learned.user.activity?.[today]?.mastered === 1);

const spoken = applyAnswer(almost, { key: 'zy:ㄇ', helpLevel: 0, tracksMemory: false, now });
check('not tracking memory: points but no review step', !spoken.mastered && spoken.user.points === 5 + POINTS_ON_OWN && spoken.user.wordStats?.['zy:ㄇ']?.box === 2);

const english = applyAnswer(player(), { key: 'ew:cat', helpLevel: 0, tracksMemory: true, now });
check('English answers counted apart in the report', english.user.activity?.[today]?.english?.onOwn === 1);

const known = player({ wordStats: { 'w:大': { wrong: 0, box: 3, due: startOfDay(now) } } });
const wrong = applyMistake(known, { key: 'w:大', confusion: { kind: 'word', expected: '大', chosen: '太' }, tracksMemory: true, now });
check('mistake: back to box 0', wrong.wordStats?.['w:大']?.box === 0, wrong.wordStats);
check('mistake: in the report with the confusion', wrong.activity?.[today]?.mistakes === 1 && wrong.activity?.[today]?.confusions?.['word:大|太'] === 1, wrong.activity);
const buildingWrong = applyMistake(known, { key: 'w:大', tracksMemory: false, now });
check('mistake not tracking memory: box kept, still reported', buildingWrong.wordStats?.['w:大']?.box === 3 && buildingWrong.activity?.[today]?.mistakes === 1);

const met = applyIntroduced(player(), ['zy:ㄅ', 'zy:ㄆ'], now);
check('introduced: both come back today', Object.keys(met.wordStats || {}).join() === 'zy:ㄅ,zy:ㄆ' && met.activity?.[today]?.newItems === 2, met.wordStats);

// --- Level rules ---
check('Chinese: speaking (4) counts points only', !chineseLevelRules(4).tracksMemory && chineseLevelRules(4).mistakesTrackMemory);
check('Chinese: 字的家族 and 部件偵探 track nothing', [7, 8].every(l => !chineseLevelRules(l).tracksMemory && !chineseLevelRules(l).mistakesTrackMemory));
check('Chinese: skills', chineseLevelRules(3).skill === 'write' && chineseLevelRules(5).skill === 'spell' && chineseLevelRules(6).skill === 'tone' && !chineseLevelRules(1).skill);
check('English: letter tracing does not track memory', !englishLevelRules(3, 'letters').tracksMemory && englishLevelRules(3, 'words').tracksMemory);
check('English: skills', englishLevelRules(3, 'words').skill === 'spell' && englishLevelRules(3, 'letters', 'upper').skill === 'writeUpper'
  && englishLevelRules(3, 'letters', 'lower').skill === 'write' && !englishLevelRules(1, 'words').skill);
check('English: rhymes (5) and speaking (4)', !englishLevelRules(5, 'words').tracksMemory && !englishLevelRules(5, 'words').mistakesTrackMemory
  && !englishLevelRules(4, 'words').tracksMemory && englishLevelRules(4, 'words').mistakesTrackMemory);
check('tally', JSON.stringify(addToTally(addToTally({ onOwn: 0, total: 0 }, 0), 2)) === '{"onOwn":1,"total":2}'
  && JSON.stringify(tallyOf([0, 0, 3])) === '{"onOwn":2,"total":3}');

// --- Rewards ---
const card = REWARD_CARDS[0];
check('buy: enough points', JSON.stringify(buyCard(player({ points: card.cost + 5 }), card)) === JSON.stringify({ points: 5, ownedCardIds: [card.id] }));
check('buy: not enough points', buyCard(player({ points: card.cost - 1 }), card) === null);
const tenLearned = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`w:字${i}`, { wrong: 0, box: 3, mastered: now }]));
check('milestone after 10 learned', milestonesAvailable(player({ wordStats: tenLearned })) === 1 && milestonesAvailable(player()) === 0);
check('milestone claimed once', JSON.stringify(claimMilestoneCard(player({ wordStats: tenLearned }), card)) === JSON.stringify({ ownedCardIds: [card.id], milestoneClaims: 1 })
  && claimMilestoneCard(player({ wordStats: tenLearned, milestoneClaims: 1 }), card) === null);

// --- Word sources ---
const custom: Lesson = { id: 'mine', title: '我的課文', content: '小狗在草地上跑跑跳跳。', vocabulary: ['小狗', '草地', '跑跳', '上面'], customImages: { 小狗: 'dog.png' }, zhuyinOverrides: { 跑: 'ㄆㄠˇ' } };
check('built-in lessons added to saved ones', withDefaultLessons([custom]).length === INITIAL_LESSONS.length + 1 && withDefaultLessons(null) === INITIAL_LESSONS);
check('a built-in lesson a parent changed stays theirs', withDefaultLessons([{ ...INITIAL_LESSONS[0], title: '改過', edited: true }]).filter(l => l.id === INITIAL_LESSONS[0].id).map(l => l.title).join() === '改過');
check('an old saved copy of a built-in lesson follows the app\'s update', withDefaultLessons([{ ...INITIAL_LESSONS[0], title: '舊版' }]).filter(l => l.id === INITIAL_LESSONS[0].id).map(l => l.title).join() === INITIAL_LESSONS[0].title);
const lessons = [custom, ...INITIAL_LESSONS];
const lessonRound = roundSource({ gameMode: 'word', activeLesson: custom, lessons, reviewMode: false, stats: {} });
check('lesson round: its words and pictures', lessonRound.words === custom.vocabulary && lessonRound.customImages.小狗 === 'dog.png');
const zhuyinRound = roundSource({ gameMode: 'zhuyin', activeLesson: null, lessons, reviewMode: false, stats: {} });
check('zhuyin round: the symbols, every lesson\'s zhuyin fixes', zhuyinRound.words === ZHUYIN_VOCABULARY && zhuyinRound.zhuyinOverrides.跑 === 'ㄆㄠˇ');
const free = roundSource({ gameMode: 'word', activeLesson: null, lessons, reviewMode: false, stats: {} });
check('free practice: every lesson\'s words once', free.words.length === new Set(lessons.flatMap(l => l.vocabulary)).size && free.customImages.小狗 === 'dog.png');
const dueStats = { 'w:小狗': { wrong: 1, box: 0, due: startOfDay(now) - DAY } };
const review = roundSource({ gameMode: 'word', activeLesson: custom, lessons, reviewMode: true, stats: dueStats }, () => 0.9);
check('review: due words topped up to four', review.words.length === 4 && review.words[0] === '小狗', review.words);
check('path source: zhuyin', pathSource({ gameMode: 'zhuyin', activeLesson: custom, lessons }).label === '注音符號');
check('path source: lesson', pathSource({ gameMode: 'word', activeLesson: custom, lessons }).pool.join() === custom.vocabulary.join());
check('path source: free practice', pathSource({ gameMode: 'word', activeLesson: null, lessons }).label.startsWith('自由練習'));
check('lesson assets: only the active lesson', lessonAssets({ activeLesson: INITIAL_LESSONS[0], lessons }).customImages.小狗 === undefined
  && lessonAssets({ activeLesson: null, lessons }).customImages.小狗 === 'dog.png');
check('stars: per lesson, zhuyin, free, none in review', progressKeyFor({ gameMode: 'word', activeLesson: custom }, false) === 'mine'
  && progressKeyFor({ gameMode: 'zhuyin', activeLesson: null }, true) === 'zhuyin'
  && progressKeyFor({ gameMode: 'word', activeLesson: null }, false) === 'free'
  && progressKeyFor({ gameMode: 'word', activeLesson: custom }, true) === null);
const found = lessonFindWords(custom);
check('課文尋寶: up to three words from the text', found.length === 3 && found.every(w => custom.content.includes(w)), found);

// --- 今日冒險 steps ---
const path: DailyPath = {
  date: today, gameMode: 'word', label: custom.title, current: 0, newItems: [], masteredToday: [], startPoints: 0,
  stations: [
    { kind: 'practice', emoji: '', title: '', words: [], focus: [], options: [1, 2] },
    { kind: 'summary', emoji: '', title: '', words: [], focus: [], options: [] },
  ],
};
check('choose level', chooseLevel(path, 2).stations[0].chosen === 2 && path.stations[0].chosen === undefined);
check('unfinished today', unfinishedToday(path, now) && !unfinishedToday(path, now + DAY) && !unfinishedToday(null, now));
const done = completeStation(path, { onOwn: 3, total: 4 }, player());
check('last station: summary, result kept', done.path.current === 1 && done.path.stations[0].result?.onOwn === 3 && !unfinishedToday(done.path, now));
check('first adventure today: free spin', !!done.path.gift && done.userChanges?.freeSpins === 1 && done.userChanges?.lastFreeSpinDate === today && done.userChanges?.lastDailyPath === today, done.userChanges);
const again = completeStation(path, { onOwn: 3, total: 4 }, player({ freeSpins: 1, lastFreeSpinDate: today }));
check('second adventure today: no second spin', !again.path.gift && again.userChanges?.freeSpins === undefined && again.userChanges?.lastDailyPath === today, again.userChanges);
const englishDone = completeStation({ ...path, language: 'en' }, { onOwn: 1, total: 1 }, player());
check('English adventure marks the English day', englishDone.userChanges?.lastEnglishPath === today && englishDone.userChanges?.lastDailyPath === undefined);
const midway = completeStation({ ...path, stations: [path.stations[0], path.stations[0], path.stations[1]] }, { onOwn: 1, total: 1 }, player());
check('not the last station: no changes to the player', midway.path.current === 1 && !midway.userChanges);

// --- English path helpers ---
const letters = ENGLISH_UNITS.find(u => u.kind === 'letters')!;
const station = { kind: 'learn' as const, emoji: '', title: '', words: letters.letters!.slice(0, 2), focus: [], options: [] };
const cards = englishStationLearnCards(station, letters, {});
check('English learn cards: one per new letter with a partner', cards.length === 2 && cards.every(c => c.partner.text !== c.item.text), cards.map(c => `${c.item.text}/${c.partner.text}`));
check('English level info', englishLevelInfo('letters', 3).title === '字母描寫' && englishLevelInfo('words', 5).title === '押韻家族' && englishLevelInfo('words', 9).title === '看圖找單字');

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
