import { OpenAI } from "openai";
import { Readable } from "stream";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribe + translate audio to English using Whisper.
 * Uses the "translations" endpoint which auto-translates any language to English.
 * @param {Buffer} audioBuffer - raw audio bytes
 * @param {string} mimeType - e.g. "audio/webm", "audio/m4a"
 * @returns {Promise<string>} English text
 */
export async function transcribeAudio(audioBuffer, mimeType = "audio/webm") {
  const ext = mimeType.includes("m4a") ? "m4a"
    : mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("wav") ? "wav"
    : "webm";

  const file = await OpenAI.toFile(
    Readable.from(audioBuffer),
    `recording.${ext}`,
    { type: mimeType }
  );

  const result = await openai.audio.translations.create({
    model: "whisper-1",
    file,
  });

  return result.text;
}

/**
 * Parse a natural-language meal description into structured food items with macros.
 * Uses gpt-4o-mini for speed.
 * @param {string} text - English meal description
 * @param {object} userProfile - user's bariatric profile for context
 * @returns {Promise<Array<{food_name: string, grams: number, calories: number, protein: number, carbs: number, fat: number}>>}
 */
export async function parseMealText(text, userProfile) {
  const daysPostOp = calculateDaysPostOp(userProfile?.surgeryDate);
  const phaseInfo = getPostOpPhase(daysPostOp);
  const phaseCtx = phaseInfo
    ? `Patient is ${daysPostOp} days post-op, Phase ${phaseInfo.phase}: ${phaseInfo.name}.`
    : "Patient phase unknown.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `You are a clinical AI diet parser for bariatric surgery patients.

Given a user's meal description, extract the distinct food items and estimate their nutritional content.

Return ONLY a valid JSON object with this exact shape:
{
  "dishName": "Overall meal name (e.g. 'Dal Bhat and Chicken')",
  "items": [
    {
      "food_name": "Name of food item",
      "grams": estimated weight in grams,
      "calories": estimated calories,
      "protein": estimated protein in grams,
      "carbs": estimated carbs in grams,
      "fat": estimated fat in grams
    }
  ]
}

CRITICAL RULES:
1. Our patients are post-op with severely reduced stomach capacities.
2. If the user does NOT explicitly state a weight or portion size, you MUST default to bariatric-sized portions:
   - Proteins/meats: 60-85g (2-3 oz)
   - Carb sides (rice, bread, pasta): 60g (1/4 cup cooked)
   - Soups/liquids: 120-180ml (4-6 oz)
   - Vegetables: 60-85g
   - Fruits: 60g
   Do NOT assume restaurant-sized or standard adult portions.
3. If the user specifies a portion (e.g. "a full plate", "a bowl", "1 cup"), respect that.
4. Translate any non-English food names to English in your response.
5. Be accurate with calorie and macro calculations for the given gram amounts.
6. ${phaseCtx}

Return ONLY the JSON, no markdown, no explanation.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "";

  let parsed;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in LLM response");
    }
  } catch (err) {
    console.error("parseMealText JSON error:", err, "\nRaw:", content.substring(0, 500));
    throw new Error("Failed to parse meal description. Please try again.");
  }

  const dishName = parsed.dishName || text;
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const item of items) {
    item.calories = Number(item.calories) || 0;
    item.protein = Number(item.protein) || 0;
    item.carbs = Number(item.carbs) || 0;
    item.fat = Number(item.fat) || 0;
    item.grams = Number(item.grams) || 0;
    totalCalories += item.calories;
    totalProtein += item.protein;
    totalCarbs += item.carbs;
    totalFat += item.fat;
  }

  return {
    dishName,
    items,
    totals: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    },
  };
}

function calculateDaysPostOp(surgeryDateStr) {
  if (!surgeryDateStr) return null;
  let surgeryDate;
  if (surgeryDateStr.includes("/")) {
    const parts = surgeryDateStr.split("/");
    if (parts.length === 3) {
      surgeryDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else return null;
  } else {
    surgeryDate = new Date(surgeryDateStr);
  }
  if (isNaN(surgeryDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  surgeryDate.setHours(0, 0, 0, 0);
  return Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24));
}

function getPostOpPhase(daysPostOp) {
  if (daysPostOp === null || daysPostOp < 0) return null;
  if (daysPostOp <= 14) return { phase: 1, name: "Full Liquids" };
  if (daysPostOp <= 28) return { phase: 2, name: "Purees" };
  if (daysPostOp <= 42) return { phase: 3, name: "Soft Foods" };
  return { phase: 4, name: "Stabilization" };
}
