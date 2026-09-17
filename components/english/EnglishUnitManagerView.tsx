import React, { useState } from 'react';
import { EnglishUnit, EnglishWord } from '../../types';
import { lookupEnglishWord, ROUND_SIZE } from '../../english/curriculum';
import { generateEnglishWordData } from '../../services/geminiService';
import { Map as MapIcon, Plus, Edit2, Trash2, Save, X, Sparkles, RefreshCw, Volume2 } from 'lucide-react';
import { speakEnglish } from '../../utils/englishSpeech';

interface EnglishUnitManagerViewProps {
  units: EnglishUnit[];
  onSaveUnits: (units: EnglishUnit[]) => void;
  onBack: () => void;
}

const ICON_OPTIONS = ['📘', '🎒', '🏫', '🌟', '🚀', '🎨', '⚽', '🍦', '🐶', '🌈'];

const splitWords = (text: string) =>
  text.split(/[\n,，、;；]+/).map(s => s.trim()).filter(Boolean);

export const EnglishUnitManagerView: React.FC<EnglishUnitManagerViewProps> = ({ units, onSaveUnits, onBack }) => {
  const [editingId, setEditingId] = useState<string | null>(null); // 'new' for a new unit
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [rows, setRows] = useState<EnglishWord[]>([]);
  const [newWords, setNewWords] = useState('');
  const [sentences, setSentences] = useState('');
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (unit?: EnglishUnit) => {
    setEditingId(unit ? unit.id : 'new');
    setTitle(unit?.title || '');
    setIcon(unit?.icon || ICON_OPTIONS[0]);
    setRows(unit?.words ? [...unit.words] : []);
    setSentences((unit?.sentences || []).join('\n'));
    setNewWords('');
    setError(null);
  };

  const addWords = () => {
    const existing = new Set(rows.map(r => r.word.toLowerCase()));
    const added = splitWords(newWords)
      .filter(word => !existing.has(word.toLowerCase()))
      .map(word => lookupEnglishWord(word) || { word, emoji: '', zh: '' });
    setRows(prev => [...prev, ...added]);
    setNewWords('');
  };

  const updateRow = (index: number, updates: Partial<EnglishWord>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const fillWithAI = async () => {
    const missing = rows.filter(r => !r.emoji || !r.zh).map(r => r.word);
    if (missing.length === 0) return;
    setIsFilling(true);
    setError(null);
    try {
      const results = await generateEnglishWordData(missing);
      setRows(prev => prev.map(row => {
        const found = results.find(r => r.word.toLowerCase() === row.word.toLowerCase());
        return found ? { ...row, emoji: row.emoji || found.emoji, zh: row.zh || found.zh } : row;
      }));
    } catch (e) {
      setError('AI 暫時無法使用，請手動填寫 emoji 和中文。');
    } finally {
      setIsFilling(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('請輸入單元名稱');
      return;
    }
    if (rows.length < ROUND_SIZE) {
      setError(`至少需要 ${ROUND_SIZE} 個單字才能玩遊戲喔`);
      return;
    }
    const unit: EnglishUnit = {
      id: editingId && editingId !== 'new' ? editingId : `custom-${Date.now()}`,
      stage: 5,
      kind: 'words',
      custom: true,
      icon,
      title: title.trim(),
      subtitle: rows.slice(0, 3).map(r => r.word).join(' · '),
      words: rows.map(r => ({ word: r.word.trim(), emoji: r.emoji.trim() || '📝', zh: r.zh.trim() })),
      sentences: sentences.split('\n').map(s => s.trim()).filter(Boolean),
    };
    const exists = units.some(u => u.id === unit.id);
    onSaveUnits(exists ? units.map(u => (u.id === unit.id ? unit : u)) : [...units, unit]);
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    onSaveUnits(units.filter(u => u.id !== id));
    setDeleteId(null);
  };

  // --- EDIT FORM ---
  if (editingId) {
    const missingCount = rows.filter(r => !r.emoji || !r.zh).length;
    return (
      <div className="min-h-screen bg-orange-50 p-4">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8 border-b-8 border-orange-200">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-orange-700">{editingId === 'new' ? '新增英文單元' : '編輯英文單元'}</h1>
            <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500">
              <X size={24} />
            </button>
          </div>

          <label className="block font-bold text-gray-700 mb-2">單元名稱</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例如：學校英文第一課"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg mb-4 focus:border-orange-400 outline-none"
          />

          <label className="block font-bold text-gray-700 mb-2">圖示</label>
          <div className="flex flex-wrap gap-2 mb-6">
            {ICON_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setIcon(option)}
                className={`text-3xl w-12 h-12 rounded-xl border-2 ${icon === option ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="block font-bold text-gray-700 mb-2">加入單字 <span className="text-sm text-gray-400 font-normal">（用逗號或換行分開，可以一次貼上很多個）</span></label>
          <div className="flex gap-2 mb-4">
            <textarea
              value={newWords}
              onChange={e => setNewWords(e.target.value)}
              placeholder="cat, dog, apple"
              rows={2}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-lg font-english focus:border-orange-400 outline-none"
            />
            <button onClick={addWords} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 rounded-xl flex items-center gap-1">
              <Plus size={20} /> 加入
            </button>
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-700">單字清單（{rows.length}）</span>
                {missingCount > 0 && (
                  <button
                    onClick={fillWithAI}
                    disabled={isFilling}
                    className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                  >
                    {isFilling ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />} AI 自動填入 {missingCount} 個
                  </button>
                )}
              </div>
              <div className="space-y-2 mb-6">
                {rows.map((row, i) => (
                  <div key={`${row.word}-${i}`} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                    <button onClick={() => speakEnglish(row.word)} className="p-2 text-sky-500 hover:bg-sky-100 rounded-lg">
                      <Volume2 size={18} />
                    </button>
                    <span className="font-english text-xl font-bold text-gray-800 flex-1 min-w-0 truncate">{row.word}</span>
                    <input
                      value={row.emoji}
                      onChange={e => updateRow(i, { emoji: e.target.value })}
                      placeholder="emoji"
                      className="w-20 text-center text-2xl border-2 border-gray-200 rounded-lg py-1"
                    />
                    <input
                      value={row.zh}
                      onChange={e => updateRow(i, { zh: e.target.value })}
                      placeholder="中文"
                      className="w-28 md:w-40 border-2 border-gray-200 rounded-lg px-2 py-1.5"
                    />
                    <button onClick={() => setRows(prev => prev.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <label className="block font-bold text-gray-700 mb-2">句子 <span className="text-sm text-gray-400 font-normal">（選填，一行一句，會出現在學習頁）</span></label>
          <textarea
            value={sentences}
            onChange={e => setSentences(e.target.value)}
            placeholder={'I see a cat.\nThe dog is big.'}
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-lg font-english mb-4 focus:border-orange-400 outline-none"
          />

          {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl">
              取消
            </button>
            <button onClick={handleSave} className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
              <Save size={20} /> 儲存單元
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST ---
  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="px-5 py-2 bg-white rounded-xl shadow-md text-gray-600 font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95"
          >
            <MapIcon size={24} /> 英文地圖
          </button>
          <button
            onClick={() => startEdit()}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md text-white font-bold flex items-center gap-2 active:scale-95"
          >
            <Plus size={24} /> 新增單元
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 border-b-8 border-orange-200">
          <h1 className="text-3xl font-black text-orange-700 mb-2">家長：自訂英文單字</h1>
          <p className="text-gray-500 mb-6">把學校課本或補習班的單字加進來，孩子就能用同樣的遊戲練習。</p>

          {units.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-3">📘</div>
              還沒有自訂單元，按右上角「新增單元」開始吧！
            </div>
          ) : (
            <div className="space-y-3">
              {units.map(unit => (
                <div key={unit.id} className="flex items-center gap-3 bg-orange-50 rounded-2xl p-4 border-2 border-orange-100">
                  <span className="text-4xl">{unit.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-gray-800 text-lg truncate">{unit.title}</div>
                    <div className="font-english text-gray-500 truncate">{(unit.words || []).map(w => w.word).join(', ')}</div>
                  </div>
                  {deleteId === unit.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-500">確定刪除？</span>
                      <button onClick={() => confirmDelete(unit.id)} className="bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg">刪除</button>
                      <button onClick={() => setDeleteId(null)} className="bg-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg">取消</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => startEdit(unit)} className="p-2 text-gray-500 hover:text-orange-600 hover:bg-white rounded-lg">
                        <Edit2 size={20} />
                      </button>
                      <button onClick={() => setDeleteId(unit.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg">
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
