import React, { useEffect, useState } from 'react';
import { Home, Gamepad2, Volume2 } from 'lucide-react';
import { ZHUYIN_SYMBOLS, TONES, ZhuyinSymbol } from '../zhuyin/symbols';
import { getWordReading } from '../services/moedict';
import { playChineseAudio, playZhuyinSymbol, stopChineseAudio } from '../utils/chineseAudio';

interface ZhuyinIntroViewProps {
  onBack: () => void;
  onStartGame: () => void;
}

const ZHUYIN_CATEGORIES: { title: string; hint: string; group: ZhuyinSymbol['group']; color: string; borderColor: string }[] = [
  { title: '聲母', hint: '放在最前面的聲音', group: 'initial', color: 'bg-blue-100 text-blue-800 border-blue-200', borderColor: 'border-blue-200' },
  { title: '介母', hint: '可以夾在中間的聲音', group: 'medial', color: 'bg-green-100 text-green-800 border-green-200', borderColor: 'border-green-200' },
  { title: '韻母', hint: '放在後面的聲音', group: 'final', color: 'bg-orange-100 text-orange-800 border-orange-200', borderColor: 'border-orange-200' },
];

export const ZhuyinIntroView: React.FC<ZhuyinIntroViewProps> = ({ onBack, onStartGame }) => {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  useEffect(() => () => stopChineseAudio(), []);

  const handleSymbol = (symbol: string) => {
    setActiveSymbol(symbol);
    playZhuyinSymbol(symbol, true); // 「ㄇ…貓」
  };

  const handleTone = async (example: string, zhuyin: string) => {
    setActiveSymbol(zhuyin);
    const reading = await getWordReading(example, { override: zhuyin });
    playChineseAudio([{ url: reading.audioUrl, text: example }]);
  };

  const leave = (action: () => void) => {
    stopChineseAudio();
    action();
  };

  return (
    <div className="min-h-screen bg-indigo-50 p-4 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border-b-8 border-indigo-200 mt-4 relative flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-6 gap-2">
          <button
             onClick={() => leave(onBack)}
             className="px-5 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 font-bold transition shadow-sm border-2 border-gray-200 flex items-center gap-2 transform active:scale-95"
          >
             <Home size={24} /> 回首頁
          </button>

          <div className="hidden sm:flex bg-indigo-100 text-indigo-800 px-6 py-2 rounded-full text-lg font-bold items-center gap-2">
            <Volume2 size={20} /> 點符號聽老師唸
          </div>

          <button
             onClick={() => leave(onStartGame)}
             className="px-5 py-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 text-white font-bold transition shadow-sm border-2 border-indigo-600 flex items-center gap-2 transform active:scale-95"
          >
             <Gamepad2 size={24} /> 去玩遊戲
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-center text-indigo-900 mb-2">認識注音符號</h1>
        <p className="text-center text-gray-500 mb-8">每個符號都有一張圖，唸唸看，圖片裡藏著這個聲音喔！</p>

        <div className="space-y-8">
          {ZHUYIN_CATEGORIES.map(category => (
            <div key={category.group} className={`p-6 rounded-2xl border-2 ${category.color} bg-opacity-30`}>
              <h2 className="text-2xl font-bold mb-4">
                {category.title} <span className="text-base font-bold opacity-60">{category.hint}</span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {ZHUYIN_SYMBOLS.filter(item => item.group === category.group).map(item => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSymbol(item.symbol)}
                    className={`
                      w-16 h-20 md:w-20 md:h-24 flex flex-col items-center justify-center rounded-xl shadow-sm
                      bg-white hover:scale-110 transition-transform active:scale-95 border-2 ${category.borderColor}
                      ${activeSymbol === item.symbol ? 'ring-4 ring-yellow-300 scale-110' : ''}
                    `}
                  >
                    <span className="text-3xl md:text-4xl font-bold leading-none">{item.symbol}</span>
                    <span className="text-xl md:text-2xl mt-1" title={item.example}>{item.exampleEmoji}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Tones */}
          <div className="p-6 rounded-2xl border-2 bg-purple-100 text-purple-800 border-purple-200 bg-opacity-30">
            <h2 className="text-2xl font-bold mb-1">聲調 <span className="text-base font-bold opacity-60">同一個聲音，音調不一樣，意思就不一樣</span></h2>
            <p className="text-sm font-bold opacity-70 mb-4">一聲不用寫符號喔！</p>
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {TONES.map(tone => (
                <button
                  key={tone.mark}
                  onClick={() => handleTone(tone.example, tone.exampleZhuyin)}
                  className={`bg-white rounded-xl border-2 border-purple-200 py-3 flex flex-col items-center shadow-sm hover:scale-105 active:scale-95 transition-transform
                    ${activeSymbol === tone.exampleZhuyin ? 'ring-4 ring-yellow-300' : ''}`}
                >
                  <span className="text-3xl md:text-4xl font-bold text-gray-800">{tone.example}</span>
                  <span className="text-sm md:text-lg font-bold text-purple-700 whitespace-nowrap">{tone.exampleZhuyin}</span>
                  <span className="text-xs md:text-sm font-bold text-gray-500 mt-1">{tone.name} {tone.mark === 'ˉ' ? '' : tone.mark}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
          注音符號錄音：2017 © 教育部，國語注音符號手冊-開放部件（<a className="underline" href="https://creativecommons.org/licenses/by/4.0/deed.zh_TW" target="_blank" rel="noreferrer">CC BY 4.0</a>）<br />
          詞語錄音與注音：教育部《國語辭典簡編本》《重編國語辭典修訂本》，經萌典 moedict.tw 取得（<a className="underline" href="https://creativecommons.org/licenses/by-nd/3.0/tw/" target="_blank" rel="noreferrer">CC BY-ND 3.0 TW</a>）
        </p>
      </div>
    </div>
  );
};
