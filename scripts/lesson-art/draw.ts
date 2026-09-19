/**
 * Draws the lesson pictures with Gemini (gemini-3.1-flash-image-preview, 16:9) into a folder, three at a time.
 * Run: GEMINI_API_KEY=… npx tsx scripts/lesson-art/draw.ts <out folder> [lesson ids…]   (no ids: every lesson)
 * Then look at each one (no writing in the picture, true to the text) and shrink them with shrink.ps1.
 */
import { writeFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { promptFor, SCENES } from './prompts.ts';

const [, , outDir, ...only] = process.argv;
if (!outDir || !process.env.GEMINI_API_KEY) {
  console.error('Usage: GEMINI_API_KEY=… npx tsx scripts/lesson-art/draw.ts <out folder> [lesson ids…]');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const draw = async (id: string) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: promptFor(id) }] },
        config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
      });
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
      if (part?.inlineData?.data) {
        const ext = part.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
        writeFileSync(`${outDir}/${id}.${ext}`, Buffer.from(part.inlineData.data, 'base64'));
        console.log('drawn', id);
        return;
      }
    } catch (e) {
      console.warn('retry', id, String(e).slice(0, 120));
    }
  }
  console.error('FAILED', id);
};

const queue = only.length ? only : Object.keys(SCENES);
await Promise.all([1, 2, 3].map(async () => { while (queue.length) await draw(queue.shift()!); }));
