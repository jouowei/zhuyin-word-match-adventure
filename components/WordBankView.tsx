
import React, { useState } from 'react';
import { Home, Plus, X, RotateCcw, Save } from 'lucide-react';
import { VOCABULARY_LIST } from '../constants';

interface WordBankViewProps {
  currentVocabulary: string[];
  onSave: (newVocabulary: string[]) => void;
  onBack: () => void;
}

export const WordBankView: React.FC<WordBankViewProps> = ({ currentVocabulary, onSave, onBack }) => {
  const [words, setWords] = useState<string[]>(currentVocabulary);
  const [newWord, setNewWord] = useState('');

  const handleAddWord = () => {
    const trimmed = newWord.trim();
    if (trimmed && !words.includes(trimmed)) {
      setWords(prev => [trimmed, ...prev]);
      setNewWord('');
    }
  };

  const handleDeleteWord = (wordToDelete: string) => {
    if (window.confirm(`確定要刪除「${wordToDelete}」嗎？`)) {
      setWords(prev => prev.filter(w => w !== wordToDelete));
    }
  };

  const handleReset = () => {
    if (window.confirm("確定要將字庫重置為預設設定嗎？你新增的字都會不見喔！")) {
      setWords([...VOCABULARY_LIST]);
    }
  };

  const handleSave = () => {
    onSave(words);
    onBack();
  };

  return (
    <div className="min-h-screen bg-indigo-50 p-4 flex flex-col">
       {/* Header */}
       <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-indigo-100 flex items-center justify-between mb-4 sticky top-0 z-10">
          <button 
            onClick={onBack} 
            className="px-4 py-2 hover:bg-gray-100 rounded-xl text-gray-600 font-bold transition flex items-center gap-2 border border-gray-200"
          >
             <Home size={20} /> <span className="text-sm">回首頁</span>
          </button>
          <h2 className="text-xl font-bold text-indigo-800">✏️ 設定題目字庫</h2>
          <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2">
             <Save size={18} /> 儲存
          </button>
       </div>

       <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-4">
          
          {/* Add Word Section */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
             <label className="block text-sm font-bold text-gray-600 mb-2">新增字詞 (例如：恐龍、蛋糕)</label>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                  placeholder="輸入想學的字..."
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-lg focus:border-indigo-400 outline-none"
                />
                <button 
                  onClick={handleAddWord}
                  disabled={!newWord.trim()}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white p-3 rounded-xl font-bold shadow-sm"
                >
                  <Plus />
                </button>
             </div>
          </div>

          {/* Word List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm flex-1">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">目前題庫 ({words.length} 個)</h3>
                <button 
                  onClick={handleReset}
                  className="text-sm text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1 transition"
                >
                  <RotateCcw size={14} /> 重置為預設
                </button>
             </div>
             
             <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto content-start p-1">
                {words.map((word) => (
                   <div key={word} className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 border border-blue-100 group">
                      {word}
                      <button 
                        onClick={() => handleDeleteWord(word)}
                        className="text-blue-300 hover:text-red-500 transition-colors bg-white rounded-full p-0.5"
                      >
                         <X size={14} />
                      </button>
                   </div>
                ))}
                {words.length === 0 && (
                   <div className="w-full text-center text-gray-400 py-8">
                      目前沒有字詞，趕快新增一些吧！
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};
