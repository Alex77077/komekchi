// Vercel Serverless Function — Groq API Proxy
// API key diňe serverde saklanýar, brauzerda görünmeýär
// Vercel → Settings → Environment Variables → GROQ_KEY (VITE_ ýok!)
//
// ⚠️ ÖNKÜ "AI JOGAP BERMÄNOK" SEBÄBI:
// openai/gpt-oss-120b "reasoning" (pikir ýöredýän) model. Ol jogap ýazmazdan
// öň gizlin "pikir" tokenlerini sarp edýär. Öň max_tokens = 600 bardy — bu
// çäk diňe pikire ýetip, jogaba ýetmän bes bolýardy → message.content boş
// gelýärdi → "Boş jogap geldi". Indi:
//   • max_completion_tokens = 2048 (pikire-de, jogaba-da ýeterlik)
//   • reasoning_effort = "low"    (çalt we tygşytly)
//   • include_reasoning = false   (pikir teksti jogaba goşulmaýar)

const MODEL = "openai/gpt-oss-120b";
const MAX_HISTORY = 16; // iň soňky 16 habar ýeterlik (token tygşytlamak üçin)

function cleanMessages(messages) {
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() &&
        !m.content.startsWith("⚠️") // öňki ýalňyşlyk habarlary AI-a barmasyn
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export default async function handler(req, res) {
  // Bellik: CORS başlyklary aýryldy. Frontend şu funksiýany
  // hemişe "/api/ai" ýaly göni (aýry domenden däl) çagyrýar.
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
  const msgs = cleanMessages(messages);
  if (!msgs.length) return res.status(400).json({ error: "Boş habar" });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GROQ_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 2048,
        reasoning_effort: "low",
        include_reasoning: false,
        temperature: 0.7,
        messages: [
          { role: "system", content: String(system || "Sen peýdaly AI kömekçi.").slice(0, 12000) },
          ...msgs,
        ],
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      let errMsg = data?.error?.message || "HTTP " + r.status;
      if (r.status === 401) errMsg = "GROQ_KEY nädogry ýa-da poz edilen (Groq → API Keys). " + errMsg;
      if (r.status === 429) errMsg = "Groq çäkleme (rate limit): birnäçe sekuntdan täzeden synanyşyň.";
      return res.status(r.status).json({ error: errMsg });
    }

    const choice = data?.choices?.[0];
    let text = (choice?.message?.content || "").trim();
    // Käbir modeller <think>…</think> goýýar — aýyrýarys
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    if (!text) {
      const why = choice?.finish_reason === "length"
        ? "Jogap token çäginden geçdi. Soragy gysgaldyň ýa-da täzeden synanyşyň."
        : "Boş jogap geldi";
      return res.status(502).json({ error: why });
    }

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Serwer ýalňyşlygy" });
  }
}
