
import React, { useState } from 'react';
import { UserProfile, Lesson } from '../types';
import { Star, Gift, RefreshCw, Trophy, LogOut, BookOpen, ArrowRight, XCircle, PlayCircle, QrCode, RotateCcw, ClipboardList } from 'lucide-react';
import { ParentRewardModal } from './ParentRewardModal';
import { LevelStars } from './LevelStars';

interface MenuViewProps {
  currentUser: UserProfile;
  currentVocabulary: string[];
  activeLesson: Lesson | null;
  onStart: () => void;
  onZhuyinMode: () => void;
  onEnglishMode: () => void;
  onReviewMode: () => void;
  reviewCount: number;       // Lesson words due for spaced review today
  masteredCount: number;     // Characters, zhuyin symbols and English letters/words remembered over several days (學會)
  lessonProgress: number[];  // Completed game levels of the active lesson
  onShop: () => void;
  onLeaderboard: () => void;
  onParentReport: () => void;
  milestonesAvailable: number; // Free cards waiting in the shop
  onSettings: () => void;
  onLogout: () => void;
  onLessonMode: () => void;
  onReviewLesson: () => void;
  onExitLesson: () => void;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => void; // Added prop
  isGenerating: boolean;
}

export const MenuView: React.FC<MenuViewProps> = ({ 
  currentUser, currentVocabulary, activeLesson, onStart, onZhuyinMode, onEnglishMode, onReviewMode, reviewCount, masteredCount, lessonProgress, onShop, onLeaderboard, onParentReport, milestonesAvailable, onSettings, onLogout, onLessonMode, onReviewLesson, onExitLesson, onUpdateUser, isGenerating 
}) => {
  const [showRewardModal, setShowRewardModal] = useState(false);

  const handlePhysicalReward = (amount: number) => {
    onUpdateUser(currentUser.id, {
      points: currentUser.points + amount
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-200 to-blue-50 p-4 relative">
      
      {showRewardModal && (
        <ParentRewardModal 
          onClose={() => setShowRewardModal(false)}
          onReward={handlePhysicalReward}
        />
      )}

      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 bg-white/50 hover:bg-white px-4 py-2 rounded-full text-indigo-700 text-sm font-bold transition-all shadow-sm"
        >
          <LogOut size={16} /> 換人玩
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border-b-8 border-blue-200">
        
        <div className="mb-6 flex flex-col items-center">
           <div className="text-6xl mb-2">{currentUser.avatar}</div>
           <div className="text-xl font-bold text-gray-700">嗨，{currentUser.name}！</div>
           <div className="text-sm text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full mt-2 font-bold flex items-center gap-1">
              <Star size={14} className="fill-yellow-500" /> {currentUser.points} 分
           </div>
           {masteredCount > 0 && (
             <div className="text-sm text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mt-2 font-bold">🌱 已經學會 {masteredCount} 個字、注音和英文</div>
           )}
        </div>

        <h1 className="text-4xl font-bold text-blue-800 mb-2">認字大冒險</h1>
        
        {/* Active Lesson Mode Dashboard */}
        {activeLesson ? (
          <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border-4 border-indigo-100 animate-pop">
            <div className="flex items-center justify-center gap-2 text-indigo-500 font-bold mb-2">
               <BookOpen size={20} /> 目前正在學習
            </div>
            <h2 className="text-2xl font-black text-indigo-900 mb-2">{activeLesson.title}</h2>
            <LevelStars completed={lessonProgress} total={8} className="justify-center mb-4" />

            <div className="space-y-3">
               <button 
                 onClick={onStart}
                 disabled={isGenerating}
                 className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xl font-bold py-3 px-6 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
               >
                 {isGenerating ? <RefreshCw className="animate-spin" /> : <>🎮 繼續練習生字 <ArrowRight size={20}/></>}
               </button>

               <button 
                 onClick={onReviewLesson}
                 className="w-full bg-white hover:bg-gray-50 text-indigo-600 border-2 border-indigo-200 font-bold py-3 px-6 rounded-xl shadow-sm transform transition active:scale-95 flex items-center justify-center gap-2"
               >
                 <PlayCircle size={20} /> 重新聽課文
               </button>

               <button 
                 onClick={onExitLesson}
                 className="w-full text-gray-400 hover:text-red-500 font-bold py-2 px-6 rounded-xl text-sm flex items-center justify-center gap-1 mt-2"
               >
                 <XCircle size={16} /> 結束這一課，回到自由模式
               </button>
            </div>
          </div>
        ) : (
          /* Standard Menu */
          <>
            <p className="text-gray-500 mb-8 text-lg">今天想學什麼字呢？</p>
            <div className="space-y-4 mb-4">
                <button 
                  onClick={onLessonMode}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-2xl font-bold py-4 px-8 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <BookOpen size={28} /> 課文模式
                </button>

                <button 
                  onClick={onZhuyinMode}
                  disabled={isGenerating}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white text-2xl font-bold py-4 px-8 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : "認識注音"}
                </button>

                <button 
                  onClick={onStart}
                  disabled={isGenerating}
                  className="w-full bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 px-8 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : "自由練習"}
                </button>

                <button
                  onClick={onEnglishMode}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white text-2xl font-bold py-4 px-8 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="font-english">ABC</span> 英文大冒險
                </button>
            </div>
          </>
        )}

        {reviewCount > 0 && (
          <button
            onClick={onReviewMode}
            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 border-2 border-orange-300 text-xl font-bold py-3 rounded-2xl mb-4 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw size={22} /> 複習時間
            <span className="bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">{reviewCount} 個字</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
           <button 
             onClick={onShop}
             className="relative w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xl font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-1"
           >
             <Gift /> 
             <span className="text-lg">商店</span>
             {milestonesAvailable > 0 && (
               <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow animate-bounce">🎁 可以選卡</span>
             )}
           </button>

           <button 
             onClick={onLeaderboard}
             className="w-full bg-orange-400 hover:bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-1"
           >
             <Trophy />
             <span className="text-lg">榮譽榜</span>
           </button>
        </div>

        {/* Physical Reward Button */}
        <button 
          onClick={() => setShowRewardModal(true)}
          className="w-full bg-white hover:bg-indigo-50 text-indigo-500 border-2 border-indigo-200 border-dashed text-lg font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition"
        >
           <QrCode size={20} /> 實體任務兌換
        </button>

        <button
          onClick={onParentReport}
          className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition"
        >
           <ClipboardList size={20} /> 家長專區：學習週報
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-4 max-w-md">
        國語錄音與注音：教育部《國語注音符號手冊》開放部件（CC BY 4.0）、教育部《國語辭典簡編本》經萌典提供（CC BY-ND 3.0 TW）<br />
        英文語音：Kokoro-82M 產生（Apache-2.0）・國字筆畫：Make Me a Hanzi / hanzi-writer-data（Arphic Public License）
      </p>
    </div>
  );
};
