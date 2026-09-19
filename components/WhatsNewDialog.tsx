import React from 'react';
import { X } from 'lucide-react';

/** Change it (and the items) with the next version's notes, and every device shows them once more. */
export const WHATS_NEW_VERSION = '2.1';
const SEEN_KEY = 'whats_new_seen';
// Without storage (private browsing) the notes are shown once per visit
let seenThisVisit = false;

export const whatsNewSeen = () => {
  if (seenThisVisit) return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === WHATS_NEW_VERSION;
  } catch {
    return false;
  }
};

const markSeen = () => {
  seenThisVisit = true;
  try {
    window.localStorage.setItem(SEEN_KEY, WHATS_NEW_VERSION);
  } catch {
    // Shown again next visit
  }
};

const ITEMS: { emoji: string; title: string; text: string }[] = [
  { emoji: '🗺️', title: '環島冒險', text: '選好角色後，孩子挑一隻冒險夥伴。每天完成冒險，就在臺灣地圖上往前走，每一站有小故事和紀念品。' },
  { emoji: '📖', title: '練習課文', text: '一年級上學期到六年級下學期，共 72 篇原創短文，每篇有一張水彩插圖。也可以輸入孩子課本的課文。' },
  { emoji: '🌱', title: '花園和遊樂場', text: '學過的字會在花園裡長大。完成今天的冒險，遊樂場才會開門。' },
  { emoji: '🎤', title: '唸注音：錄音比一比', text: '先聽標準發音，再聽自己的聲音，一樣就過關。爸媽在旁邊一起聽最好。' },
  { emoji: '🔒', title: '家長專區', text: '選好角色後，按右上角的鎖頭。設定每個孩子練什麼、看學習週報、開離線模式；刪除角色也在這裡。' },
  { emoji: '📱', title: '加到主畫面', text: '在瀏覽器選「加到主畫面」，之後就像 App 一樣打開。' },
];

/**
 * What is new in this version, for the grown-up: shown on the start screen the first time a device opens it,
 * and again from the link at the bottom of that screen.
 */
export const WhatsNewDialog: React.FC<{ returning: boolean; onClose: () => void }> = ({ returning, onClose }) => {
  const close = () => {
    markSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop">
        <button onClick={close} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600" aria-label="關閉">
          <X size={22} />
        </button>

        <div className="shrink-0 bg-gradient-to-b from-amber-50 to-white px-6 pt-5 pb-3 text-center">
          <p className="text-sm font-black text-amber-600">{returning ? '更新了！' : '歡迎！'}</p>
          <h2 id="whats-new-title" className="text-2xl font-black text-slate-800">認字大冒險 {WHATS_NEW_VERSION} 版</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {returning ? '原本的角色、星星和紀錄都還在。新東西有：' : '給爸媽的簡單介紹：'}
          </p>
        </div>

        <ul className="flex-1 min-h-0 overflow-y-auto px-5 pb-2 flex flex-col gap-3">
          {ITEMS.map(item => (
            <li key={item.title} className="flex gap-3 items-start">
              <span className="text-2xl leading-none shrink-0 mt-0.5" aria-hidden>{item.emoji}</span>
              <div>
                <p className="font-black text-slate-800">{item.title}</p>
                <p className="text-sm text-slate-600 leading-snug">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="shrink-0 p-5 pt-3">
          <button onClick={close} className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-lg font-black shadow-md active:scale-95 transition">
            知道了，開始玩！
          </button>
        </div>
      </div>
    </div>
  );
};
