/** Speech synthesis voice choice, shared by the Chinese and English speech helpers. */

export const pickEnglishVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const isUS = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase() === 'en-us';
  const isHighQuality = (v: SpeechSynthesisVoice) => /Enhanced|Premium|Natural|Neural/i.test(v.name);

  return (
    voices.find(v => isUS(v) && isHighQuality(v)) ||
    voices.find(v => v.name === 'Google US English') ||
    voices.find(v => isUS(v) && /Samantha|Aria|Jenny|Ava|Zira/i.test(v.name)) ||
    voices.find(isUS) ||
    voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
    null
  );
};

export const pickTaiwanVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === 'zh-TW' && /Enhanced|Premium|Natural/.test(v.name)) ||
    voices.find(v => v.name === 'Google 國語（臺灣）') ||
    voices.find(v => v.lang === 'zh-TW') ||
    voices.find(v => v.lang.includes('zh')) ||
    null
  );
};
