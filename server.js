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

    // กำหนดให้โมเดลตอบกลับเป็น JSON Format โดยตรง
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });


    const prompt = `นี่คือภาพสลิปโอนเงิน กรุณาอ่านข้อมูลและตอบกลับเป็น JSON เท่านั้น โครงสร้างดังนี้:
{
  "amount": ตัวเลขจำนวนเงิน (เช่น 150.00),
  "date": "YYYY-MM-DD",
  "note": "รายละเอียดรายการ เช่น โอนเงินให้..."
}`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mediaType || "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    res.json(data);
  } catch (error) {
    console.error("Error parsing slip:", error);
    res.status(500).json({ error: "Failed to parse slip image", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
