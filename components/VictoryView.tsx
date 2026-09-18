import React from 'react';

interface VictoryViewProps {
  onHome: () => void;
  onReplay: () => void;
  homeLabel?: string;
}

export const VictoryView: React.FC<VictoryViewProps> = ({ onHome, onReplay, homeLabel = '回遊樂場' }) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] bg-yellow-50 p-4 overflow-hidden select-none">
      <div className="text-[clamp(5rem,18vh,8rem)] leading-none mb-4 animate-bounce">🏆</div>
      <h1 className="text-5xl font-bold text-yellow-600 mb-4 text-center">太厲害了！</h1>
      <p className="text-2xl text-gray-600 mb-8">挑戰成功！</p>

      <div className="relative z-10 flex gap-4">
        <button 
          onClick={onHome}
          className="bg-white border-4 border-gray-300 hover:bg-gray-50 text-gray-600 text-xl font-bold py-4 px-8 rounded-2xl shadow-lg"
        >
          {homeLabel}
        </button>
        <button 
          onClick={onReplay}
          className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-4 px-8 rounded-2xl shadow-lg animate-breathe"
        >
          再玩一次
        </button>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute text-4xl animate-float" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.5
          }}>
            {['🎉', '✨', '⭐', '🎈'][i % 4]}
          </div>
        ))}
      </div>
    </div>
  );
};