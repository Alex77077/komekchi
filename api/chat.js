import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
    });

    const result = await model.generateContent(req.body.message);
    const response = await result.response;

    res.status(200).json({ reply: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}