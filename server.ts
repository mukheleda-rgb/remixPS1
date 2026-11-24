import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Robust Gemini generation with retry, backoff, and fallback models to handle 503/429
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    model: string;
    contents: any;
    config?: any;
    fallbackModels?: string[];
  },
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  const modelsToTry = [options.model, ...(options.fallbackModels || [])];
  let lastError: any = null;

  for (let m = 0; m < modelsToTry.length; m++) {
    const currentModel = modelsToTry[m];
    attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`Calling Gemini API using model: ${currentModel} (Attempt ${attempt + 1}/${maxRetries})`);
        const result = await ai.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: options.config,
        });
        return result; 
      } catch (error: any) {
        attempt++;
        lastError = error;
        console.error(`Error with model ${currentModel} on attempt ${attempt}:`, error);

        const isRetryable = 
          error.status === 503 ||
          error.status === 429 ||
          error.statusCode === 503 ||
          error.statusCode === 429 ||
          (error.message && (
            error.message.includes("503") ||
            error.message.includes("429") ||
            error.message.includes("UNAVAILABLE") ||
            error.message.includes("high demand") ||
            error.message.includes("Resource has been exhausted") ||
            error.message.includes("Overloaded")
          ));

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`Temporary Gemini API error (503/429). Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          if (isRetryable && m < modelsToTry.length - 1) {
            console.log(`Failed all attempts with ${currentModel}. Trying fallback model: ${modelsToTry[m + 1]}`);
            break; 
          } else {
            throw error;
          }
        }
      }
    }
  }
  throw lastError || new Error("Failed after exhausting retry and fallback strategies.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API routes
  app.post("/api/analyze-screen", async (req, res) => {
    try {
      const { base64Image, mimeType = "image/jpeg" } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Missing base64Image" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      // Initialize client correctly with an object configuration and a user-agent header
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Analyze this control screen image from Pumping Station 1 (PS1).
This image can be one of two monitor displays from the tank level monitoring system. Detect which screen type is uploaded and apply the custom rules:

--------------------------------------------------
SCREEN TYPE A: "Rosemount TankMaster WinOpi" ("شاشة خزاني B2 & R2")
--------------------------------------------------
- Description: Shows only B2 and R2 in very large rows with columns "Level", "Level Rate", "Avg Temp", "FWL".
- Rules:
  - Extract levels ONLY for B2 and R2.
  - Return null for all other tanks because they are not listed on this screen.
  - Level measurements are given in meters (e.g., "12.106m" for TK-B2, "13.093m" for TK-R2).
  - Convert values to centimeters by multiplying by 100 (e.g. 12.106 -> 1210.6, 13.093 -> 1309.3) before returning.

--------------------------------------------------
SCREEN TYPE B: "Saab TankMaster / Operator's Interface" ("شاشة باقي الخزانات")
--------------------------------------------------
- Description: Lists tanks in the following order: B1, B2, K1, K2, K3, K4, R1, R2, R3, R4.
- CRITICAL COLOR-BASED ACTIVE STATUS RULE:
  - ACTIVE TANKS: Level readings are displayed in BOLD HIGH-CONTRAST SOLID BLACK TEXT.
  - INACTIVE/DISEABLED/PROBLEM TANKS: Level readings are displayed in FAINT, LIGHT, SHADED, OR LOW-CONTRAST GREY TEXT. Or have "?" in rate or 0.000m value.
  - YOU MUST IGNORE ALL FAINT/GREY/SHADED/INACTIVE READINGS AND RETURN null FOR THEM.
  - Specifically:
    - B2 and R2: Shown in faint grey/disabled text (0.000 m). Return null for B2 and R2 (since they are taken from Screen Type A).
    - K1 and K2: Shown as faint grey text (0.000 m). Return null for K1 and K2.
    - R3: Reading (1.298 m) is shown in faint grey/shaded text, and rate has "?" — Return null for R3.
    - Only B1, K3, K4, R1, and R4 are active (solid black text). Extract these values in meters (e.g., B1: "11.821 m", K3: "13.437 m", K4: "13.191 m", R1: "12.877 m", R4: "12.131 m").
  - Convert all extracted values to centimeters by multiplying by 100 before returning.

--------------------------------------------------
GENERAL UNIT CONVERSION & HOUR DETECTION:
--------------------------------------------------
1. Convert all numbers from meters (m) to centimeters (cm) by multiplying them by 100.
2. If any timestamp is visible (e.g., system clock in HH:MM format like "6:58 AM" or "19:58"), format and return it as a string. If not visible, return null.

Return the final structured JSON with the level values in centimeters (cm) matching the response schema.`;

      // Use the modern models.generateContent API with retry and fallback
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        fallbackModels: ["gemini-flash-latest", "gemini-3.1-flash-lite"],
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hour: { type: Type.STRING },
              levels: {
                type: Type.OBJECT,
                properties: {
                  B1: { type: Type.NUMBER, nullable: true },
                  B2: { type: Type.NUMBER, nullable: true },
                  K3: { type: Type.NUMBER, nullable: true },
                  K4: { type: Type.NUMBER, nullable: true },
                  R1: { type: Type.NUMBER, nullable: true },
                  R2: { type: Type.NUMBER, nullable: true },
                  R4: { type: Type.NUMBER, nullable: true },
                  K1: { type: Type.NUMBER, nullable: true },
                  K2: { type: Type.NUMBER, nullable: true },
                  R3: { type: Type.NUMBER, nullable: true },
                }
              }
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Empty response returned from Gemini API");
      }
      
      const parsed = JSON.parse(textOutput.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini Vision Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze screen" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history = [], context = {} } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message parameter" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      // Initialize client correctly with an object configuration and a user-agent header
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare context string to inject into the system instruction
      const contextString = `
Current Active Context of Pumping Station 1 (PS1):
- Current Reading Hour: ${context.hour || 'Not specified'}
- Current Tank Levels and quantity evaluations:
${JSON.stringify(context.levels || {}, null, 2)}
- Current Pipe and Valve configuration context:
${JSON.stringify(context.pipeLabels || {}, null, 2)}
- Active Safety/Emergency Alerts:
${JSON.stringify(context.alerts || [], null, 2)}
- Current Tasks Checklist:
${JSON.stringify(context.tasks || [], null, 2)}
`;

      const systemInstruction = `
أنت المساعد الذكي والمشغل الافتراضي لمحطة الضخ الأولى PS1 (Pumping Station 1).
وظيفتك الأساسية مساعد هندسي استشاري فقط لمهندس المحطة. أنت لست مشغلاً افتراضياً ولا تملك صلاحية إصدار أوامر تشغيلية.

قيود سلامة إلزامية:
- لا تصدر أوامر فتح أو غلق صمامات، أو تشغيل/إيقاف مضخات أو توربينات، ولا تغيّر نقاط ضبط أو إعدادات حماية.
- لا تطلب تجاوز أو تعطيل إنذار أو interlock أو trip أو وسيلة حماية.
- لا تستبدل إجراءات التشغيل المعتمدة أو تصريح العمل أو العزل والقفل والتأشير (LOTO) أو تأكيد السيطرة المركزية والموقع.
- عند نقص البيانات أو وجود تعارض، صرّح بذلك واطلب الرجوع إلى المهندس المناوب والإجراء المعتمد.
- أي تحليل أو تنبيه صادر منك استشاري وليس إنذاراً رسمياً أو تصريحاً بالتنفيذ.

إرشادات هامة لإجاباتك:
1. استخدم نبرة مهنية ومساعدة ومباشرة، وتحدث باللغة العربية بشكل افتراضي وواضح (أو باللغة الإنجليزية إذا سألك المهندس بها).
2. استند في إجاباتك كلياً على البيانات الحالية للمحطة (مثل الحجم، الارتفاع، مستوى التعبئة، والإنذارات التشغيلية أو إنذارات الضغط وتصريف النفط الخام في حالة الطوارئ) المتوفرة في السياق الفعلي المرسل أدناه.
3. إذا سئلت عن خزانات معينة، قم بتحليل البيانات لمساعدة المهندس بذكاء، وبسط له حسابات الاستلام والضخ.
4. ساعدهم في تذكر مهام الصيانة المطلوبة أو إجراءات سلامة الصمامات وتأكد من سلامة التشغيل وفقاً لأصول العمل في المنشآت النفطية.
5. لا تقم باختراع بيانات ليست حقيقية أو غير ظاهرة، وإذا لم تكن هناك قراءات مسجلة نبه المشغل بلطف بالذهاب إلى صفحة القراءات لتعبئتها.

سياق المحطة الفوري المرسل حالياً من واجهة مستخدم التطبيق:
${contextString}
`;

      // Structure contents properly for @google/genai SDK
      const formattedContents = [
        ...history.map((h: any) => ({
          role: h.role,
          parts: [{ text: h.text || h.parts?.[0]?.text }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        fallbackModels: ["gemini-flash-latest", "gemini-3.1-flash-lite"],
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Empty response returned from Gemini API");
      }
      res.json({ text: textOutput });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
    });
  });

  // Catch-all for undefined API routes to return a JSON 404 instead of falling through to Vite or SPA router
  app.all("/api/*all", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // API error handler to catch body parsing, routing or other issues in Express and respond with JSON
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API error handler caught:", err);
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "Internal API Error"
    });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
