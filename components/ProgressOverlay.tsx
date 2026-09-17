import React from 'react';

interface ProgressOverlayProps {
  progress: { current: number; total: number } | null;
}

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ progress }) => {
  if (!progress) return null;
  const pct = Math.round((progress.current / progress.total) * 100);
  
  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
      <div className="text-6xl mb-4 animate-bounce">📥</div>
      <h2 className="text-2xl font-bold mb-4">正在處理圖片...</h2>
      <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
         <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${pct}%`}}></div>
      </div>
      <p className="mt-2 text-xl">{progress.current} / {progress.total}</p>
      <p className="mt-8 text-gray-400 text-sm">請勿關閉視窗</p>
    </div>
  );
};