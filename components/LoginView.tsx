import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Plus, Key } from 'lucide-react';
import { playSound } from '../utils/sound';
import { COMPANIONS, companionOf } from '../services/companions';
import { journeyPosition } from '../services/journey';
import { WHATS_NEW_VERSION, WhatsNewDialog, whatsNewSeen } from './WhatsNewDialog';

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

/**
 * The start screen: a watercolor cover (public/journey/cover-*.jpg, drawn like the trip's pictures) with the title in
 * the sky and the players' cards over the fields. Players are deleted in 家長專區, out of reach of a child's tap.
 */
export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin, onCreateUser }) => {
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('🐯');
  const [showNews, setShowNews] = useState(() => !whatsNewSeen());

  const avatars = ['🐯', '🐰', '🐼', '🦊', '🦁', '🐸', '🦄', '🦖'];

  const handleCreateSubmit = () => {
    if (newUserName.trim()) {
      onCreateUser(newUserName.trim(), newUserAvatar);
      setIsCreatingUser(false);
      setNewUserName('');
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f3f1e7] flex flex-col items-center">
      <picture className="absolute inset-0 pointer-events-none">
        <source media="(orientation: landscape)" srcSet="/journey/cover-wide.jpg" />
        <img src="/journey/cover-tall.jpg" alt="" className="w-full h-full object-cover" />
      </picture>

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col items-center justify-between gap-4 px-4 pt-[max(5vh,1.25rem)] pb-3 landscape:sm:max-w-4xl landscape:sm:flex-row landscape:sm:justify-center landscape:sm:gap-8">
        {typeof window !== 'undefined' && window.localStorage.getItem('gemini_api_key') && (
          <div className="absolute top-2 right-3 text-stone-500/60" title="API Key is configured">
            <Key size={16} />
          </div>
        )}

        <header className="text-center cursor-pointer landscape:sm:flex-1" onClick={() => playSound('pop')}>
          <h1 className="font-bpmf whitespace-nowrap text-[clamp(2.4rem,11vw,3.6rem)] landscape:sm:text-[clamp(2rem,7vh,3rem)] text-[#46392b] tracking-wide [text-shadow:0_2px_0_rgba(255,255,255,0.9)]">
            認字大冒險
          </h1>
          <div className="mt-1 flex justify-center gap-[clamp(0.5rem,3vw,1rem)] text-[clamp(1.9rem,8vw,2.6rem)] leading-none" aria-hidden>
            {COMPANIONS.map((c, i) => (
              <span key={c.id} className="animate-bob" style={{ animationDelay: `${i * 0.3}s` }}>{c.emoji}</span>
            ))}
          </div>
          <p className="mt-3 inline-block bg-white/75 rounded-full px-4 py-1 text-lg font-black text-[#6b5a3e]">準備好出發了嗎？</p>
        </header>

        {/* The players */}
        <div className="w-full bg-[#fffdf7]/90 backdrop-blur-sm p-5 rounded-3xl shadow-xl border-2 border-white animate-pop landscape:sm:w-[26rem] landscape:sm:shrink-0">
          <h2 className="text-2xl font-black text-center text-[#5b4a32] mb-4">選擇你的角色</h2>

          {!isCreatingUser ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onLogin(user)}
                    className="group relative flex flex-col items-center justify-center gap-1 px-2 py-4 min-h-[150px] rounded-2xl bg-amber-50/80 border-4 border-amber-100 hover:border-amber-300 hover:bg-white hover:shadow-lg transition-all active:scale-95"
                  >
                    <span className="absolute top-2 right-2 text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⭐ {user.points}</span>
                    <span className="text-6xl leading-none drop-shadow-md group-hover:scale-110 transition-transform">{user.avatar}</span>
                    <span className="font-black text-gray-800 text-xl mt-1 max-w-full truncate">{user.name}</span>
                    <span className="text-sm font-bold text-amber-700">{tripLine(user)}</span>
                  </button>
                ))}
              </div>

              {/* Adding a player is for the grown-up: a slim button under the children's cards */}
              <button
                onClick={() => setIsCreatingUser(true)}
                className={`flex items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-stone-300 text-stone-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all active:scale-95 font-bold ${users.length ? 'py-2.5' : 'py-8 text-lg'}`}
              >
                <Plus size={users.length ? 22 : 36} /> 新玩家
              </button>

              {users.length === 0 && (
                <div className="text-center text-stone-500 font-bold py-2">
                  還沒有勇者報到，建立一個吧！
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-pop">
              <div>
                <label className="block text-[#5b4a32] font-bold mb-2">你的名字：</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="輸入名字"
                  className="w-full text-2xl p-3 border-4 border-amber-200 rounded-xl focus:border-amber-400 outline-none text-center bg-amber-50 placeholder-amber-300 text-gray-900 font-black"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[#5b4a32] font-bold mb-2">選擇頭像：</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {avatars.map(av => (
                    <button
                      key={av}
                      onClick={() => setNewUserAvatar(av)}
                      className={`text-4xl p-2 rounded-2xl border-4 transition-all transform hover:scale-110 ${newUserAvatar === av ? 'bg-yellow-100 border-yellow-400 scale-110 shadow-lg' : 'border-transparent hover:bg-amber-50'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setIsCreatingUser(false)}
                  className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-600 font-bold py-3 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSubmit}
                  disabled={!newUserName.trim()}
                  className={`flex-1 font-bold py-3 rounded-xl text-white shadow-md transform transition active:scale-95 ${newUserName.trim() ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="hide-on-short-screen relative z-10 mb-2 mx-4 bg-white/75 rounded-full px-4 py-1 text-center text-sm font-bold text-[#5b4a32]">
        進度會自動儲存在這臺裝置上 💾
        <button onClick={() => setShowNews(true)} className="ml-2 underline underline-offset-2 hover:text-[#2f261a]">
          {WHATS_NEW_VERSION} 版新功能
        </button>
      </p>

      {showNews && <WhatsNewDialog returning={users.length > 0} onClose={() => setShowNews(false)} />}
    </div>
  );
};
