import React, { useState } from 'react';
import { KeyRound, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { checkParentPassword, clearParentPassword, hasParentPassword, isResetCode, MIN_PASSWORD_LENGTH, parentPasswordHint, RESET_CODE_HINT, setParentPassword } from '../services/parentLock';
import { playSound } from '../utils/sound';

const inputClass = 'w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-center font-bold outline-none focus:border-indigo-500 text-gray-900 placeholder-gray-400 placeholder:font-normal';
const primaryClass = 'w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50';

interface ParentPasswordSetupProps {
  title?: string;
  intro?: string;
  onDone: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Choose a password (twice) and an optional hint. */
export const ParentPasswordSetup: React.FC<ParentPasswordSetupProps> = ({
  title = '設定家長密碼',
  intro = '「家長專區」和「實體任務兌換」要輸入這組密碼，孩子就不能自己加點數。',
  onDone, onSkip, skipLabel = '稍後再設定',
}) => {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [hint, setHint] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const save = () => {
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`密碼至少要 ${MIN_PASSWORD_LENGTH} 個字`);
    if (password !== again) return setError('兩次輸入的密碼不一樣');
    if (hint.trim() && hint.includes(password)) return setError('提示裡不能直接寫出密碼');
    if (!setParentPassword(password, hint)) return setError('這台裝置無法儲存密碼（可能是無痕模式）');
    playSound('success');
    onDone();
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center border-4 border-indigo-200">
        <KeyRound size={32} className="text-indigo-500" />
      </div>
      <h2 className="text-2xl font-black text-indigo-900">{title}</h2>
      <p className="text-gray-500 text-sm text-center">{intro}</p>
      <div className="relative w-full">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          placeholder={`新密碼（至少 ${MIN_PASSWORD_LENGTH} 個字）`}
          className={inputClass}
          autoFocus
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={show ? '隱藏密碼' : '顯示密碼'}>
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={again}
        onChange={e => { setAgain(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="再輸入一次"
        className={inputClass}
      />
      <input
        type="text"
        value={hint}
        onChange={e => { setHint(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="密碼提示（可不填）"
        className={inputClass}
      />
      <p className="text-gray-400 text-xs text-center -mt-1">忘記密碼時會顯示提示，孩子也看得到，請不要直接寫出密碼。</p>
      {error && <p className="text-red-500 font-bold text-sm">{error}</p>}
      <button onClick={save} disabled={!password || !again} className={primaryClass}>
        <KeyRound size={20} /> 儲存密碼
      </button>
      {onSkip && <button onClick={onSkip} className="text-gray-400 text-sm underline">{skipLabel}</button>}
    </div>
  );
};

interface ParentUnlockProps {
  title?: string;
  subtitle: string;
  onUnlock: () => void;
}

/** Password check for a parent area; asks to set a password first if there isn't one, and resets a forgotten one. */
export const ParentUnlock: React.FC<ParentUnlockProps> = ({ title = '家長專區', subtitle, onUnlock }) => {
  const [mode, setMode] = useState<'unlock' | 'forgot' | 'setup'>(() => (hasParentPassword() ? 'unlock' : 'setup'));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [showResetHint, setShowResetHint] = useState(false);

  if (mode === 'setup') {
    return (
      <ParentPasswordSetup
        title="設定家長密碼"
        intro="設定好之後，下次進來就要輸入這組密碼。"
        onDone={onUnlock}
      />
    );
  }

  if (mode === 'forgot') {
    const hint = parentPasswordHint();
    const reset = () => {
      if (!isResetCode(resetCode)) {
        playSound('error');
        setError('重設碼不對喔！');
        return;
      }
      clearParentPassword();
      setError('');
      setMode('setup');
    };
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <h2 className="text-2xl font-black text-indigo-900">忘記密碼</h2>
        {hint
          ? <p className="bg-yellow-50 border-2 border-yellow-200 rounded-xl px-4 py-2 text-yellow-800 font-bold text-center w-full">提示：{hint}</p>
          : <p className="text-gray-400 text-sm">設定時沒有留下提示</p>}
        <button onClick={() => { setMode('unlock'); setError(''); }} className="text-indigo-500 text-sm font-bold underline">想起來了，回去輸入密碼</button>
        <div className="w-full border-t border-gray-100 pt-3 flex flex-col items-center gap-2">
          <p className="text-gray-600 text-sm font-bold text-center">還是想不起來？輸入重設碼，就可以重新設定密碼。</p>
          <input
            type="password"
            value={resetCode}
            onChange={e => { setResetCode(e.target.value); setError(''); }}
            onFocus={() => setShowResetHint(true)}
            onClick={() => setShowResetHint(true)}
            onKeyDown={e => e.key === 'Enter' && reset()}
            placeholder="輸入重設碼"
            autoComplete="off"
            className={inputClass}
          />
          {showResetHint && <p className="text-indigo-500 text-sm font-bold">提示：{RESET_CODE_HINT}</p>}
          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}
          <button onClick={reset} disabled={!resetCode} className={primaryClass}>重新設定密碼</button>
        </div>
      </div>
    );
  }

  const tryUnlock = () => {
    if (checkParentPassword(password)) {
      playSound('success');
      onUnlock();
    } else {
      playSound('error');
      setError('密碼錯誤喔！請找爸爸媽媽幫忙。');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-indigo-200 shadow-md">
        <Lock size={32} className="text-indigo-500" />
      </div>
      <h2 className="text-2xl font-black text-indigo-900">{title}</h2>
      <p className="text-gray-500 text-sm font-bold text-center">{subtitle}</p>
      <input
        type="password"
        value={password}
        onChange={e => { setPassword(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && tryUnlock()}
        placeholder="輸入家長密碼"
        className={inputClass}
        autoFocus
      />
      {error && <p className="text-red-500 font-bold text-sm animate-shake">{error}</p>}
      <button onClick={tryUnlock} disabled={!password} className={primaryClass}>
        <Unlock size={20} /> 解鎖
      </button>
      <button onClick={() => { setMode('forgot'); setError(''); setResetCode(''); setShowResetHint(false); }} className="text-gray-400 text-sm underline">
        忘記密碼？
      </button>
    </div>
  );
};
