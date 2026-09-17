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

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `นี่คือภาพสลิปโอนเงิน อ่านข้อมูลแล้วตอบกลับเฉพาะโครงสร้าง JSON นี้เท่านั้น ห้ามใส่ markdown code block:
{"amount": 100, "date": "YYYY-MM-DD", "note": "ข้อความ"}`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mediaType || "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let text = result.response.text().trim();
    
    // ดึงเฉพาะก้อน {...} ออกมา เพื่อป้องกันการพังจาก markdown block
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
