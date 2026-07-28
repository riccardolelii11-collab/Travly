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

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      const rephrased = response.text ? response.text.trim() : null;
      res.json({ rephrased });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: err?.message || "Failed to generate AI response" });
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
