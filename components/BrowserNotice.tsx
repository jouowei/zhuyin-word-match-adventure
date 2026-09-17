import React, { useState } from 'react';
import { ExternalLink, Copy, X, VolumeX } from 'lucide-react';
import { canSpeak, detectInAppBrowser, externalBrowserUrl } from '../utils/browserSupport';

const DISMISS_KEY = 'browser_notice_dismissed';

/** Tells parents when this browser can't speak the Chinese instructions, and how to open the game somewhere that can. */
export const BrowserNotice: React.FC = () => {
  const inApp = detectInAppBrowser();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  if (dismissed || (!inApp && canSpeak())) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Shows again next time
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
      <div className="max-w-md mx-auto bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
        <VolumeX className="text-amber-600 shrink-0 mt-0.5" size={24} />
        <div className="flex-1 text-sm text-amber-900">
          <p className="font-bold mb-2">
            {inApp === 'line'
              ? '在 LINE 裡開啟時，聽不到中文語音說明。請改用手機的瀏覽器開啟。'
              : '這個瀏覽器聽不到中文語音說明，請改用 Chrome 或 Safari 開啟。'}
          </p>
          {inApp === 'line' ? (
            <a href={externalBrowserUrl(window.location.href)} className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl">
              <ExternalLink size={16} /> 用瀏覽器開啟
            </a>
          ) : (
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl">
              <Copy size={16} /> {copied ? '已複製網址' : '複製網址'}
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-amber-500 hover:text-amber-700 shrink-0" aria-label="關閉提示">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
