
import React, { useState } from 'react';
import { UserProfile, RewardCard } from '../types';
import { REWARD_CARDS } from '../constants';
import { Home, Gift, Star, Palette, Sparkles, Trophy, Camera, CheckCircle, Upload, Lock, Layers } from 'lucide-react';
import { playSound } from '../utils/sound';
import { GachaOverlay } from './GachaOverlay';
import { CardDetailOverlay } from './CardDetailOverlay';

interface ShopViewProps {
  currentUser: UserProfile;
  rewardImages: Record<string, string>;
  imageRefreshVersion: number;
  imageLoadErrors: Record<string, boolean>;
  onBack: () => void;
  onPurchase: (card: RewardCard) => void;
  masteredCount: number;        // Characters, zhuyin symbols and English letters/words learned
  milestonesAvailable: number;  // Free cards earned by learning (one per 10)
  onClaimMilestone: (card: RewardCard) => void;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => void;
  onFileUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageError: (id: string) => void;
}

// Configuration Constants
const GACHA_COST = 200; // Cost remains 200
const SELL_RATIO = 0.3; 
const CONSOLATION_POINTS = 50;

// Definition of the Miss Card (Consolation Prize)
const MISS_CARD: RewardCard = {
  id: 'miss',
  title: '幸運安慰獎',
  emoji: '💰', // Changed from 😅 to Money Bag
  description: '雖然沒抽中卡片，\n但老闆送你 50 點購物金！\n存起來下次再來抽！',
  color: 'bg-orange-100', // Warmer color
  cost: 0
};

