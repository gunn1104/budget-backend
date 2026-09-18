const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // หรือถ้าใช้ Node เวอร์ชันใหม่ๆ จะมี fetch ในตัวแล้ว

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // รองรับรูปสลิปขนาดใหญ่

const PORT = process.env.PORT || 3000;

// 1. Endpoint สำหรับอ่านสลิป (ระบบเดิมที่มีอยู่แล้ว)
app.post('/api/parse-slip', async (req, res) => {
  try {
    const { base64Data, mediaType } = req.body;
    const apiKey = process.env.AI_API_KEY; // ดึงคีย์จาก Environment Variable ของ Render

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64Data } },
              {
                type: "text",
                text: "นี่คือภาพสลิปหรือหลักฐานการโอนเงิน อ่านรายละเอียดแล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีคำอธิบายหรือ markdown รูปแบบ: {\"amount\": ตัวเลขยอดเงิน หรือ null, \"date\": \"YYYY-MM-DD\" หรือ null, \"note\": \"ชื่อผู้รับหรือบันทึก\" หรือ \"\"}"
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const clean = (textBlock ? textBlock.text : "{}").replace(/```json|```/g, "").trim();
    res.json(JSON.parse(clean));

  } catch (err) {
    console.error("Parse Slip Error:", err);
    res.status(500).json({ error: "Failed to parse slip" });
  }
});

// 2. Endpoint ใหม่ สำหรับ AI แชทซัพพอร์ต (/api/chat-assist) ตามที่แนะนำ
app.post('/api/chat-assist', async (req, res) => {
  try {
    const { userName, history } = req.body;
    const apiKey = process.env.AI_API_KEY; // ดึงคีย์จาก Render

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 350,
        system: `คุณคือ AI ผู้ช่วยอัจฉริยะของแอปพลิเคชันจัดการงบประมาณ คุยกับผู้ใช้ชื่อ ${userName || "ผู้ใช้"} ด้วยความสุภาพ เป็นกันเอง และคอยให้คำแนะนำเรื่องการเงิน`,
        messages: history
      })
    });

    const data = await response.json();
    const replyText = data.content?.[0]?.text || "รับเรื่องไว้แล้วครับ แอดมินจะติดต่อกลับเร็วๆ นี้";

    res.json({ reply: replyText });

  } catch (error) {
    console.error("Chat Assist Error:", error);
    res.status(500).json({ reply: "ขออภัย ระบบ AI กำลังขัดข้องชั่วคราว" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
