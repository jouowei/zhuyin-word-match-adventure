import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Plus, LogOut, CheckCircle, Key, Gamepad2, Sparkles, Star, Trash2, AlertTriangle } from 'lucide-react';
import { playSound } from '../utils/sound';
import { ParentUnlock } from './ParentLock';

interface LoginViewProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onCreateUser: (name: string, avatar: string) => void;
  onDeleteUser: (userId: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin, onCreateUser, onDeleteUser }) => {
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('🐯');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  // Deleting a player needs the parent password first
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);

  const avatars = ['🐯', '🐰', '🐼', '🦊', '🦁', '🐸', '🦄', '🦖'];

  const handleCreateSubmit = () => {
    if (newUserName.trim()) {
      onCreateUser(newUserName.trim(), newUserAvatar);
      setIsCreatingUser(false);
      setNewUserName('');
    }
  };

  const closeDelete = () => {
    setUserToDelete(null);
    setDeleteUnlocked(false);
  };

  const handleDeleteSubmit = () => {
    if (userToDelete && deleteUnlocked) {
      onDeleteUser(userToDelete.id);
      closeDelete();
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
              <div className="grid grid-cols-2 gap-4 mb-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {users.map(user => (
                  <div key={user.id} className="relative group">
                    <button
                      onClick={() => onLogin(user)}
                      className="w-full h-full flex flex-col items-center p-4 rounded-2xl bg-indigo-50 border-4 border-indigo-100 hover:border-indigo-400 hover:bg-white hover:shadow-lg transition-all transform active:scale-95 z-10"
                    >
                      <div className="text-5xl mb-2 group-hover:scale-125 transition-transform duration-300 drop-shadow-md">{user.avatar}</div>
                      <div className="font-bold text-gray-700 text-lg">{user.name}</div>
                      <div className="absolute top-2 right-2 text-xs text-white font-bold bg-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={10} className="fill-yellow-300 text-yellow-300" /> {Math.floor(user.points / 100) + 1}
                      </div>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserToDelete(user);
                        setDeleteUnlocked(false);
                      }}
                      className="absolute top-2 left-2 p-1.5 bg-red-100 text-red-500 rounded-full opacity-60 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-20 hover:scale-110"
                      title="刪除角色"
                    >
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border-4 border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-all active:scale-95 min-h-[140px]"
                >
                  <Plus size={48} />
                  <span className="font-bold mt-2">新玩家</span>
                </button>
              </div>

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
      
      <p className="absolute bottom-4 text-indigo-900/70 text-sm font-bold text-center w-full z-10 drop-shadow-sm">
         進度會自動儲存在這台裝置上 💾
      </p>

      {/* Delete: parent password, then confirm */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-red-100 relative my-auto">
            {!deleteUnlocked ? (
              <div className="flex flex-col items-center gap-3">
                <ParentUnlock
                  title={`刪除 ${userToDelete.name}`}
                  subtitle="刪除角色要請爸爸媽媽輸入家長密碼"
                  onUnlock={() => setDeleteUnlocked(true)}
                />
                <button onClick={closeDelete} className="text-gray-400 text-sm underline">取消</button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">刪除 {userToDelete.avatar} {userToDelete.name}？</h3>
                <p className="text-gray-500 mb-6 font-bold text-sm">
                  刪除後，所有的積分、卡片和學習紀錄都會消失<br/>無法復原喔！
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={closeDelete}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteSubmit}
                    className="flex-1 py-3 font-bold rounded-xl text-white transition-all flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 shadow-lg hover:scale-105"
                  >
                    <Trash2 size={18} />
                    確認刪除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};