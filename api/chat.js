import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ reply: "⚠️ Vercel-de API açary tapylmady!" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ÜNS BERIŇ: Model ady hökman "models/gemini-1.5-flash" bolmaly
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

    const { message, systemPrompt } = req.body;

    // Islendik ýagdaýda sistemanyň işlemesi üçin prompt düzýäris
    const prompt = `${systemPrompt || "Siz kömekçi AI"}\n\nUlanyjy: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Eger 1.5-flash işlemese, köne 'gemini-pro' modelini iň soňky çäre hökmünde synlaýarys
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const backupModel = genAI.getGenerativeModel({ model: "models/gemini-pro" });
        const result = await backupModel.generateContent(req.body.message);
        const response = await result.response;
        return res.status(200).json({ reply: response.text() });
    } catch (innerError) {
        return res.status(200).json({ 
          reply: "⚠️ Google tarapyndan ýalňyşlyk: " + (error.message || "Baglanyşykda mesele bar.")
        });
    }
  }
}