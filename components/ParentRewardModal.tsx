
import React, { useState } from 'react';
import { X, Gift } from 'lucide-react';
import { playSound } from '../utils/sound';
import { ParentUnlock } from './ParentLock';

interface ParentRewardModalProps {
  onClose: () => void;
  onReward: (points: number) => void;
}

export const ParentRewardModal: React.FC<ParentRewardModalProps> = ({ onClose, onReward }) => {
  const [step, setStep] = useState<'auth' | 'reward'>('auth');
  const [customPoints, setCustomPoints] = useState('');

  const handleGivePoints = (amount: number) => {
    playSound('magic');
    onReward(amount);
    // Wait a bit for the animation/sound before closing or showing success state
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCustomSubmit = () => {
    const amount = parseInt(customPoints);
    if (amount > 0) {
      handleGivePoints(amount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-pop border-8 border-indigo-200 relative overflow-hidden">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition z-10"
        >
          <X size={24} />
        </button>

        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-24 bg-indigo-50 -z-0"></div>

        {step === 'auth' ? (
          <div className="relative z-10 flex flex-col items-center pt-4">
            <ParentUnlock title="家長管理專區" subtitle="請輸入密碼來領取實體任務獎勵" onUnlock={() => setStep('reward')} />
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center pt-4 animate-in fade-in slide-in-from-right duration-300">
             <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center border-4 border-yellow-300 mb-4 shadow-md animate-bounce">
              <Gift size={40} className="text-yellow-600" />
            </div>
            
            <h2 className="text-2xl font-black text-indigo-900 mb-2">發放獎勵點數</h2>
            <p className="text-gray-500 mb-6 text-sm font-bold">安哥太棒了！完成了什麼任務呢？</p>

            <div className="grid grid-cols-2 gap-3 w-full mb-4">
              <button onClick={() => handleGivePoints(100)} className="bg-green-100 hover:bg-green-200 text-green-700 font-bold py-4 rounded-xl border border-green-200 flex flex-col items-center gap-1 transition-transform active:scale-95">
                <span className="text-xs">簡單任務</span>
                <span className="text-xl">+100 ⭐️</span>
              </button>
              <button onClick={() => handleGivePoints(300)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-4 rounded-xl border border-blue-200 flex flex-col items-center gap-1 transition-transform active:scale-95">
                <span className="text-xs">一般任務</span>
                <span className="text-xl">+300 ⭐️</span>
              </button>
              <button onClick={() => handleGivePoints(500)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold py-4 rounded-xl border border-purple-200 flex flex-col items-center gap-1 transition-transform active:scale-95">
                <span className="text-xs">困難任務</span>
                <span className="text-xl">+500 ⭐️</span>
              </button>
              <button onClick={() => handleGivePoints(1000)} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold py-4 rounded-xl border border-yellow-200 flex flex-col items-center gap-1 transition-transform active:scale-95">
                <span className="text-xs">超級大獎</span>
                <span className="text-xl">+1000 ⭐️</span>
              </button>
            </div>

            <div className="w-full flex gap-2 border-t pt-4 border-gray-100">
              <input 
                type="number" 
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                placeholder="自訂點數"
                className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2 font-bold focus:border-indigo-500 outline-none text-gray-900"
              />
              <button 
                onClick={handleCustomSubmit}
                disabled={!customPoints}
                className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
              >
                確認
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
