// Vercel Serverless Function — Gemini API Proxy
// API key brauzerda görünmeýär, serwerda saklanýar

export default async function handler(req, res) {
  // CORS header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Diňe POST rugsat edilýär' });
  }

  // Serwerda saklanýan API key (VITE_ prefiksi ýok — brauzere gitmez)
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY Vercel Environment Variables-da ýok. Serwerda goşuň.',
    });
  }

  const { system, messages } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array gerek' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;

    const body = {
      system_instruction: {
        parts: [{ text: system || 'Sen peýdaly AI kömekçi.' }],
      },
      contents: messages,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || `HTTP ${geminiRes.status}`;
      return res.status(geminiRes.status).json({ error: errMsg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || 'näbelli';
      return res.status(500).json({ error: `Boş jogap. Sebäp: ${reason}` });
    }

    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serwer ýalňyşlygy' });
  }
}
