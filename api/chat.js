import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
   
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 

    const { message, systemPrompt } = req.body;

    const result = await model.generateContent(`${systemPrompt}\n\nUlanyjy: ${message}`);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini Error:", error);
    
   
    } catch (innerError) {
      return res.status(200).json({ 
        reply: "Google API-de wagtlaýyn mesele bar: " + error.message 
      });
    }
  }
}