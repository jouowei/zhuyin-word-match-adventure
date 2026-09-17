
import React, { useState } from 'react';
import { UserProfile, Lesson } from '../types';
import { Star, Gift, RefreshCw, Trophy, LogOut, BookOpen, ArrowRight, XCircle, PlayCircle, QrCode, RotateCcw, ClipboardList } from 'lucide-react';
import { ParentRewardModal } from './ParentRewardModal';
import { LevelStars } from './LevelStars';
import { SpeakButton, useInstruction } from './VoiceGuide';

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
  // The menu is all words, so it says what to do and every button has a speaker
  useInstruction('menu', `嗨，${currentUser.name}！想玩什麼呢？點按鈕旁邊的喇叭，可以聽聽看是什麼。`);
  const freeSpins = currentUser.freeSpins || 0;

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
               <div className="relative">
                 <button
                   onClick={onStart}
                   disabled={isGenerating}
                   className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xl font-bold py-3 pl-6 pr-16 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                 >
                   {isGenerating ? <RefreshCw className="animate-spin" /> : <>🎮 繼續練習生字 <ArrowRight size={20}/></>}
                 </button>
                 <SpeakButton text="繼續練習生字：玩遊戲，練習這一課的字。" className="absolute right-2 top-1/2 -translate-y-1/2" />
               </div>

               <div className="relative">
                 <button
                   onClick={onReviewLesson}
                   className="w-full bg-white hover:bg-gray-50 text-indigo-600 border-2 border-indigo-200 font-bold py-3 pl-6 pr-16 rounded-xl shadow-sm transform transition active:scale-95 flex items-center justify-center gap-2"
                 >
                   <PlayCircle size={20} /> 重新聽課文
                 </button>
                 <SpeakButton text="重新聽課文：再聽一次這一課的課文。" className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-50" />
               </div>

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
                <div className="relative">
                  <button
                    onClick={onLessonMode}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-2xl font-bold py-4 pl-4 pr-16 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-4xl">📖</span> 課文模式
                  </button>
                  <SpeakButton text="課文模式：跟著課本的課文，認識裡面的字。" className="absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative">
                  <button
                    onClick={onZhuyinMode}
                    disabled={isGenerating}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white text-2xl font-bold py-4 pl-4 pr-16 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? <RefreshCw className="animate-spin" /> : <><span className="text-2xl font-black bg-white text-purple-600 rounded-xl px-2 py-0.5 leading-tight">ㄅㄆㄇ</span> 認識注音</>}
                  </button>
                  <SpeakButton text="認識注音：學注音符號，玩注音遊戲。" className="absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative">
                  <button
                    onClick={onStart}
                    disabled={isGenerating}
                    className="w-full bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 pl-4 pr-16 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? <RefreshCw className="animate-spin" /> : <><span className="text-4xl">🎮</span> 自由練習</>}
                  </button>
                  <SpeakButton text="自由練習：選一個遊戲，練習認字。" className="absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative">
                  <button
                    onClick={onEnglishMode}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white text-2xl font-bold py-4 pl-4 pr-16 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl font-english font-black bg-white text-pink-600 rounded-xl px-2 py-0.5 leading-tight">ABC</span> 英文大冒險
                  </button>
                  <SpeakButton text="英文大冒險：學英文字母和英文單字。" className="absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>
          </>
        )}

        {reviewCount > 0 && (
          <div className="relative mb-4">
            <button
              onClick={onReviewMode}
              className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 border-2 border-orange-300 text-xl font-bold py-3 pl-4 pr-16 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              <RotateCcw size={22} /> 複習時間
              <span className="bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">{reviewCount} 個字</span>
            </button>
            <SpeakButton text={`複習時間：有 ${reviewCount} 個字要再練習一次。`} className="absolute right-2 top-1/2 -translate-y-1/2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="relative">
             <button
               onClick={onShop}
               className="relative w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xl font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-1"
             >
               <span className="text-4xl">🎁</span>
               <span className="text-lg">商店</span>
               {(milestonesAvailable > 0 || freeSpins > 0) && (
                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow animate-bounce">
                   {freeSpins > 0 ? '🎰 免費轉蛋' : '🎁 可以選卡'}
                 </span>
               )}
             </button>
             <SpeakButton
               text={freeSpins > 0 ? '商店：你有免費轉蛋，快去轉轉看！' : '商店：用星星換卡片，也可以轉轉蛋。'}
               className="absolute left-1 top-1 w-9 h-9"
               size={18}
             />
           </div>

           <div className="relative">
             <button
               onClick={onLeaderboard}
               className="w-full bg-orange-400 hover:bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center gap-1"
             >
               <span className="text-4xl">🏆</span>
               <span className="text-lg">榮譽榜</span>
             </button>
             <SpeakButton text="榮譽榜：看看大家得到幾顆星星。" className="absolute left-1 top-1 w-9 h-9" size={18} />
           </div>
        </div>

        {/* Physical Reward Button */}
        <div className="relative">
          <button
            onClick={() => setShowRewardModal(true)}
            className="w-full bg-white hover:bg-indigo-50 text-indigo-500 border-2 border-indigo-200 border-dashed text-lg font-bold py-3 pl-4 pr-14 rounded-2xl flex items-center justify-center gap-2 transition"
          >
             <QrCode size={20} /> 實體任務兌換
          </button>
          <SpeakButton text="實體任務兌換：完成爸爸媽媽給的任務，請爸爸媽媽幫你換星星。" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-50" size={18} />
        </div>

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
