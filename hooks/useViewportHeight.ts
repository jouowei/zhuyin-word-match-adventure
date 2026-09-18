import { useEffect, useState } from 'react';

/** The screen's height, for drawings sized in pixels (SVG glyphs) that must fit one screen. */
export const useViewportHeight = () => {
  const [height, setHeight] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
};

/** A size that follows the screen's height, between a smallest and a largest size. */
export const heightShare = (height: number, share: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, height * share)));
