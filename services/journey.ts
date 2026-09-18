import { UserProfile } from '../types';

/**
 * 環島冒險: the story around the learning. The companion travels around Taiwan; each day's first finished adventure
 * (Chinese, and English) moves it along, and every two legs it reaches the next place, meets a friend there and,
 * when leaving, takes a souvenir that stays on the map. What is practised is still what the parent chose.
 */

export interface Place {
  id: string;
  name: string;
  emoji: string;
  lon: number;
  lat: number;
  friend: { emoji: string; name: string };
  story: string;                            // Said on arrival: something true a child can picture
  souvenir: { emoji: string; name: string }; // Taken when moving on
  label?: 'left' | 'right' | 'top' | 'bottom'; // Where the name goes on the map, where places are close together
}

export const PLACES: Place[] = [
  { id: 'keelung', name: '基隆港', emoji: '🚢', lon: 121.74, lat: 25.13, label: 'bottom', friend: { emoji: '🐦', name: '小海鳥' },
    story: '基隆港有好多大船，汽笛嘟嘟響，我們從這裡出發！', souvenir: { emoji: '🎫', name: '船票' } },
  { id: 'taipei', name: '台北', emoji: '🏙️', lon: 121.56, lat: 25.03, label: 'left', friend: { emoji: '🐿️', name: '小松鼠' },
    story: '台北一〇一好高好高，看起來像一節一節的竹子。', souvenir: { emoji: '🎋', name: '竹子書籤' } },
  { id: 'hsinchu', name: '新竹', emoji: '🌬️', lon: 120.97, lat: 24.80, friend: { emoji: '🐔', name: '小雞' },
    story: '新竹的風好大，大家都叫它風城，最適合放風箏了。', souvenir: { emoji: '🪁', name: '風箏' } },
  { id: 'miaoli', name: '苗栗', emoji: '🌼', lon: 120.82, lat: 24.56, friend: { emoji: '🐝', name: '小蜜蜂' },
    story: '春天的苗栗山上開滿白色的油桐花，風一吹，像下雪一樣。', souvenir: { emoji: '🌼', name: '油桐花' } },
  { id: 'taichung', name: '台中', emoji: '🌈', lon: 120.68, lat: 24.14, friend: { emoji: '🐶', name: '小狗' },
    story: '台中有一個彩虹村，牆上、地上都畫滿了彩色的圖。', souvenir: { emoji: '🥮', name: '太陽餅' } },
  { id: 'sunmoon', name: '日月潭', emoji: '🏞️', lon: 120.91, lat: 23.86, friend: { emoji: '🐟', name: '小魚' },
    story: '日月潭的湖水，一邊圓圓的像太陽，一邊彎彎的像月亮。', souvenir: { emoji: '🍵', name: '紅茶' } },
  { id: 'alishan', name: '阿里山', emoji: '🚂', lon: 120.80, lat: 23.51, friend: { emoji: '🐒', name: '小猴子' },
    story: '我們坐小火車上阿里山，早上看日出，還有白白的雲海。', souvenir: { emoji: '🎟️', name: '小火車票' } },
  { id: 'tainan', name: '台南', emoji: '🏯', lon: 120.20, lat: 22.99, friend: { emoji: '🐱', name: '小貓' },
    story: '台南有好老好老的城堡，還有好多好吃的小吃。', souvenir: { emoji: '🍜', name: '擔仔麵' } },
  { id: 'kaohsiung', name: '高雄', emoji: '⚓', lon: 120.30, lat: 22.63, friend: { emoji: '🐬', name: '小海豚' },
    story: '高雄港好大好大，還有一條彎彎的愛河。', souvenir: { emoji: '🎡', name: '摩天輪模型' } },
  { id: 'kenting', name: '墾丁', emoji: '🏖️', lon: 120.80, lat: 21.95, friend: { emoji: '🦀', name: '陸蟹' },
    story: '墾丁的海好藍，岸邊有一座白白的燈塔，陸蟹會走到海邊生寶寶。', souvenir: { emoji: '🐚', name: '貝殼' } },
  { id: 'taitung', name: '台東', emoji: '🎈', lon: 121.15, lat: 22.76, friend: { emoji: '🐃', name: '水牛' },
    story: '台東的天空飄著好多熱氣球，有的像動物，有的像房子。', souvenir: { emoji: '🎈', name: '熱氣球' } },
  { id: 'hualien', name: '花蓮', emoji: '⛰️', lon: 121.60, lat: 23.99, friend: { emoji: '🦅', name: '老鷹' },
    story: '花蓮的太魯閣有好高的山，河水是藍綠色的。', souvenir: { emoji: '🪨', name: '大理石' } },
  { id: 'yilan', name: '宜蘭', emoji: '♨️', lon: 121.75, lat: 24.75, label: 'right', friend: { emoji: '🐢', name: '小烏龜' },
    story: '宜蘭的海上有一座像烏龜的島，叫做龜山島，這裡還有溫泉。', souvenir: { emoji: '♨️', name: '溫泉蛋' } },
  { id: 'jiufen', name: '九份', emoji: '🏮', lon: 121.84, lat: 25.11, label: 'right', friend: { emoji: '🐈', name: '老街的貓' },
    story: '九份的老街在山上，掛滿紅燈籠，還有 QQ 的芋圓。', souvenir: { emoji: '🍡', name: '芋圓' } },
];

