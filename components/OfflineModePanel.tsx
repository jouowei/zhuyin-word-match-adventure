import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Download, CheckCircle2, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { EnglishUnit, Lesson } from '../types';
import {
  downloadOffline, OfflinePlan, OfflineProgress, offlineNeedsUpdate, offlineSupported, planOfflineDownload,
  readOfflineState, removeOffline,
} from '../services/offline';

interface OfflineModePanelProps {
  lessons: Lesson[];
  englishUnits: EnglishUnit[];
}

type Phase = 'idle' | 'planning' | 'confirm' | 'downloading' | 'failed';

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

/** 離線模式 in 家長專區: turning it on means downloading everything first, and it only counts as on once that finished. */
export const OfflineModePanel: React.FC<OfflineModePanelProps> = ({ lessons, englishUnits }) => {
  const [state, setState] = useState(readOfflineState);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState('');
  const [plan, setPlan] = useState<OfflinePlan | null>(null);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.enabled) offlineNeedsUpdate(state, lessons).then(setNeedsUpdate).catch(() => {});
  }, [state, lessons]);

  useEffect(() => () => abort.current?.abort(), []);

  if (!offlineSupported()) {
    return (
      <p className="text-sm text-gray-500">這個瀏覽器不支援離線模式。請用 Chrome 或 Safari 開啟，並加到主畫面。</p>
    );
  }

  const prepare = async () => {
    setError('');
    setPhase('planning');
    try {
      setPlan(await planOfflineDownload(lessons, englishUnits, setStep));
      setPhase('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : '準備下載時發生問題，請確認有網路');
      setPhase('idle');
    }
  };

  const download = async (toDownload: OfflinePlan) => {
    setPhase('downloading');
    abort.current = new AbortController();
    setProgress({ done: 0, total: toDownload.items.length, bytes: 0, failed: 0 });
    const result = await downloadOffline(toDownload, setProgress, abort.current.signal);
    if (abort.current.signal.aborted) {
      setPhase('idle');
      return;
    }
    if (result.complete) {
      setState(readOfflineState());
      setNeedsUpdate(false);
      setPhase('idle');
    } else {
      setPhase('failed');
    }
  };

  const turnOff = async () => {
    if (!window.confirm('關閉離線模式，並刪除下載的內容？')) return;
    await removeOffline();
    setState(readOfflineState());
    setPhase('idle');
  };

  const bar = progress && (
    <div className="w-full">
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
      </div>
      <p className="text-sm text-gray-500 mt-1">
        {progress.done} / {progress.total} 個檔案{progress.bytes > 0 && `・已下載 ${mb(progress.bytes)}`}{progress.failed > 0 && `・${progress.failed} 個失敗`}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <WifiOff className="text-indigo-500" size={20} />
        <h2 className="font-black text-slate-700">離線模式</h2>
        {state.enabled && phase === 'idle' && (
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={14} /> 已開啟</span>
        )}
      </div>

      {phase === 'idle' && !state.enabled && (
        <>
          <p className="text-sm text-gray-600">
            沒有網路也能玩（例如搭車、出遊）。開啟前要先把音檔、字型和筆順資料全部下載到這臺裝置，下載完成才算開啟。
            建議先把遊戲「加到主畫面」再下載。
          </p>
          <button onClick={prepare} className="self-start px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
            <Download size={18} /> 開啟離線模式
          </button>
        </>
      )}

      {phase === 'planning' && <p className="text-sm text-gray-500 flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> {step || '準備中…'}</p>}

      {phase === 'confirm' && plan && (
        <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col gap-2">
          <p className="font-bold text-indigo-900">需要下載 {plan.items.length} 個檔案，約 {mb(plan.estimatedBytes)}</p>
          <ul className="text-sm text-gray-600 list-disc pl-5">
            <li>遊戲程式、注音與英文音檔：約 {mb(plan.appBytes)}</li>
            <li>課文與遊戲裡 {plan.wordCount} 個詞語的教育部錄音（只存詞語本身，不含整段解釋）</li>
            <li>注音字型、楷書字型與國字筆順</li>
          </ul>
          <p className="text-xs text-gray-500">建議連上 Wi-Fi 再下載。下載時請不要關掉這個畫面。</p>
          <div className="flex gap-2">
            <button onClick={() => download(plan)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">開始下載</button>
            <button onClick={() => setPhase('idle')} className="px-4 py-2 bg-white text-gray-600 rounded-xl font-bold border">取消</button>
          </div>
        </div>
      )}

      {phase === 'downloading' && (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-indigo-900">下載中…完成後才能離線使用</p>
          {bar}
          <button onClick={() => abort.current?.abort()} className="self-start text-sm text-gray-500 underline">取消下載</button>
        </div>
      )}

      {phase === 'failed' && plan && (
        <div className="bg-amber-50 rounded-2xl p-4 flex flex-col gap-2">
          <p className="font-bold text-amber-800 flex items-center gap-2"><AlertTriangle size={18} /> 有 {progress?.failed} 個檔案沒有下載成功，離線模式還沒開啟</p>
          <p className="text-sm text-gray-600">請確認網路後按「繼續下載」，已下載的檔案不用重新下載。</p>
          {bar}
          <div className="flex gap-2">
            <button onClick={() => download(plan)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">繼續下載</button>
            <button onClick={() => setPhase('idle')} className="px-4 py-2 bg-white text-gray-600 rounded-xl font-bold border">先不要</button>
          </div>
        </div>
      )}

      {phase === 'idle' && state.enabled && (
        <>
          <p className="text-sm text-gray-600">
            這臺裝置已下載 {state.files} 個檔案{state.at && `（${new Date(state.at).toLocaleDateString('zh-TW')}）`}，沒有網路也能玩。
            AI 產生圖片、查詢新的詞語需要網路。
          </p>
          {needsUpdate && (
            <div className="bg-amber-50 rounded-xl p-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-amber-800">遊戲或課文有更新，離線內容需要再下載一次</span>
              <button onClick={prepare} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm">更新離線內容</button>
            </div>
          )}
          <button onClick={turnOff} className="self-start text-sm text-gray-500 underline flex items-center gap-1">
            <Trash2 size={14} /> 關閉離線模式並刪除下載的內容
          </button>
        </>
      )}

      {error && <p className="text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
};
