import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API açary tapylmady! Vercel sazlamalaryny barlaň." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 'gemini-pro' käwagt Vercel-de sebit sebäpli doňup bilýär, 'gemini-1.5-flash' has durnuklydyr
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { message, systemPrompt } = req.body;

    const fullPrompt = `${systemPrompt || ""}\n\nUlanyjy: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini Error:", error);
    // Ýalňyşlygy tekst däl-de, JSON hökmünde ugradýarys
    return res.status(500).json({ error: error.message || "AI bir säwlik goýberdi." });
  }
}