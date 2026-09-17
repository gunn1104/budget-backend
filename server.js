const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ดึง API Key ของ Gemini จาก Environment Variables บน Render
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post("/api/parse-slip", async (req, res) => {
  try {
    const { base64Data, mediaType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // เรียกใช้โมเดล Gemini 1.5 Flash (ฟรี และอ่านสลิปได้เร็ว)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = 'นี่คือภาพสลิปหรือหลักฐานการโอนเงิน ตอบกลับเป็น JSON เท่านั้น รูปแบบ: {"amount": จำนวนเงินเป็นตัวเลข หรือ null, "date": "YYYY-MM-DD" หรือ null, "note": "ชื่อผู้รับ/บันทึกสั้นๆ" หรือ ""}';

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mediaType || "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json(parsedData);
  } catch (error) {
    console.error("Error parsing slip with Gemini:", error);
    return res.status(500).json({ error: "Failed to process image" });
  }
});

app.get("/", (req, res) => {
  res.send("Budget Planner Backend (Gemini Powered) is running!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
