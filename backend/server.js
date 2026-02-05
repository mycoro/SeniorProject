import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/check-key", (_req, res) => {
  const key = process.env.OPENAI_API_KEY;
  const set = Boolean(key && key.trim().length > 10);
  res.json({ openaiKeySet: set, keyLength: set ? key.trim().length : 0 });
});

function isAllowedImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    const host = (parsed.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

app.get("/api/image-proxy", async (req, res) => {
  try {
    const raw = req.query.url;
    if (!raw) {
      return res.status(400).send("Missing url");
    }
    const url = decodeURIComponent(String(raw));
    if (!isAllowedImageUrl(url)) {
      return res.status(400).send("Invalid url");
    }
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const imgRes = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "image/*" },
      redirect: "follow",
    });
    if (!imgRes.ok) {
      return res.status(imgRes.status).send("Image fetch failed");
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buf = await imgRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(502).send("Image unavailable");
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { userId, userMessage, userProfile, activitySummary, conversationHistory } = req.body;

    if (!userId || !userMessage) {
      return res.status(400).json({ error: "userId and userMessage are required" });
    }

    if (!userProfile) {
      return res.status(400).json({ error: "userProfile is required. Include surgeryDate from Firestore." });
    }

    const { getDietResponse } = await import("./services/aiService.js");
    const result = await getDietResponse(userId, userMessage, userProfile, activitySummary, conversationHistory);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined });
  }
});

app.post("/api/analyze-photo", async (req, res) => {
  try {
    const { imageBase64, userProfile } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    if (!userProfile) {
      return res.status(400).json({ error: "userProfile is required. Include surgeryDate from Firestore." });
    }

    const { analyzeFoodPhoto } = await import("./services/photoAnalysis.js");
    const result = await analyzeFoodPhoto(imageBase64, userProfile);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Photo analysis endpoint error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
