import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.post("/api/chat", async (req, res) => {
  try {
    const { userMessage, userProfile } = req.body;

    if (!userMessage) {
    return res.status(400).json({ error: "userMessage is required" });
    }

    if (!userProfile) {
      return res.status(400).json({ error: "userProfile is required. Include surgeryDate from Firestore." });
    }

    const { getDietResponse } = await import("./services/aiService.js");
    const result = await getDietResponse(userMessage, userProfile);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
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

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});