/** Adventures to finish before reaching the next place. */
export const LEGS_PER_PLACE = 2;

export interface JourneyPosition {
  step: number;       // Places reached so far, counting every lap (0: still at the start)
  lap: number;        // Full rounds of Taiwan finished
  place: Place;       // Where the companion is
  next: Place;        // Where it is going
  legs: number;       // Legs done towards the next place
  legsLeft: number;   // Legs still to go
  visited: number;    // How many places of this lap have been left (their souvenirs are taken)
}

export const journeyPosition = (journeyLegs = 0): JourneyPosition => {
  const step = Math.floor(journeyLegs / LEGS_PER_PLACE);
  const index = step % PLACES.length;
  const legs = journeyLegs % LEGS_PER_PLACE;
  return {
    step,
    lap: Math.floor(step / PLACES.length),
    place: PLACES[index],
    next: PLACES[(index + 1) % PLACES.length],
    legs,
    legsLeft: LEGS_PER_PLACE - legs,
    visited: index,
  };
};

/** One more leg when the day's first adventure in a language is finished (a second one the same day doesn't move on). */
export const journeyAfterAdventure = (
  user: Pick<UserProfile, 'journeyLegs' | 'lastDailyPath' | 'lastEnglishPath'>, language: 'en' | undefined, date: string,
): number => {
  const firstToday = language === 'en' ? user.lastEnglishPath !== date : user.lastDailyPath !== date;
  return (user.journeyLegs || 0) + (firstToday ? 1 : 0);
};

/** The story to show on the home map: the start, a new place, or nothing new. */
export type JourneyStory = { kind: 'start' } | { kind: 'arrive'; place: Place; left: Place; lapDone: boolean } | null;

export const storyToShow = (user: Pick<UserProfile, 'journeyLegs' | 'journeySeen'>): JourneyStory => {
  const { step, place } = journeyPosition(user.journeyLegs);
  if (user.journeySeen === undefined) return { kind: 'start' };
  if (user.journeySeen >= step) return null;
  const left = PLACES[(step - 1 + PLACES.length) % PLACES.length];
  return { kind: 'arrive', place, left, lapDone: step % PLACES.length === 0 };
};

export const storyText = (scene: NonNullable<JourneyStory>, name: string, companionName: string) => {
  if (scene.kind === 'start') {
    return `${name}，我是${companionName}。我們一起環島旅行吧！每完成一次冒險，就往前走一段，走兩段就到下一個地方，會認識新朋友、拿到紀念品。第一站：${PLACES[0].name}！`;
  }
  const { place, left, lapDone } = scene;
  const souvenir = `在${left.name}拿到了紀念品：${left.souvenir.name}！`;
  if (lapDone) return `${souvenir}我們回到${place.name}了，環島一圈完成了，好厲害！休息一下，再出發環島吧！`;
  return `${souvenir}${place.name}到了！${place.story}這裡的${place.friend.name}說：歡迎你們來！`;
};

/** Where the companion is and what's next, for the home map. */
export const journeyLine = (legsJourney: number | undefined) => {
  const { place, next, legsLeft } = journeyPosition(legsJourney);
  return `我們在${place.name}，再完成${legsLeft === 1 ? '一' : '兩'}次冒險，就到${next.name}！`;
};

// --- The map ---

/** Taiwan's coast, clockwise from 富貴角 (longitude, latitude): a drawing for children, not a survey. */
const COAST: [number, number][] = [
  [121.54, 25.30], [121.64, 25.23], [121.74, 25.15], [121.92, 25.13], [122.00, 25.01], [121.85, 24.87],
  [121.83, 24.75], [121.87, 24.59], [121.80, 24.45], [121.76, 24.30], [121.62, 23.98], [121.52, 23.55],
  [121.38, 23.10], [121.16, 22.75], [121.00, 22.60], [120.90, 22.33], [120.88, 22.18], [120.86, 21.90],
  [120.73, 21.93], [120.70, 22.07], [120.59, 22.37], [120.45, 22.46], [120.27, 22.62], [120.18, 22.90],
  [120.15, 23.00], [120.08, 23.15], [120.12, 23.27], [120.15, 23.45], [120.19, 23.78], [120.33, 23.97],
  [120.42, 24.07], [120.51, 24.27], [120.58, 24.37], [120.67, 24.49], [120.75, 24.62], [120.90, 24.83],
  [121.00, 24.93], [121.08, 25.05], [121.20, 25.10], [121.41, 25.18], [121.48, 25.26],
];

export const MAP_WIDTH = 215;
export const MAP_HEIGHT = 395;

/** Map position of a longitude and latitude (a degree of latitude is about 1.09 degrees of longitude here). */
export const project = (lon: number, lat: number) => ({ x: (lon - 119.95) * 100, y: (25.4 - lat) * 109 });

export const COAST_PATH = COAST.map(([lon, lat], i) => {
  const { x, y } = project(lon, lat);
  return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ') + ' Z';
