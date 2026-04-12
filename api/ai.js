export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Diňe POST rugsat edilýär' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_KEY tapylmady. Vercel Settings-da barlan.' });
  }

  const { system, messages } = req.body || {};

  // Gemini-nyň 'contents' formatyna öwürmek (eger frontend-den OpenAI formaty gelýän bolsa)
  const formattedContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user', // Gemini 'assistant' däl-de 'model' ulanýar
    parts: [{ text: msg.content || msg.parts?.[0]?.text || "" }]
  }));

  try {
    // URL-y durnukly v1 wersiýasyna we model adyna üýtgetdik
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const body = {
      system_instruction: {
        parts: [{ text: system || 'Sen peýdaly AI kömekçi.' }],
      },
      contents: formattedContents, // Täze formatlanan messages
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      // API-dan gelýän anyk ýalňyşlygy yzyna gaýtarmak
      return res.status(geminiRes.status).json({ 
        error: data.error?.message || 'Gemini API ýalňyşlygy',
        details: data.error 
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: 'Serwerda näsazlyk: ' + e.message });
  }
}