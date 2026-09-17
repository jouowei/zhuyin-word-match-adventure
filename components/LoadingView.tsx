
import React, { useEffect, useState } from 'react';
import { Palette, Sparkles, Ear, Gift, Rocket, Star, Zap } from 'lucide-react';

export const LoadingView: React.FC = () => {
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  // Message Cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingPhase(p => (p + 1) % 5);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Simulated Progress Bar
  useEffect(() => {
    // Start fast, then slow down to create "work is being done" feeling
    const timer = setInterval(() => {
      setProgress(old => {
        if (old >= 95) return old; // Cap at 95% until real load finishes
        // Slower as it gets higher to manage expectations
        const increment = Math.max(0.5, (95 - old) / 15); 
        return Math.min(95, old + increment);
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const messages = [
    "AI 機器人正在畫畫...",
    "正在找最酷的 Emoji...",
    "加上一點魔法粉末...",
    "快要完成囉...",
    "準備好開始了嗎！"
  ];
  
  const colors = ["bg-red-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-purple-400"];
  const icons = [
    <Palette size={64} className="text-red-500 animate-bounce" />,
    <Sparkles size={64} className="text-yellow-500 animate-spin-slow" />,
    <Rocket size={64} className="text-green-500 animate-pulse" />,
    <Gift size={64} className="text-blue-500 animate-bounce" />,
    <Zap size={64} className="text-purple-500 animate-wiggle" />
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
         {/* Orbiting Particles */}
         <div className="absolute w-full h-full animate-spin-slow opacity-30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-400 rounded-full"></div>
         </div>
         <div className="absolute w-3/4 h-3/4 animate-spin-slow opacity-30 animation-delay-500" style={{animationDirection: 'reverse'}}>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full"></div>
         </div>

         {/* Center Icon */}
         <div className={`absolute inset-0 rounded-full opacity-20 animate-ping duration-[2s] ${colors[loadingPhase]}`}></div>
         <div className="absolute inset-4 bg-white rounded-full shadow-2xl flex items-center justify-center border-[12px] border-white/50 backdrop-blur-sm">
            {icons[loadingPhase]}
         </div>
      </div>

      <h2 className="text-3xl font-black text-indigo-600 animate-pulse text-center mb-6 min-h-[48px] drop-shadow-sm">
        {messages[loadingPhase]}
      </h2>
      
      {/* Progress Bar Container */}
      <div className="w-80 h-8 bg-white rounded-full overflow-hidden border-4 border-indigo-100 shadow-inner relative">
         {/* Striped Background Pattern */}
         <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '20px 20px'}}></div>
         
         {/* Fill */}
         <div 
           className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 transition-all duration-200 ease-out relative" 
           style={{width: `${progress}%`}}
         >
            <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/50 animate-pulse"></div>
         </div>
      </div>
      
      <div className="flex items-center justify-between w-80 mt-2 px-2">
         <span className="text-indigo-400 font-bold text-xs">載入中</span>
         <span className="text-indigo-600 font-black text-lg">{Math.round(progress)}%</span>
      </div>
      
      <div className="mt-12 bg-white/60 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/50 shadow-sm animate-float">
         <p className="text-indigo-800/60 font-bold text-sm flex items-center gap-2">
           <Star size={16} className="fill-yellow-400 text-yellow-400" />
           你知道嗎？多玩幾次，載入會變快喔！
         </p>
      </div>
    </div>
  );
};
