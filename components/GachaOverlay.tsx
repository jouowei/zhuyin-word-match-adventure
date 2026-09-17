
import React from 'react';
import { RewardCard, UserProfile } from '../types';
import { X, Sparkles, Star } from 'lucide-react';

interface GachaOverlayProps {
  show: boolean;
  stage: 'idle' | 'spinning' | 'revealed';
  wonCard: RewardCard | null;
  rewardImages: Record<string, string>;
  imageRefreshVersion: number;
  imageLoadErrors: Record<string, boolean>;
  currentUser: UserProfile;
  onClose: () => void;
  onImageError: (id: string) => void;
}

export const GachaOverlay: React.FC<GachaOverlayProps> = ({ 
  show, stage, wonCard, rewardImages, imageRefreshVersion, imageLoadErrors, currentUser, onClose, onImageError 
}) => {
  if (!show) return null;

  const isMiss = wonCard?.id === 'miss';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
      {stage === 'spinning' && (
        <div className="flex flex-col items-center animate-pop">
           <div className="text-9xl animate-shake mb-8">🎁</div>
           <div className="text-white text-3xl font-bold animate-pulse">正在抽取幸運卡片...</div>
        </div>
      )}

      {stage === 'revealed' && wonCard && (
        <div className={`relative bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl animate-pop border-8 ${isMiss ? 'border-orange-300' : 'border-yellow-300'}`}>
           <div className="absolute inset-0 overflow-hidden rounded-2xl -z-10">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] opacity-50 animate-spin-slow origin-center ${isMiss ? 'bg-gradient-to-r from-orange-200 via-orange-100 to-orange-200' : 'bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200'}`} style={{clipPath: 'polygon(50% 50%, 0 0, 100% 0, 50% 50%, 100% 100%, 0 100%)'}}></div>
           </div>

           <button onClick={onClose} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600">
             <X size={32} />
           </button>

           {isMiss ? (
             // --- CUSTOM UI FOR CONSOLATION PRIZE ---
             <div className="flex flex-col items-center">
                <div className="text-orange-500 font-bold text-2xl mb-4 flex items-center justify-center gap-2">
                  <Star className="fill-orange-500" /> 幸運安慰獎 <Star className="fill-orange-500" />
                </div>
                
                <div className="text-[8rem] mb-4 animate-bounce filter drop-shadow-xl">
                   {wonCard.emoji}
                </div>

                <h3 className="text-3xl font-black text-gray-800 mb-2">獲得 50 點！</h3>
                <p className="text-gray-600 font-medium mb-8 bg-orange-50 px-4 py-2 rounded-xl">
                   別氣餒！老闆送你購物金，<br/>存起來下次再來挑戰！
                </p>

                <button 
                  onClick={onClose}
                  className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-md text-xl transform active:scale-95 transition"
                >
                   太棒了！收下購物金
                </button>
             </div>
           ) : (
             // --- STANDARD UI FOR WON CARD ---
             <>
               <div className="text-yellow-500 font-bold text-xl mb-2 flex items-center justify-center gap-2">
                 <Sparkles /> 幸運中獎 <Sparkles />
               </div>

               <div className={`mx-auto w-full max-w-sm ${wonCard.imageUrl ? 'aspect-video' : 'aspect-[3/4]'} ${wonCard.color} rounded-xl border-4 border-white shadow-inner flex flex-col items-center justify-center p-4 mb-4 relative overflow-hidden transition-all`}>
                  {(rewardImages[wonCard.id] || wonCard.imageUrl) && !imageLoadErrors[wonCard.id] ? (
                    <img 
                      src={rewardImages[wonCard.id] || `${wonCard.imageUrl}?v=${imageRefreshVersion}`} 
                      alt={wonCard.title} 
                      className="w-full h-full object-contain rounded-lg"
                      onError={() => onImageError(wonCard.id)}
                    />
                  ) : (
                    <>
                      <div className="text-8xl mb-4 drop-shadow-md">{wonCard.emoji}</div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{wonCard.title}</h3>
                      <p className="text-gray-600 font-medium leading-relaxed">{wonCard.description}</p>
                    </>
                  )}
               </div>
               
               {(rewardImages[wonCard.id] || wonCard.imageUrl) && !imageLoadErrors[wonCard.id] && (
                   <div className="mb-4">
                     <h3 className="text-2xl font-bold text-gray-800">{wonCard.title}</h3>
                     <p className="text-sm text-gray-600">{wonCard.description}</p>
                   </div>
               )}

               <div className="text-sm text-gray-500 mb-4 font-bold">
                  放入你的收藏盒了！
               </div>

               <button 
                  onClick={onClose}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 rounded-xl shadow-md"
               >
                 太棒了！收下卡片
               </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};
