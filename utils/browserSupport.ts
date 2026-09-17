/**
 * Apps' built-in browsers (LINE, Facebook, Instagram…) often have no speech synthesis, so the spoken Chinese
 * instructions stay silent there; recordings still play. Links shared in LINE open in its browser by default.
 */

export type InAppBrowser = 'line' | 'other' | null;

export const detectInAppBrowser = (userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): InAppBrowser => {
  if (/\bLine\/\d/i.test(userAgent)) return 'line';
  if (/FBAN|FBAV|Instagram|MicroMessenger|; wv\)/i.test(userAgent)) return 'other';
  return null;
};

export const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

/** LINE opens a link with this parameter in the phone's own browser (Chrome / Safari). */
export const externalBrowserUrl = (href: string) => {
  const url = new URL(href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
};
