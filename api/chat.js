import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 1. Diňe POST soraglaryny kabul edýäris
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 2. API açaryňyz barmy diňe barlag
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY Vercel-de ýa-da .env-de tapylmady!");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 3. Model hökmünde 'gemini-1.5-flash' ulanmak has gowudyr (çalt we mugt)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { message, systemPrompt } = req.body;

    // 4. Instruksiýa bilen ulanyjynyň hatyny birleşdirýäris
    const fullPrompt = `${systemPrompt}\n\nUlanyjy: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // 5. Arassa jogaby yzyna ugradýarys
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}