export const ShopView: React.FC<ShopViewProps> = ({ 
  currentUser, rewardImages, imageRefreshVersion, imageLoadErrors, 
  onBack, onPurchase, masteredCount, milestonesAvailable, onClaimMilestone, onUpdateUser, onFileUpload, onImageError 
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [choosingFree, setChoosingFree] = useState(false);
  const [viewingCard, setViewingCard] = useState<RewardCard | null>(null);
  
  // Gacha State
  const [showGacha, setShowGacha] = useState(false);
  const [gachaStage, setGachaStage] = useState<'idle' | 'spinning' | 'revealed'>('idle');
  const [wonCard, setWonCard] = useState<RewardCard | null>(null);

  // Inventory Logic: Count how many of each card the user has
  const cardCounts: Record<string, number> = {};
  currentUser.ownedCardIds.forEach(id => {
    cardCounts[id] = (cardCounts[id] || 0) + 1;
  });

  // Unique cards owned (for display in grid)
  const uniqueOwnedIds = Object.keys(cardCounts);
  const ownedCardsDisplay = REWARD_CARDS.filter(c => uniqueOwnedIds.includes(c.id));
  
  // Check if collection is complete (User has at least 1 of every card type)
  const allCardIds = REWARD_CARDS.map(c => c.id);
  const isCollectionComplete = allCardIds.length > 0 && allCardIds.every(id => uniqueOwnedIds.includes(id));

  // Available to buy (Always show all cards now, since duplicates are allowed)
  const availableCards = REWARD_CARDS;

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        let bestVoice = null;
        bestVoice = voices.find(v => v.lang === 'zh-TW' && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!bestVoice) bestVoice = voices.find(v => v.name === 'Google 國語（臺灣）');
        if (!bestVoice) bestVoice = voices.find(v => v.lang === 'zh-TW');
        if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('zh'));
        
        if (bestVoice) utterance.voice = bestVoice;
        
        utterance.lang = 'zh-TW';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
  };

  const handleViewCard = (card: RewardCard) => {
    if (isEditMode) return;
    setViewingCard(card);
    speakText(card.title);
  };

  const handleGachaDraw = () => {
    if (currentUser.points < GACHA_COST) return;
    
    // Deduct points immediately
    const pointsAfterCost = currentUser.points - GACHA_COST;
    onUpdateUser(currentUser.id, { points: pointsAfterCost });
    
    setShowGacha(true);
    setGachaStage('spinning');
    playSound('magic');

    setTimeout(() => {
      // --- WEIGHTED RANDOM LOGIC START ---
      // Scale: 10000 units total
      
      const weightedPool = REWARD_CARDS.map(card => {
        let weight = 0;

        if (card.cost <= 400) {
           // Common: 49% total (4900 units). 
           // 7 cards available. 4900 / 7 = 700 each.
           weight = 700; 
        } else if (card.cost <= 600) {
           // Rare: 18% total (1800 units).
           // Currently 4 cards in this range (500x2, 600x2).
           // 1800 / 4 = 450 each.
           weight = 450; 
        } else if (card.cost === 800) {
           // Epic: 20% total (2000 units). 
           // 5 cards available. 2000 / 5 = 400 each.
           weight = 400; 
        } else if (card.cost === 1000) {
           // Epic L2: 1.5% total (150 units). 1 card.
           weight = 150; 
        } else if (card.cost === 1200) {
           // Epic L3: 1.0% total (100 units). 1 card.
           weight = 100;  
        } else if (card.cost === 1500) {
           // Legendary: 0.42% total (42 units). 1 card.
           weight = 42;  
        } else if (card.cost >= 2000) {
           // Mythic: 0.08% total (8 units). 1 card.
           weight = 8;   
        }
        
        return { card, weight };
      });

      // Miss Probability: 10% -> 1000 units
      const missWeight = 1000; 
      
      // Combine pool
      const fullPool = [
        ...weightedPool,
        { card: MISS_CARD, weight: missWeight }
      ];

      // Calculate final total weight (Should be 10000)
      const finalTotalWeight = fullPool.reduce((sum, item) => sum + item.weight, 0);
      
      // Pick random
      let randomNum = Math.random() * finalTotalWeight;
      let selected = MISS_CARD;

      for (const item of fullPool) {
        if (randomNum < item.weight) {
          selected = item.card;
          break;
        }
        randomNum -= item.weight;
      }
      // --- WEIGHTED RANDOM LOGIC END ---

      setWonCard(selected);
      setGachaStage('revealed');

      if (selected.id === 'miss') {
         // Miss: Consolation prize
         // Use 'pop' instead of 'error' for a more positive feeling
         playSound('pop'); 
         speakText('獲得安慰獎，五十點');
         onUpdateUser(currentUser.id, {
            points: pointsAfterCost + CONSOLATION_POINTS
         });
      } else {
         // Win: Add to inventory
         playSound('cheer');
         onUpdateUser(currentUser.id, {
            ownedCardIds: [...currentUser.ownedCardIds, selected.id]
         });
         
         if (selected.cost >= 1500) {
            speakText(`哇！太幸運了！你抽中了傳說級的 ${selected.title}`);
         } else {
            speakText(`恭喜獲得 ${selected.title}`);
         }
      }
      
    }, 2000);
  };

  // 兌換 (使用) 卡片
  const handleRedeem = (card: RewardCard) => {
    const currentIds = [...currentUser.ownedCardIds];
    const index = currentIds.indexOf(card.id);
    
    if (index > -1) {
      currentIds.splice(index, 1); // Remove only 1 instance
      onUpdateUser(currentUser.id, { ownedCardIds: currentIds });
      
      playSound('success');
      speakText(`已使用${card.title}`);

      // Only close if count reaches 0
      const newCount = (cardCounts[card.id] || 0) - 1;
      if (newCount <= 0) {
        setViewingCard(null);
      }
    }
  };

  // 回收 (賣出) 卡片 - 使用新的 SELL_RATIO
  const handleSell = (card: RewardCard) => {
    const refundAmount = Math.floor(card.cost * SELL_RATIO);
    const currentIds = [...currentUser.ownedCardIds];
    const index = currentIds.indexOf(card.id);

    if (index > -1) {
      currentIds.splice(index, 1); // Remove only 1 instance
      onUpdateUser(currentUser.id, { 
        ownedCardIds: currentIds,
        points: currentUser.points + refundAmount
      });
      
      playSound('magic'); 
      speakText(`賣出成功，獲得${refundAmount}點`);

      // Only close if count reaches 0
      const newCount = (cardCounts[card.id] || 0) - 1;
      if (newCount <= 0) {
        setViewingCard(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 p-4 pb-20">
       <GachaOverlay 
         show={showGacha} 
         stage={gachaStage} 
         wonCard={wonCard} 
         rewardImages={rewardImages} 
         imageRefreshVersion={imageRefreshVersion} 
         imageLoadErrors={imageLoadErrors} 
         currentUser={currentUser}
         onClose={() => { setShowGacha(false); setGachaStage('idle'); setWonCard(null); }}
         onImageError={onImageError}
       />

       <CardDetailOverlay 
         card={viewingCard} 
         count={viewingCard ? (cardCounts[viewingCard.id] || 0) : 0}
         rewardImages={rewardImages} 
         imageRefreshVersion={imageRefreshVersion} 
         imageLoadErrors={imageLoadErrors} 
         onClose={() => setViewingCard(null)} 
         onImageError={onImageError}
         onRedeem={() => viewingCard && handleRedeem(viewingCard)}
         onSell={() => viewingCard && handleSell(viewingCard)}
         sellRatio={SELL_RATIO}
       />

       <div className="max-w-4xl mx-auto">
         {/* Shop Header */}
         <div className="sticky top-0 bg-purple-50/95 backdrop-blur-sm z-10 py-4 mb-4 border-b border-purple-200">
           <div className="flex items-center justify-between">
              <button 
                onClick={onBack} 
                className="px-4 py-2 bg-white rounded-full shadow-sm text-gray-500 font-bold flex items-center gap-2 border border-purple-100 hover:bg-gray-50 transition"
              >
                 <Home size={20} /> <span className="text-sm">回首頁</span>
              </button>
              <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-2">
                 <Gift /> 禮物商店
              </h2>
              <div className="bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300 font-bold text-yellow-800 flex items-center gap-2 shadow-sm">
                <Star className="fill-yellow-400 text-yellow-500" /> {currentUser.points}
              </div>
           </div>
         </div>
         
         <div className="flex justify-between items-center mb-4">
           {/* Edit Mode Toggle */}
           <button
             onClick={() => setIsEditMode(!isEditMode)}
             className={`text-xs md:text-sm px-3 py-2 rounded-full flex items-center gap-1 transition ${isEditMode ? 'bg-blue-600 text-white shadow-inner ring-2 ring-blue-300' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
           >
              <Palette size={16} /> {isEditMode ? '完成設定' : '🎨 自訂圖片模式'}
           </button>
         </div>

         {/* Collection Complete Celebration Banner */}
         {isCollectionComplete && (
           <div className="mb-8 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 p-1 rounded-2xl shadow-xl animate-pop">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-yellow-200">
                 <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-md flex items-center justify-center gap-2 animate-bounce">
                    <Trophy className="text-yellow-100" size={32} />
                    太厲害了！全套卡片收集完成！
                    <Trophy className="text-yellow-100" size={32} />
                 </h2>
                 <p className="text-white font-bold mt-1 drop-shadow-sm">你是真正的卡片大師！可以繼續收集更多張喔！</p>
              </div>
           </div>
         )}

         {/* Milestone cards: learning, not luck, earns a card of the child's choice */}
         <div className="mb-8 bg-gradient-to-r from-emerald-100 to-teal-100 border-4 border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
           <span className="text-5xl">🌱</span>
           <div className="flex-1 text-center md:text-left">
             <div className="text-xl font-black text-emerald-800">已經學會 {masteredCount} 個字、注音和英文</div>
             {milestonesAvailable > 0 ? (
               <div className="text-emerald-700 font-bold">每學會 10 個，就能免費選一張卡！現在可以選 {milestonesAvailable} 張</div>
             ) : (
               <>
                 <div className="text-emerald-700 font-bold">再學會 {10 - (masteredCount % 10)} 個，就能免費選一張卡</div>
                 <div className="h-3 bg-white rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${(masteredCount % 10) * 10}%` }} /></div>
               </>
             )}
           </div>
           {milestonesAvailable > 0 && (
             <button
               onClick={() => setChoosingFree(!choosingFree)}
               className={`px-6 py-3 rounded-2xl font-black text-lg shadow-lg transition active:scale-95 ${choosingFree ? 'bg-white text-emerald-700 border-2 border-emerald-300' : 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'}`}
             >
               {choosingFree ? '先不選' : '🎁 選一張卡'}
             </button>
           )}
         </div>
         {choosingFree && milestonesAvailable > 0 && (
           <p className="mb-4 text-center text-lg font-black text-emerald-700 animate-bounce">👇 在下面的卡片商店，按「免費選這張」</p>
         )}

         {/* 1. My Collection Section */}
         {ownedCardsDisplay.length > 0 && (
           <div className="mb-8">
              <h3 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                 <Trophy className="text-yellow-500" /> 我的收藏 (共 {currentUser.ownedCardIds.length} 張)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {ownedCardsDisplay.map(card => {
                    const count = cardCounts[card.id] || 0;
                    return (
                      <div 
                        key={card.id} 
                        onClick={() => !isEditMode && handleViewCard(card)}
                        className={`${card.color} p-4 rounded-xl border-4 border-white shadow-md relative group flex flex-col transition-all overflow-hidden ${!isEditMode ? 'cursor-pointer hover:scale-105' : ''}`}
                      >
                         
                         {/* Count Badge */}
                         {count > 1 && (
                            <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-md border-2 border-white flex items-center gap-1 animate-pop">
                               <Layers size={12} /> x{count}
                            </div>
                         )}

                         {isEditMode ? (
                           <div className="absolute top-2 right-2 z-20">
                              <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg flex items-center gap-1 text-xs font-bold transition-transform hover:scale-110">
                                <Camera size={16} /> 上傳
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => onFileUpload(card.id, e)}
                                />
                              </label>
                           </div>
                         ) : (
                           <div className="absolute top-2 right-2 text-green-600 bg-white rounded-full p-1 opacity-80 z-10">
                              <CheckCircle size={16} />
                           </div>
                         )}

                         {(rewardImages[card.id] || card.imageUrl) && !imageLoadErrors[card.id] ? (
                           <div className="flex-1 min-h-[120px] mb-2 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                              <img 
                                src={rewardImages[card.id] || `${card.imageUrl}?v=${imageRefreshVersion}`} 
                                alt={card.title} 
                                className="w-full h-full object-contain" 
                                onError={() => onImageError(card.id)}
                              />
                           </div>
                         ) : (
                           <div className="text-5xl text-center mb-2 flex-1 flex items-center justify-center">{card.emoji}</div>
                         )}
                         <h4 className="font-bold text-center text-gray-800 text-sm md:text-base leading-tight mt-auto">{card.title}</h4>
                      </div>
                    );
                 })}
              </div>
           </div>
         )}

         {/* 2. Store Section */}
         <div className="mb-8">
           <h3 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
             <Gift className="text-red-500" /> 卡片商店
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {availableCards.map(card => {
                const canAfford = currentUser.points >= card.cost;
                const count = cardCounts[card.id] || 0;
                
                return (
                 <div key={card.id} className="bg-white p-4 rounded-2xl shadow-md flex flex-col gap-3 border-2 border-gray-100 hover:border-purple-200 transition-colors relative">
                    
                    {/* Owned Badge in Store */}
                    {count > 0 && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm z-10">
                         已擁有 {count} 張
                      </div>
                    )}

                    {isEditMode && (
                       <div className="absolute top-2 right-2 z-20">
                          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg flex items-center gap-1 text-xs font-bold transition-transform hover:scale-110">
                            <Upload size={14} /> 照片
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => onFileUpload(card.id, e)}
                            />
                          </label>
                       </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className={`w-24 h-14 ${card.color} rounded-xl flex items-center justify-center text-3xl shadow-inner overflow-hidden shrink-0`}>
                         {(rewardImages[card.id] || card.imageUrl) && !imageLoadErrors[card.id] ? (
                           <img 
                             src={rewardImages[card.id] || `${card.imageUrl}?v=${imageRefreshVersion}`} 
                             alt={card.title} 
                             className="w-full h-full object-contain bg-white" 
                             onError={() => onImageError(card.id)}
                           />
                         ) : (
                           card.emoji
                         )}
                      </div>
                      <div className="flex-1">
                         <h3 className="font-bold text-gray-800">{card.title}</h3>
                         <p className="text-xs text-gray-500 line-clamp-2">{card.description}</p>
                      </div>
                    </div>
                    
                    {choosingFree && milestonesAvailable > 0 && (
                      <button
                        onClick={() => { onClaimMilestone(card); setChoosingFree(false); }}
                        className="w-full py-2 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transform active:scale-95"
                      >
                        🎁 免費選這張
                      </button>
                    )}
                    <button 
                      onClick={() => onPurchase(card)}
                      disabled={!canAfford}
                      className={`
                         w-full py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
                         ${canAfford 
                           ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md transform active:scale-95' 
                           : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                      `}
                    >
                      {canAfford ? '購買' : <Lock size={14} />} {card.cost} ⭐️
                    </button>
                 </div>
                );
             })}
           </div>
         </div>

         {/* 3. Gacha Banner (Bottom) */}
         <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white text-center shadow-lg mb-8 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                 <Sparkles className="animate-spin-slow" /> 幸運轉蛋機 <Sparkles className="animate-spin-slow" />
              </h3>
              <p className="mb-4 opacity-90">{GACHA_COST} 點抽一次！有機會獲得安慰獎！</p>
              <button 
                onClick={handleGachaDraw}
                disabled={currentUser.points < GACHA_COST}
                className={`
                  bg-yellow-400 text-yellow-900 font-bold py-3 px-8 rounded-full shadow-xl 
                  border-b-4 border-yellow-600 transform transition active:scale-95 active:border-b-0 active:translate-y-1
                  ${currentUser.points < GACHA_COST ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-300 animate-pulse'}
                `}
              >
                {currentUser.points < GACHA_COST ? '點數不足' : `馬上抽獎 (${GACHA_COST}⭐️)`}
              </button>
            </div>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 bg-yellow-300 opacity-20 rounded-full blur-3xl"></div>
         </div>

       </div>
    </div>
  );
};
