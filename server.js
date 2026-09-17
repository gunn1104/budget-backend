const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.get("/", (req, res) => {
  res.send("Budget Planner Backend (Gemini Powered) is running!");
});

app.post("/api/parse-slip", async (req, res) => {
  try {
    const { base64Data, mediaType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const prompt = `นี่คือภาพสลิปโอนเงิน อ่านข้อมูลแล้วตอบกลับเฉพาะโครงสร้าง JSON นี้เท่านั้น ห้ามใส่ markdown code block:
{"amount": 100, "date": "YYYY-MM-DD", "note": "ข้อความ"}`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mediaType || "image/jpeg"
      }
    };

    // ปรับรายชื่อโมเดลมาตรฐานที่พร้อมใช้งานเสมอ
    const candidateModels = [
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-3.6-flash"
    ];

    let result = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([prompt, imagePart]);
        if (result) break;
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying next... Error:`, err.message);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error("All models failed to respond");
    }

    let text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const data = JSON.parse(text);
    res.json(data);
  } catch (error) {
    console.error("Error parsing slip:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
