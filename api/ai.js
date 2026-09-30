// Vercel Serverless Function — Groq API Proxy (diňe girenler ulanyp biler)
import { bearer, getUser } from "./_sb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Diňe POST" });

  const user = await getUser(bearer(req));
  if (!user) return res.status(401).json({ error: "Giriş gerek" });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY Vercel Environment Variables-da ýok (VITE_ prefiksi bolmaly däl)." });

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30)
    return res.status(400).json({ error: "messages array gerek" });

  const safeMsgs = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + GROQ_KEY },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.7,
        messages: [{ role: "system", content: String(system || "Sen peýdaly AI kömekçi.").slice(0, 12000) }, ...safeMsgs],
      }),
    });

    const rawText = await r.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ error: "Groq API-den näsaz jogap geldi." });
    }

    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "HTTP " + r.status });
    
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return res.status(500).json({ error: "Boş jogap geldi" });
    
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Serwer ýalňyşlygy" });
  }
}