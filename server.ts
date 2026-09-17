import express from "express";
import path from "path";
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT) || 3000; // Cloud Run tells the container which port to use

app.use(express.json({ limit: '50mb' }));

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const getAI = (customApiKey?: string) => {
    let key = customApiKey;
    if (!key || key === 'null' || key === 'undefined' || key.trim() === '') {
        key = process.env.GEMINI_API_KEY;
    }
    if (!key) {
        throw new Error("API key is missing. Please set GEMINI_API_KEY or provide one via headers.");
    }
    return new GoogleGenAI({
        apiKey: key,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build'
            }
        }
    });
};

app.post('/api/generate-level-data', async (req, res) => {
    try {
        const { words } = req.body;
        const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
        const ai = getAI(customApiKey);
        const prompt = `
            For these Traditional Chinese words: ${JSON.stringify(words)}
            
            Return a JSON array with:
            1. 'character': The word.
            2. 'zhuyin': Bopomofo notation.
            3. 'emoji': A matching emoji.
            
            Strictly JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash", // 2.5 is no longer available to new API users
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            character: { type: Type.STRING },
                            zhuyin: { type: Type.STRING },
                            emoji: { type: Type.STRING },
                        },
                        required: ["character", "zhuyin", "emoji"]
                    }
                },
                safetySettings: SAFETY_SETTINGS,
            }
        });
        const items = JSON.parse(response.text || "[]");
        res.json({ items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.post('/api/generate-english-word-data', async (req, res) => {
    try {
        const { words } = req.body;
        const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
        const ai = getAI(customApiKey);
        const prompt = `
            For these English words for a 7-year-old child in Taiwan: ${JSON.stringify(words)}

            Return a JSON array with:
            1. 'word': The word exactly as given.
            2. 'emoji': One emoji that best shows the word.
            3. 'zh': A short Traditional Chinese (Taiwan) meaning.

            Strictly JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash", // 2.5 is no longer available to new API users
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            emoji: { type: Type.STRING },
                            zh: { type: Type.STRING },
                        },
                        required: ["word", "emoji", "zh"]
                    }
                },
                safetySettings: SAFETY_SETTINGS,
            }
        });
        const items = JSON.parse(response.text || "[]");
        res.json({ items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { word, seed } = req.body;
        const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
        const ai = getAI(customApiKey);

        const styles = [
            "Cute 3D clay render, soft lighting, pastel colors",
            "Vibrant flat vector art, thick bold outlines, sticker style",
            "Kawaii cartoon style with big eyes and rounded shapes",
        ];
        // Use seed if provided, otherwise random so styles change.
        const hash = seed ? (seed % styles.length) : Math.floor(Math.random() * styles.length);
        const randomStyle = styles[hash];

        const response = await ai.models.generateContent({
            // Migrate to gemini-3.1-flash-image-preview
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [{ text: `Create a cute, simple illustration of "${word}". STYLE: ${randomStyle}. IMPORTANT RULES: 1. Background MUST be pure WHITE. 2. The subject must be large and centered. 3. STRICTLY NO TEXT, NO CHINESE CHARACTERS, NO NUMBERS in the drawing. 4. Designed for a 6-year-old child.` }],
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });

        let base64Image = undefined;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                break;
            }
        }

        if (base64Image) {
            res.json({ image: base64Image });
        } else {
            res.status(500).json({ error: "Failed to generate image" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.post('/api/generate-reward-image', async (req, res) => {
    try {
        const { title, description } = req.body;
        const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
        const ai = getAI(customApiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { 
                        text: `Generate a premium, magical reward card illustration for a child.
                               
                               Title: "${title}"
                               Description: ${description}
                               
                               VISUAL STYLE: Shiny 3D game asset, golden glow, magical.
                               NO TEXT.` 
                    }
                ],
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });

        let base64Image = undefined;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                break;
            }
        }
        res.json({ image: base64Image });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.post('/api/generate-audio', async (req, res) => {
    try {
        const { text } = req.body;
        const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
        const ai = getAI(customApiKey);
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            res.json({ audio: base64Audio });
        } else {
            res.status(500).json({ error: "No audio generated" });
        }
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

// Relays 教育部 word recordings from 萌典 so the browser can decode them (the audio host sends no CORS headers).
// The files are passed through unmodified (CC BY-ND 3.0 TW).
app.get('/api/moedict-audio/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^\d{1,12}$/.test(id)) {
        res.status(400).end();
        return;
    }
    try {
        const upstream = await fetch(`https://r2-assets.moedict.tw/audio/a/${id}.mp3`);
        if (!upstream.ok) {
            res.status(upstream.status).end();
            return;
        }
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
        console.error(e);
        res.status(502).end();
    }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
