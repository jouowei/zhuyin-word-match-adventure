// 環島冒險: where the companion is, when it moves on, and which story to show.
import {
  COAST_PATH, journeyAfterAdventure, journeyLine, journeyPosition, LEGS_PER_PLACE, MAP_HEIGHT, MAP_WIDTH, PLACES, project,
  storyText, storyToShow,
} from '../services/journey.ts';
import { completeStation, DailyPath } from '../services/dailyPath.ts';
import { homeLine, COMPANIONS } from '../services/companions.ts';
import { todayKey } from '../services/learningStats.ts';

let fails = 0;
const check = (name: string, ok: boolean, extra?: unknown) => { console.log(ok ? 'PASS' : 'FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); if (!ok) fails++; };

// --- Places ---
check('starts and ends at 基隆港', PLACES[0].name === '基隆港' && PLACES.length === 14);
check('every place has its own souvenir and friend', new Set(PLACES.map(p => p.souvenir.emoji)).size === PLACES.length && new Set(PLACES.map(p => p.friend.emoji)).size === PLACES.length);
check('places are on the map', PLACES.every(p => { const { x, y } = project(p.lon, p.lat); return x > 0 && x < MAP_WIDTH && y > 0 && y < MAP_HEIGHT; }));
const coast = COAST_PATH.match(/-?[\d.]+/g)!.map(Number);
check('coast inside the map', coast.every((v, i) => v >= 0 && v <= (i % 2 ? MAP_HEIGHT : MAP_WIDTH)) && COAST_PATH.endsWith('Z'));

// --- Position ---
const start = journeyPosition(undefined);
check('start: at 基隆港, two legs to 台北', start.place.id === 'keelung' && start.next.id === 'taipei' && start.legsLeft === LEGS_PER_PLACE && start.visited === 0);
const one = journeyPosition(1);
check('one leg: still at 基隆港, one to go', one.place.id === 'keelung' && one.legs === 1 && one.legsLeft === 1);
const two = journeyPosition(2);
check('two legs: at 台北, 基隆港 visited', two.place.id === 'taipei' && two.step === 1 && two.visited === 1);
const lap = journeyPosition(PLACES.length * LEGS_PER_PLACE);
check('a full lap: back at 基隆港, lap 1', lap.place.id === 'keelung' && lap.lap === 1 && lap.visited === 0);
const last = journeyPosition(PLACES.length * LEGS_PER_PLACE - 1);
check('last leg of a lap: at 九份, going to 基隆港', last.place.id === 'jiufen' && last.next.id === 'keelung');

// --- Moving on ---
const today = '2026-09-18';
check('first Chinese adventure today moves on', journeyAfterAdventure({ journeyLegs: 3, lastDailyPath: '2026-09-17' }, undefined, today) === 4);
check('second Chinese adventure the same day does not', journeyAfterAdventure({ journeyLegs: 3, lastDailyPath: today }, undefined, today) === 3);
check('the first English one moves on too', journeyAfterAdventure({ journeyLegs: 3, lastDailyPath: today, lastEnglishPath: '2026-09-17' }, 'en', today) === 4);

const path = (language?: 'en'): DailyPath => ({
  date: todayKey(), language, gameMode: 'word', label: 'x', current: 0, newItems: [], masteredToday: [], startPoints: 0,
  stations: [{ kind: 'practice', emoji: '', title: '', words: [], focus: [], options: [1] }, { kind: 'summary', emoji: '', title: '', words: [], focus: [], options: [] }],
});
const done = completeStation(path(), { onOwn: 1, total: 1 }, { journeyLegs: 1 });
check('finishing an adventure: a leg, and the path says so', done.userChanges?.journeyLegs === 2 && !!done.path.journeyMoved);
const again = completeStation(path(), { onOwn: 1, total: 1 }, { journeyLegs: 2, lastDailyPath: todayKey() });
check('again the same day: no leg', again.userChanges?.journeyLegs === 2 && !again.path.journeyMoved);

// --- Stories ---
check('not started: the start story', storyToShow({})?.kind === 'start');
check('seen where we are: nothing new', storyToShow({ journeyLegs: 3, journeySeen: 1 }) === null);
const arrive = storyToShow({ journeyLegs: 4, journeySeen: 1 });
check('reached a new place: its story', arrive?.kind === 'arrive' && arrive.place.id === 'hsinchu' && arrive.left.id === 'taipei', arrive);
const text = storyText(arrive!, '小安', '小狐狸');
check('the story: souvenir from the last place, the new place and its friend', text.includes('竹子書籤') && text.includes('新竹到了') && text.includes('小雞'), text);
const lapScene = storyToShow({ journeyLegs: PLACES.length * LEGS_PER_PLACE, journeySeen: PLACES.length - 1 });
check('back at the start: a lap done', lapScene?.kind === 'arrive' && lapScene.lapDone && storyText(lapScene, '小安', '小狐狸').includes('環島一圈完成了'));
check('start story names the first place', storyText({ kind: 'start' }, '小安', '小狐狸').includes('基隆港'));
check('where we are', journeyLine(1) === '我們在基隆港，再完成一次冒險，就到台北！', journeyLine(1));

// --- The companion says where it is ---
const line = homeLine(COMPANIONS[0], { name: '小安', focus: '注音符號', chineseDone: false, englishDone: false, stationsLeft: 0, things: 0, greet: false, where: { place: '日月潭', next: '阿里山' } });
check('home line: where we are', line.includes('我們在日月潭') && line.includes('練注音符號'), line);
const doneLine = homeLine(COMPANIONS[0], { name: '小安', focus: '注音符號', chineseDone: true, englishDone: false, stationsLeft: 0, things: 0, greet: false, where: { place: '日月潭', next: '阿里山' } });
check('home line after the adventure: moving on', doneLine.includes('往阿里山前進了一段'), doneLine);
const arrivedLine = homeLine(COMPANIONS[0], { name: '小安', focus: '注音符號', chineseDone: true, englishDone: true, stationsLeft: 0, things: 0, greet: false, where: { place: '日月潭', next: '阿里山', arrived: true } });
check('home line on arriving: we are here', arrivedLine.includes('我們到了日月潭') && !arrivedLine.includes('前進'), arrivedLine);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exitCode = 1;
