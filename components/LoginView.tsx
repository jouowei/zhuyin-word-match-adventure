import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Plus, Key, Gamepad2, Sparkles } from 'lucide-react';
import { playSound } from '../utils/sound';
import { companionOf } from '../services/companions';
import { journeyPosition } from '../services/journey';

interface LoginViewProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onCreateUser: (name: string, avatar: string) => void;
}

/** Where the player is on the trip around Taiwan, so a child finds their own card: 「🐻 在臺中」. */
const tripLine = (user: UserProfile) => {
  if (!user.companion || user.journeySeen === undefined) return '還沒出發';
  return `${companionOf(user).emoji} 在${journeyPosition(user.journeyLegs).place.name}`;
};

// Players are deleted in 家長專區, out of reach of a child's tap
export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin, onCreateUser }) => {
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('🐯');

  const avatars = ['🐯', '🐰', '🐼', '🦊', '🦁', '🐸', '🦄', '🦖'];

  const handleCreateSubmit = () => {
    if (newUserName.trim()) {
      onCreateUser(newUserName.trim(), newUserAvatar);
      setIsCreatingUser(false);
      setNewUserName('');
    }
  };

  const renderBackgroundParticles = () => {
     const elements = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', '⭐', '☁️', '☀️', '🎈'];
     return (
       <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {elements.map((el, i) => (
             <div
               key={i}
               className="absolute opacity-40 text-white font-bold animate-float-particle"
               style={{
                  left: `${Math.random() * 100}%`,
                  fontSize: `${Math.random() * 3 + 1}rem`,
                  animationDuration: `${Math.random() * 10 + 10}s`,
                  animationDelay: `${Math.random() * 5}s`
               }}
             >
               {el}
             </div>
          ))}
       </div>
     );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-indigo-300 to-purple-300 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {renderBackgroundParticles()}

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">

        {typeof window !== 'undefined' && window.localStorage.getItem('gemini_api_key') && (
          <div className="absolute top-0 right-0 text-white opacity-50" title="API Key is configured">
             <Key size={16} />
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-8 relative group cursor-pointer" onClick={() => playSound('pop')}>
           <div className="absolute inset-0 bg-white blur-3xl opacity-30 rounded-full animate-pulse"></div>
           <div className="relative text-[8rem] md:text-[10rem] animate-float drop-shadow-2xl z-20 flex justify-center items-center h-48">
              <div className="absolute -left-4 animate-wiggle" style={{animationDelay: '0.5s'}}>🚀</div>
              <div className="absolute top-8 right-4 text-6xl animate-bounce" style={{animationDelay: '1s'}}>🦁</div>
              <div className="absolute bottom-0 left-8 text-5xl animate-bounce" style={{animationDelay: '0.2s'}}>⭐</div>
           </div>
           <div className="relative z-30 mt-4 text-center">
              <h1 className="text-5xl md:text-6xl font-black text-black tracking-wider text-stroke animate-pop">
                認字大冒險
              </h1>
              <div className="bg-white/30 backdrop-blur-sm rounded-full px-6 py-2 mt-2 inline-block">
                <p className="text-blue-900 font-bold text-lg flex items-center gap-2">
                  <Sparkles className="text-yellow-300" /> 準備好出發了嗎？ <Sparkles className="text-yellow-300" />
                </p>
              </div>
           </div>
        </div>

        {/* User Selection Box */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl w-full border-4 border-white animate-pop" style={{animationDelay: '0.2s'}}>

          <h2 className="text-2xl font-bold text-center text-indigo-800 mb-6 flex items-center justify-center gap-2">
             <Gamepad2 className="text-indigo-500" /> 選擇你的角色
          </h2>

          {!isCreatingUser ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onLogin(user)}
                    className="group relative flex flex-col items-center justify-center gap-1 px-2 py-4 min-h-[170px] rounded-2xl bg-indigo-50 border-4 border-indigo-100 hover:border-indigo-400 hover:bg-white hover:shadow-lg transition-all active:scale-95"
                  >
                    <span className="absolute top-2 right-2 text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⭐ {user.points}</span>
                    <span className="text-6xl leading-none drop-shadow-md group-hover:scale-110 transition-transform">{user.avatar}</span>
                    <span className="font-black text-gray-800 text-xl mt-1 max-w-full truncate">{user.name}</span>
                    <span className="text-sm font-bold text-indigo-500">{tripLine(user)}</span>
                  </button>
                ))}
              </div>

              {/* Adding a player is for the grown-up: a slim button under the children's cards */}
              <button
                onClick={() => setIsCreatingUser(true)}
                className={`flex items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-all active:scale-95 font-bold ${users.length ? 'py-2.5' : 'py-8 text-lg'}`}
              >
                <Plus size={users.length ? 22 : 36} /> 新玩家
              </button>

              {users.length === 0 && (
                <div className="text-center text-gray-500 py-4 italic">
                  還沒有勇者報到，建立一個吧！
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-pop">
              <div>
                <label className="block text-indigo-800 font-bold mb-2">你的名字：</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="輸入名字"
                  className="w-full text-2xl p-3 border-4 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none text-center bg-indigo-50 placeholder-indigo-300 text-gray-900 font-black"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-indigo-800 font-bold mb-2">選擇頭像：</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {avatars.map(av => (
                    <button
                      key={av}
                      onClick={() => setNewUserAvatar(av)}
                      className={`text-4xl p-2 rounded-2xl border-4 transition-all transform hover:scale-110 ${newUserAvatar === av ? 'bg-yellow-100 border-yellow-400 scale-110 shadow-lg' : 'border-transparent hover:bg-gray-100'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setIsCreatingUser(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSubmit}
                  disabled={!newUserName.trim()}
                  className={`flex-1 font-bold py-3 rounded-xl text-white shadow-md transform transition active:scale-95 ${newUserName.trim() ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="absolute bottom-2 text-indigo-900/70 text-sm font-bold text-center w-full z-10 drop-shadow-sm px-4">
         進度會自動儲存在這臺裝置上 💾
      </p>

    </div>
  );
};