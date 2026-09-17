const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// อนุญาตให้ส่งข้อมูลข้ามโดเมนและรับไฟล์ Base64 ขนาดใหญ่ได้
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Route สำหรับรับรูปสลิปแล้วส่งให้ Anthropic API ประมวลผล
app.post("/api/parse-slip", async (req, res) => {
  try {
    const { base64Data, mediaType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: base64Data
                }
              },
              {
                type: "text",
                text: 'นี่คือภาพสลิปหรือหลักฐานการโอนเงิน ตอบกลับเป็น JSON เท่านั้น รูปแบบ: {"amount": จำนวนเงินเป็นตัวเลข หรือ null, "date": "YYYY-MM-DD" หรือ null, "note": "ชื่อผู้รับ/บันทึกสั้นๆ" หรือ ""}'
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const raw = textBlock ? textBlock.text : "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.json(parsed);
  } catch (error) {
    console.error("Error parsing slip:", error);
    return res.status(500).json({ error: "Failed to process image" });
  }
});

// Route สำหรับตรวจเช็กสถานะเซิร์ฟเวอร์
app.get("/", (req, res) => {
  res.send("Budget Planner Backend is running!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
