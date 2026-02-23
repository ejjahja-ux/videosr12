import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Specific Kie.ai Video Generation Endpoint
  app.post("/api/generate-video", async (req, res) => {
    try {
      const kieApiKey = process.env.KIE_API_KEY;
      if (!kieApiKey) {
        return res.status(500).json({ error: "KIE_API_KEY is not configured on the server" });
      }

      const response = await fetch('https://api.kie.ai/v1/video/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kieApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Kie generation error:", error);
      res.status(500).json({ error: "Video generation failed" });
    }
  });

  // API Proxy Route for other third-party APIs
  app.post("/api/proxy", async (req, res) => {
    const { url, method, body, headers: clientHeaders } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const kieApiKey = process.env.KIE_API_KEY;
      
      const response = await fetch(url, {
        method: method || "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${kieApiKey}`,
          ...clientHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to proxy request" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
