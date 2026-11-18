import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE");
      if (!isTransient || attempt === maxAttempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

const ASSISTANCE_CATEGORIES = [
  "Medical Assistance",
  "Grocery Shopping",
  "Medicine Collection",
  "Transportation",
  "Hospital Visits",
  "Household Assistance",
  "Digital Assistance",
  "Bill Payments",
  "Companionship",
  "Other Assistance",
];

const SAFETY_SYSTEM_INSTRUCTION = `You are "ElderCare AI Assistant", a warm, patient, and respectful helper for ElderCare Connect — a community assistance network for elderly individuals and verified neighborhood volunteers.

CRITICAL SAFETY RULES:
1. NEVER diagnose diseases, interpret lab tests, prescribe medicines, or replace professional medical advice.
2. If the user describes any medical emergency (such as chest pain, difficulty breathing, severe bleeding, stroke symptoms, sudden confusion, unconsciousness, or a severe fall/injury), IMMEDIATELY and clearly instruct them to call their local emergency services (such as 112 / 108 in India or 911 in North America) right away instead of waiting for a community volunteer or relying on this assistant.
3. Keep language simple, calm, polite, and easy to read for older adults. Use short sentences and clear steps.
4. Support both English and Kannada (ಕನ್ನಡ) fluently. Respond in the requested language ("en" for English, "kn" for Kannada).
5. You can help with:
   - Explaining how to use the ElderCare Connect website (submitting a request, tracking a volunteer, confirming completion, reporting an issue).
   - Converting spoken/written descriptions into clear assistance requests.
   - Helping volunteers understand what an elderly person needs safely and respectfully.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    });
  });

  // 1. ElderCare AI Assistant (Navigation, guidance, volunteer briefing in EN / KN)
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: "Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in AI Studio Settings > Secrets.",
        });
        return;
      }

      const { message, language = "en", role = "elderly", history = [] } = req.body as {
        message?: string;
        language?: "en" | "kn";
        role?: string;
        history?: Array<{ sender: "user" | "assistant"; text: string }>;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: "Please enter a question or message." });
        return;
      }

      const langLabel = language === "kn" ? "Kannada (ಕನ್ನಡ)" : "English";
      const conversationContext = (history || [])
        .slice(-6)
        .map((h) => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}`)
        .join("\n");

      const prompt = `User role: ${role}
Preferred response language: ${langLabel}
Platform pages available: Home, Find Assistance, Create Assistance Request, Elderly Dashboard, Volunteer Dashboard, Request Tracking, Notifications, Feedback & Support.
${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ""}
User message: ${message.trim()}

Respond clearly in ${langLabel}. Keep your response concise, warm, and well-structured.`;

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction: SAFETY_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({
        reply: response.text ?? "I am here to help. Please let me know what you would like to do on ElderCare Connect.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to contact ElderCare AI Assistant.";
      res.status(500).json({ error: message });
    }
  });

  // 2. Voice / Freeform text -> Structured Assistance Request + Categorization + Safety Check
  app.post("/api/ai/parse-request", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: "Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in AI Studio Settings > Secrets.",
        });
        return;
      }

      const { transcript, language = "en" } = req.body as {
        transcript?: string;
        language?: "en" | "kn";
      };

      if (!transcript || !transcript.trim()) {
        res.status(400).json({ error: "Please provide a description or voice transcript to analyze." });
        return;
      }

      const langLabel = language === "kn" ? "Kannada (ಕನ್ನಡ)" : "English";

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Convert this user description into a structured community assistance request.
Allowed categories (pick exact match): ${ASSISTANCE_CATEGORIES.join(", ")}.
Preferred language for title and simplified_description: ${langLabel}.
Also detect if the description mentions any urgent medical emergency (chest pain, breathing trouble, fainting, severe bleeding, fall with injury). If so, set is_emergency=true and write a clear emergency_warning instructing them to call local emergency services (112/108/911) immediately.

User description: "${transcript.trim()}"`,
          config: {
            systemInstruction: SAFETY_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Short clear request title (5-9 words)" },
                category: { type: Type.STRING, description: "Exact category name from the allowed list" },
                simplified_description: {
                  type: Type.STRING,
                  description: "Clear, polite, easy-to-read description for both the elderly user and volunteer",
                },
                urgency: {
                  type: Type.STRING,
                  description: "One of: low, normal, high, urgent",
                },
                suggested_instructions: {
                  type: Type.STRING,
                  description: "Helpful non-medical preparation tip or volunteer note",
                },
                is_emergency: {
                  type: Type.BOOLEAN,
                  description: "True only if this sounds like an acute medical emergency",
                },
                emergency_warning: {
                  type: Type.STRING,
                  description: "Empty string if not emergency; otherwise clear instruction to call emergency services immediately",
                },
              },
              required: [
                "title",
                "category",
                "simplified_description",
                "urgency",
                "suggested_instructions",
                "is_emergency",
                "emergency_warning",
              ],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? "{}").trim());
      if (!ASSISTANCE_CATEGORIES.includes(parsed.category)) {
        parsed.category = "Other Assistance";
      }
      if (!["low", "normal", "high", "urgent"].includes(parsed.urgency)) {
        parsed.urgency = "normal";
      }

      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse assistance request.";
      res.status(500).json({ error: message });
    }
  });

  // 3. Simplify or Summarize Request for Elderly Users / Volunteers
  app.post("/api/ai/simplify", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: "Gemini API key is not configured on the server.",
        });
        return;
      }

      const { text, audience = "volunteer", language = "en" } = req.body as {
        text?: string;
        audience?: "elderly" | "volunteer";
        language?: "en" | "kn";
      };

      if (!text || !text.trim()) {
        res.status(400).json({ error: "Text is required." });
        return;
      }

      const langLabel = language === "kn" ? "Kannada (ಕನ್ನಡ)" : "English";
      const prompt =
        audience === "volunteer"
          ? `Summarize this assistance request in ${langLabel} into 3 concise bullet points so a community volunteer clearly understands what help is needed, what to bring or prepare, and any respectful reminder. Do not provide medical advice.\n\nRequest:\n${text.trim()}`
          : `Rewrite this message in ${langLabel} using very simple, large-print-friendly, warm sentences for an elderly person:\n\n${text.trim()}`;

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction: SAFETY_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({ summary: response.text ?? text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to simplify text.";
      res.status(500).json({ error: message });
    }
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ElderCare Connect server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
