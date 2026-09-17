
import React, { useState, useEffect } from 'react';
import { RewardCard } from '../types';
import { X, CheckCircle, RotateCcw, Layers, AlertTriangle } from 'lucide-react';

interface CardDetailOverlayProps {
  card: RewardCard | null;
  count: number;
  rewardImages: Record<string, string>;
  imageRefreshVersion: number;
  imageLoadErrors: Record<string, boolean>;
  onClose: () => void;
  onImageError: (id: string) => void;
  onRedeem: () => void;
  onSell: () => void;
  sellRatio: number;
}

export const CardDetailOverlay: React.FC<CardDetailOverlayProps> = ({ 
  card, count, rewardImages, imageRefreshVersion, imageLoadErrors, onClose, onImageError, onRedeem, onSell, sellRatio 
}) => {
  const [confirmMode, setConfirmMode] = useState<'none' | 'redeem' | 'sell'>('none');

  // Reset confirm mode when card changes or closes
  useEffect(() => {
    setConfirmMode('none');
  }, [card]);

  if (!card) return null;

  const refundAmount = Math.floor(card.cost * sellRatio);

  const handleActionClick = (e: React.MouseEvent, mode: 'redeem' | 'sell') => {
    e.stopPropagation();
    setConfirmMode(mode);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmMode === 'redeem') {
      onRedeem();
    } else if (confirmMode === 'sell') {
      onSell();
    }
    setConfirmMode('none');
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmMode('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl animate-pop border-8 border-white flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
           
           <button onClick={onClose} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full z-10">
             <X size={24} />
           </button>

           {count > 1 && (
              <div className="absolute top-2 left-2 z-10 bg-indigo-500 text-white font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                 <Layers size={14} /> 擁有 {count} 張
              </div>
           )}

           <div className={`mx-auto w-full aspect-square ${card.color} rounded-xl border-4 border-white shadow-inner flex flex-col items-center justify-center p-4 mb-4 relative overflow-hidden shrink-0`}>
              {(rewardImages[card.id] || card.imageUrl) && !imageLoadErrors[card.id] ? (
                <img 
                  src={rewardImages[card.id] || `${card.imageUrl}?v=${imageRefreshVersion}`} 
                  alt={card.title} 
                  className="w-full h-full object-contain rounded-lg"
                  onError={() => onImageError(card.id)}
                />
              ) : (
                <div className="text-9xl drop-shadow-md">{card.emoji}</div>
              )}
           </div>

           <h3 className="text-3xl font-bold text-gray-800 mb-2">{card.title}</h3>
           <p className="text-xl text-gray-600 font-medium leading-relaxed mb-6">{card.description}</p>

           <div className="space-y-3 mt-auto">
              {confirmMode === 'none' ? (
                <>
                  <button 
                     onClick={(e) => handleActionClick(e, 'redeem')}
                     className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md text-lg flex items-center justify-center gap-2 transform active:scale-95 transition"
                  >
                    <CheckCircle /> 使用一張 (剩 {count - 1} 張)
                  </button>

                  <button 
                     onClick={(e) => handleActionClick(e, 'sell')}
                     className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-3 rounded-xl shadow-sm text-sm flex items-center justify-center gap-2 transform active:scale-95 transition"
                  >
                    <RotateCcw size={16} /> 賣出一張 (退 {refundAmount} 點)
                  </button>
                </>
              ) : (
                <div className="bg-gray-100 p-4 rounded-2xl animate-pop">
                   <p className="font-bold text-gray-700 mb-3 flex items-center justify-center gap-2">
                     <AlertTriangle className={confirmMode === 'redeem' ? 'text-green-500' : 'text-orange-500'} />
                     {confirmMode === 'redeem' ? '確定要使用這張卡片嗎？' : `確定要賣掉換 ${refundAmount} 點嗎？`}
                   </p>
                   <div className="flex gap-3">
                     <button 
                        onClick={handleCancelConfirm}
                        className="flex-1 bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-300 hover:bg-gray-50"
                     >
                       取消
                     </button>
                     <button 
                        onClick={handleConfirm}
                        className={`flex-1 text-white font-bold py-3 rounded-xl shadow-md ${confirmMode === 'redeem' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                     >
                       確定{confirmMode === 'redeem' ? '使用' : '賣出'}
                     </button>
                   </div>
                </div>
              )}
           </div>
        </div>
    </div>
  );
};
