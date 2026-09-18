import React, { useEffect, useState } from 'react';
import { REWARD_CARDS } from '../constants';
import { cacheImage, getCachedImage } from '../services/db';

/** Photos parents put on the reward cards, kept on this device. */
export const useRewardImages = (reloadWhen: unknown) => {
  const [rewardImages, setRewardImages] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [imageRefreshVersion, setImageRefreshVersion] = useState(0);

  useEffect(() => {
    const loadRewardImages = async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(REWARD_CARDS.map(async (card) => {
        try {
          const img = await getCachedImage(`reward_${card.id}`);
          if (img) loaded[card.id] = img;
        } catch (e) {}
      }));
      setRewardImages(prev => ({ ...prev, ...loaded }));
    };
    loadRewardImages();
  }, [reloadWhen]);

  const onImageError = (id: string) => {
    setImageLoadErrors(prev => ({ ...prev, [id]: true }));
  };

  const onFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片太大囉！請選小一點的照片 (小於 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await cacheImage(`reward_${id}`, base64);
        setRewardImages(prev => ({ ...prev, [id]: base64 }));
        setImageLoadErrors(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  /** Opening the shop tries every picture again. */
  const retryImages = () => {
    setImageLoadErrors({});
    setImageRefreshVersion(v => v + 1);
  };

  return { rewardImages, imageLoadErrors, imageRefreshVersion, onImageError, onFileUpload, retryImages };
};
