import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Gemini endpoint
  app.post("/api/gemini/rephrase", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const { insightsText, lang } = req.body;
      if (!insightsText || !Array.isArray(insightsText) || insightsText.length === 0) {
        return res.json({ rephrased: null });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const promptLang = lang === "it" ? "italiano" : "inglese";
      const prompt = `Sei un assistente per la pianificazione di viaggi e finanza personale.
Sintetizza e riformula i seguenti punti di osservazione sul budget in un unico messaggio breve, amichevole e incoraggiante in lingua ${promptLang} (massimo 2-3 frasi).
REGOLE FONDAMENTALI:
1. Mantieni i dati e le cifre numeriche ESATTAMENTE identici come forniti.
2. Non inventare o alterare alcun numero o percentuale.
3. Se l'utente è in anticipo con i risparmi, NON suggerire MAI di anticipare il viaggio o partire prima: la data di partenza è fissa e il risparmio extra costituisce semplicemente un ottimo margine di sicurezza.

Punti sul budget da sintetizzare:
${insightsText.map((t: string) => `- ${t}`).join("\n")}`;

      const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let rephrased: string | null = null;
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response.text) {
            rephrased = response.text.trim();
            break;
          }
        } catch (err: any) {
          lastErr = err;
          // If rate limited or quota exceeded, try next model or break cleanly
          const msg = String(err?.message || err);
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
            console.warn(`Gemini model ${modelName} rate limited / quota exceeded. Trying fallback...`);
          } else {
            console.warn(`Gemini model ${modelName} error:`, msg);
          }
        }
      }

      if (rephrased) {
        return res.json({ rephrased });
      }

      // If all models failed or rate limited, return 200 with rephrased: null so app uses clean local insights
      return res.json({ rephrased: null, rateLimited: true });
    } catch (err: any) {
      console.warn("Gemini API request handling failed gracefully:", err?.message || err);
      return res.json({ rephrased: null, rateLimited: true });
    }
  });

  // Vite middleware for dev / static fallback for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
