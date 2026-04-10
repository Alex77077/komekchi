import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Modeli kesgitlemek (gemini-pro ýa-da gemini-1.5-flash)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Has çalt we tygşytly wersiýasy
    });

    const { message, systemPrompt } = req.body;

    // 2. Gemini-da system prompt we ulanyjy hatyny birleşdirip ugratmak
    // Gemini-niň SDK-synda system instruction aýratyn hem berlip bilner, 
    // ýöne iň ygtybarly ýoly ulanýarys:
    const prompt = `${systemPrompt}\n\nUlanyjy soragy: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Frontend-däki "d.reply" diýen ýere şu ýerdäki "reply" barar
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    res.status(500).json({ error: "AI bilen baglanşykda säwlik ýüze çykdy." });
  }
}