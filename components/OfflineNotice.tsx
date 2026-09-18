import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { readOfflineState } from '../services/offline';

/** Without a network: a small "離線中" badge when offline content is ready, otherwise what the parent needs to do. */
export const OfflineNotice: React.FC = () => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;
  if (readOfflineState().enabled) {
    return (
      <div className="fixed left-3 z-[80] bg-slate-700/85 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <WifiOff size={16} /> 離線中
      </div>
    );
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
      <div className="max-w-md mx-auto bg-slate-800 text-white rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
        <WifiOff className="shrink-0 mt-0.5" size={22} />
        <p className="text-sm font-bold">
          現在沒有網路，有些聲音和圖片會出不來。下次連上網路時，請到「家長專區」開啟離線模式，先把內容下載好。
        </p>
      </div>
    </div>
  );
};
