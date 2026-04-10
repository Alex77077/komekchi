import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ÜNS BERIŇ: Käbir wersiýalarda "models/" prefiksi gerek, käbirinde ýok.
    // Iň durnuklysy "gemini-1.5-flash" (prefiksiz) ýa-da "gemini-pro"
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const { message, systemPrompt } = req.body;

    const result = await model.generateContent(`${systemPrompt}\n\nUlanyjy: ${message}`);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini Error:", error);
    
    // Eger 1.5-flash ýene "Not Found" berse, awtomatiki "gemini-pro" synlaýarys
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const backupModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await backupModel.generateContent(req.body.message);
      const response = await result.response;
      return res.status(200).json({ reply: response.text() });
    } catch (innerError) {
      return res.status(200).json({ 
        reply: "Google API-de wagtlaýyn mesele bar: " + error.message 
      });
    }
  }
}