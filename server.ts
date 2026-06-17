import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Rate Limit Defense: 3 API Keys
const API_KEYS = [
  process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "",
  process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY || "",
  process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY || ""
].filter(Boolean);

let currentKeyIndex = 0;

function getGeminiClient() {
  if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured.");
  }
  const apiKey = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenAI({ apiKey });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Agent 1: Data Extractor
  app.post("/api/agent1/extract", async (req, res) => {
    try {
      const { text } = req.body;
      const ai = getGeminiClient();
      
      const prompt = `Mày là chuyên gia thiết kế giáo trình. Trích xuất các khái niệm quan trọng nhất từ văn bản sau. Yêu cầu xuất dữ liệu: Trả về ĐÚNG MỘT MẢNG JSON duy nhất chứa các đối tượng: {"front": "thuật ngữ", "back": "định nghĩa", "subject": "english|math|physics|chemistry|biology|history|other"}. KHÔNG có văn bản nào khác ngoài JSON, không dùng markdown code block.\n\nVăn bản: ${text}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.2
        }
      });
      
      res.json({ result: response.text });
    } catch (error) {
      console.error("Agent 1 Error:", error);
      res.status(500).json({ error: "Failed to extract data" });
    }
  });

  // Agent 2: Dynamic Router Agent (Deep Extract)
  app.post("/api/agent2/explain", async (req, res) => {
    try {
      const { term, definition, subject } = req.body;
      const ai = getGeminiClient();
      
      let prompt = "";
      if (subject === "english") {
        prompt = `Mày là Chuyên gia Ngôn ngữ học. Phân tích từ vựng tiếng Anh "${term}" (Định nghĩa: ${definition}). Trình bày kết quả theo cấu trúc markdown chuẩn, BẮT BUỘC dùng nhiều emoji/icon sinh động phù hợp ngữ cảnh, chia thành các phần:
1. Từ loại & Phiên âm IPA 🔤
2. Nghĩa tiếng Việt chuẩn 🇻🇳
3. Etymology (Nguồn gốc lịch sử hình thành từ) 🏛️
4. 2 câu ví dụ thực tế kèm dịch nghĩa 📝
Dùng ngôn từ trang trọng. Chỉ trả ra nội dung phân tích (markdown).`;
      } else {
        prompt = `Mày là Giáo sư Khoa học/Xã hội. Phân tích khái niệm/định luật "${term}" (Định nghĩa: ${definition}). Trình bày kết quả bằng markdown, BẮT BUỘC dùng nhiều emoji/icon sinh động, chia thành các phần:
1. Định nghĩa chính thức 📖
2. Công thức (nếu có, giải thích từng hằng số/đại lượng) hoặc Bối cảnh sự kiện 🧪
3. 2 ứng dụng thực tiễn hoặc tác động cốt lõi 🚀
4. Một mẹo ghi nhớ hoặc sơ đồ tư duy dạng chữ (Bullet points) 🧠
BẮT BUỘC ép hiển thị LaTeX chuẩn: Mọi công thức, biểu thức, ký hiệu toán/lý/hóa phải bọc trong dấu $ cho inline và $$ cho block toán học để thư viện MathJax/KaTeX render. Chỉ trả ra nội dung phân tích (markdown).`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
        // removed responseMimeType since it's HTML/markdown
      });
      
      res.json({ result: response.text });
    } catch (error) {
      console.error("Agent 2 Error:", error);
      res.status(500).json({ error: "Failed to explain" });
    }
  });

  // Agent 3: Socratic & Context-Aware Assistant
  app.post("/api/agent3/chat", async (req, res) => {
    try {
      const { message, context, mode, mcqData, difficulty } = req.body;
      const ai = getGeminiClient();
      
      let systemPrompt = `Mày là Agent 3 - 'Socrates AI Coach', gia sư học tập chủ động. QUY TẮC BẮT BUỘC:
1. SOCRATIC METHOD: KHÔNG BAO GIỜ giải bài tập hộ hay cho đáp án trực tiếp. Khi học sinh hỏi, hãy gợi ý từng bước, đưa manh mối và kết thúc bằng một câu hỏi ngược để học sinh tự suy luận.
2. CONTEXT-AWARE: Mày sẽ nhận được Context ẩn (thẻ học sinh đang xem). Nếu học sinh dùng từ 'Cái này', 'Từ này', hãy tự động liên kết với Context đó để trả lời.
3. FORMATTING: Ngắn gọn, thân thiện, dùng LaTeX ($$, $) cho mọi công thức Toán/Lý/Hóa.`;

      if (mode === "quiz") {
          const diffLevel = difficulty || "medium";
          systemPrompt += `\n\nNhiệm vụ: Tạo một trò chơi trắc nghiệm 3 câu hỏi liên tiếp dựa trên context thẻ yếu được cung cấp. Cấp độ khó: ${diffLevel}. Đầu vào là yêu cầu người dùng: ${message}`;
          if (mcqData) {
            let difficultyGuidance = "Cấp độ trung bình.";
            if (diffLevel === "easy") difficultyGuidance = "Cấp độ dễ: Hỏi trực tiếp định nghĩa cơ bản, nhận biết trực tiếp.";
            if (diffLevel === "medium") difficultyGuidance = "Cấp độ trung bình: Yêu cầu hiểu sâu hơn, áp dụng cơ bản.";
            if (diffLevel === "hard") difficultyGuidance = "Cấp độ khó: Đánh đố, vận dụng cao, suy luận logic tổng hợp.";
            
            const mcqPrompt = `Tạo một bài Test 15 câu trắc nghiệm MCQ dựa trên danh sách các thẻ yếu sau đây. \nĐộ khó: ${difficultyGuidance}\nTrả về đúng 1 mảng JSON chứa các object: {"question": "...", "options": ["A...","B...","C...","D..."], "correctIndex": 0..3, "explanation": "..."}. KHÔNG trả về gì khác ngoài JSON.\nDữ liệu hổng kiến thức: ${JSON.stringify(mcqData)}`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: mcqPrompt,
                config: { responseMimeType: "application/json" }
            });
            return res.json({ result: response.text });
          }
      }
      
      const fullPrompt = `Ngữ cảnh ẩn (Hidden Context): ${context}\n\nHọc sinh: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Đã hiểu." }] },
            { role: "user", parts: [{ text: fullPrompt }] }
        ]
      });
      
      res.json({ result: response.text });
    } catch (error) {
      console.error("Agent 3 Error:", error);
      res.status(500).json({ error: "Failed to generate context" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
