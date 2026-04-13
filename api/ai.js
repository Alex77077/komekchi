// Vercel Serverless Function — Groq API Proxy
export default async function handler(req, res) {
  // CORS header-lar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Diňe POST rugsat edilýär' });
  }

  // Vercel-de VITE_GROQ_KEY diýip goşuň
  const GROQ_KEY = process.env.VITE_GROQ_KEY;

  if (!GROQ_KEY) {
    return res.status(500).json({
      error: 'VITE_GROQ_KEY tapylmady. Vercel Environment Variables-e goşuň.',
    });
  }

  const { system, messages, model } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array gerek' });
  }

  try {
    // Groq OpenAI formatyny ulanýar
    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const body = {
      // Islendik Groq modelini saýlap bilersiňiz (meselem: llama-3.3-70b-versatile ýa-da mixtral-8x7b-32768)
      model: model || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system || "Sen peýdaly AI kömekçi." },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    };

    const groqRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify(body),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const errMsg = data?.error?.message || `HTTP ${groqRes.status}`;
      return res.status(groqRes.status).json({ error: errMsg });
    }

    // Groq jogaby OpenAI formatynda: choices[0].message.content
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: 'AI-dan jogap alynmady.' });
    }

    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serwer ýalňyşlygy' });
  }
}
