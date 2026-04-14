// Vercel Serverless Function — Groq API Proxy
// API key diňe serverde saklanýar, brauzerda görünmeýär
// Vercel → Settings → Environment Variables → GROQ_KEY (VITE_ ýok!)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Diňe POST" });

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({
      error: "GROQ_KEY Vercel Environment Variables-da ýok. Serwerda goşuň (VITE_ prefiksi bolmaly däl).",
    });
  }

  const { system, messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array gerek" });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_KEY,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: "system", content: system || "Sen peýdaly AI kömekçi." },
          ...messages,
        ],
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      const errMsg = data?.error?.message || "HTTP " + r.status;
      return res.status(r.status).json({ error: errMsg });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: "Boş jogap geldi" });
    }

    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message || "Serwer ýalňyşlygy" });
  }
}
