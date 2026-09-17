
import React from 'react';
import { UserProfile } from '../types';
import { Home, Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardViewProps {
  users: UserProfile[];
  onBack: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ users, onBack }) => {
  // Only take top 3 for the podium
  const topPlayers = [...users].sort((a, b) => b.points - a.points).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <button 
            onClick={onBack} 
            className="px-5 py-2 bg-white rounded-full shadow-md text-gray-600 hover:scale-105 transition-transform font-bold flex items-center gap-2 border border-gray-200"
          >
            <Home size={24} /> 回首頁
          </button>
          <h1 className="text-3xl font-black text-yellow-800 flex items-center gap-2">
            <Trophy className="text-yellow-600" />
            榮譽榜
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-6 mt-8">
          {topPlayers.map((player, index) => {
            let rankColor = '';
            let ringColor = '';
            let icon = null;
            let scale = '';

            if (index === 0) {
              rankColor = 'bg-yellow-400 text-yellow-900 border-yellow-500';
              ringColor = 'ring-yellow-300';
              icon = <Crown size={32} className="text-yellow-500 absolute -top-5 -right-2 animate-bounce" fill="currentColor" />;
              scale = 'scale-105 z-10';
            } else if (index === 1) {
              rankColor = 'bg-gray-300 text-gray-800 border-gray-400';
              ringColor = 'ring-gray-200';
              icon = <Medal size={28} className="text-gray-400 absolute -top-3 -right-2" />;
              scale = 'scale-100';
            } else if (index === 2) {
              rankColor = 'bg-orange-300 text-orange-900 border-orange-400';
              ringColor = 'ring-orange-200';
              icon = <Medal size={28} className="text-orange-400 absolute -top-3 -right-2" />;
              scale = 'scale-95';
            }

            return (
              <div 
                key={player.id}
                className={`
                  relative bg-white p-5 rounded-3xl shadow-xl flex items-center gap-5 transform transition-all border-b-4
                  ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-300' : 'border-orange-300'}
                  ${scale}
                `}
              >
                {icon}
                
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shadow-inner border-2 border-white ring-4 ${ringColor} ${rankColor}
                `}>
                  {index + 1}
                </div>
                
                <div className="text-5xl drop-shadow-sm">{player.avatar}</div>
                
                <div className="flex-1">
                  <div className="font-black text-xl text-gray-800 truncate">{player.name}</div>
                  <div className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                    Lv.{Math.floor(player.points / 100) + 1} 冒險家
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="font-black text-3xl text-yellow-600 tracking-tighter">{player.points}</span>
                  <span className="text-xs text-yellow-800 font-bold">POINTS</span>
                </div>
              </div>
            );
          })}

          {topPlayers.length === 0 && (
             <div className="bg-white/50 rounded-3xl p-10 text-center border-2 border-dashed border-gray-300">
               <div className="text-6xl mb-4 grayscale opacity-50">🏆</div>
               <p className="text-gray-500 font-bold text-lg">
                 還沒有人上榜喔！<br/>快去玩遊戲賺積分！
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
