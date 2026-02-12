import { OpenAI } from "openai";

function calculateDaysPostOp(surgeryDateStr) {
  if (!surgeryDateStr) return null;
  
  let surgeryDate;
  if (surgeryDateStr.includes("/")) {
    const parts = surgeryDateStr.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      surgeryDate = new Date(year, month, day);
    } else {
      return null;
    }
  } else {
    surgeryDate = new Date(surgeryDateStr);
  }
  
  if (isNaN(surgeryDate.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  surgeryDate.setHours(0, 0, 0, 0);
  const diffTime = today - surgeryDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getPostOpPhase(daysPostOp) {
  if (daysPostOp === null || daysPostOp < 0) return null;
  if (daysPostOp >= 0 && daysPostOp <= 14) {
    return { phase: 1, days: daysPostOp, name: "Full Liquids" };
  } else if (daysPostOp >= 15 && daysPostOp <= 28) {
    return { phase: 2, days: daysPostOp, name: "Purees" };
  } else if (daysPostOp >= 29 && daysPostOp <= 42) {
    return { phase: 3, days: daysPostOp, name: "Soft Foods" };
  } else {
    return { phase: 4, days: daysPostOp, name: "Stabilization" };
  }
}

export async function analyzeFoodPhoto(imageBase64, userProfile) {
  if (!imageBase64) {
    return {
      error: "No image provided",
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const daysPostOp = calculateDaysPostOp(userProfile?.surgeryDate);
    const phaseInfo = getPostOpPhase(daysPostOp);

    let phaseContext = "";
    if (phaseInfo?.phase === 1) {
      phaseContext = "The patient is in Full Liquids phase (Days 0-14). Only liquid foods are allowed.";
    } else if (phaseInfo?.phase === 2) {
      phaseContext = "The patient is in Purees phase (Days 15-28). Food must be smooth, baby-food consistency.";
    } else if (phaseInfo?.phase === 3) {
      phaseContext = "The patient is in Soft Foods phase (Days 29-42). Food must be fork-tender.";
    } else {
      phaseContext = "The patient is in Stabilization phase. Solid foods are allowed, but avoid starches if less than 6 months post-op.";
    }

    const personalizationParts = [];
    if (userProfile?.hasDumpingSyndrome) {
      personalizationParts.push("Patient has dumping syndrome: avoid high-sugar and simple carbs in recommendations.");
    }
    if (userProfile?.hasDiabetes) {
      personalizationParts.push("Patient has diabetes: note carb content and suggest low-glycemic options when relevant.");
    }
    if (userProfile?.intolerances && userProfile.intolerances.length > 0) {
      personalizationParts.push(`Patient cannot tolerate: ${userProfile.intolerances.join(", ")}. Warn if the food contains these.`);
    }
    if (userProfile?.dislikedFoods && String(userProfile.dislikedFoods).trim()) {
      personalizationParts.push(`Patient dislikes: ${String(userProfile.dislikedFoods).trim()}. Note if the meal contains these.`);
    }
    if (userProfile?.favoriteCuisines && userProfile.favoriteCuisines.length > 0) {
      personalizationParts.push(`Patient likes cuisines: ${userProfile.favoriteCuisines.join(", ")}. Mention if the meal fits these preferences.`);
    }
    const personalizationContext = personalizationParts.length
      ? `Personalization: ${personalizationParts.join(" ")}`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert nutrition analysis assistant specializing in detailed food recognition for bariatric surgery patients. Your task is to identify EVERY food item visible in the image with maximum accuracy and detail.

CRITICAL INSTRUCTIONS:
1. Examine the ENTIRE image carefully - look at every part of the plate/food
2. Identify ALL individual food items present (e.g., if there's chicken, cucumber, lettuce, tomatoes - list them ALL)
3. Provide accurate estimates for each food item or the complete meal
4. Consider portion sizes visible in the image
5. If multiple items are present, combine their nutritional values OR provide a detailed breakdown

For the response, use this JSON format with COMPREHENSIVE nutritional information:
{
  "dishName": "Short main dish name only (e.g. 'Cheeseburger', 'Grilled Chicken')",
  "ingredients": ["Ingredient 1", "Ingredient 2", "Ingredient 3"],
  "name": "Full meal description for logging (e.g. 'Cheeseburger with Lettuce, Tomato, Pickles')",
  "calories": total calories for the entire meal,
  "protein": total protein in grams for the entire meal,
  "carbs": total carbs in grams for the entire meal,
  "fat": total fat in grams for the entire meal,
  "fiber": total fiber in grams for the entire meal,
  "sugar": total sugar in grams for the entire meal,
  "sodium": total sodium in milligrams for the entire meal,
  "vitamins": {
    "vitaminA": amount in mcg or IU (if significant),
    "vitaminC": amount in mg (if significant),
    "vitaminD": amount in mcg or IU (if significant),
    "vitaminE": amount in mg (if significant),
    "vitaminK": amount in mcg (if significant),
    "thiamin": amount in mg (if significant),
    "riboflavin": amount in mg (if significant),
    "niacin": amount in mg (if significant),
    "vitaminB6": amount in mg (if significant),
    "folate": amount in mcg (if significant),
    "vitaminB12": amount in mcg (if significant)
  },
  "minerals": {
    "calcium": amount in mg (if significant),
    "iron": amount in mg (if significant),
    "magnesium": amount in mg (if significant),
    "phosphorus": amount in mg (if significant),
    "potassium": amount in mg (if significant),
    "zinc": amount in mg (if significant)
  },
  "isAppropriate": true/false based on phase,
  "recommendation": brief recommendation or warning,
  "items": [optional array of individual items if multiple foods detected]
}

IMPORTANT: Include ALL nutritional values that are present in the food. If a nutrient is not present or negligible, you can omit it or set it to 0. Be thorough and accurate with all nutritional information.

Always set "dishName" to the main dish only (1–3 words). Set "ingredients" to an array of visible components (toppings, sides, garnishes). "name" stays the full description for records.

Be extremely thorough - do not miss any visible food items. If you see vegetables, fruits, proteins, grains, or any other food items, you must include them all in your analysis.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Carefully analyze this food image and identify EVERY food item visible on the plate. Look at the entire image - check for proteins, vegetables, fruits, grains, and any other food items. Provide accurate nutritional estimates for the complete meal including ALL items you can see. Consider portion sizes visible in the image.

Patient phase context: ${phaseContext}
${personalizationContext ? `\n${personalizationContext}\n` : ""}

In your "recommendation" field, tailor the message to the patient's phase and any personalization above (e.g. warn about intolerances or sugar if relevant). Be thorough and detailed. If you see multiple items (like chicken AND vegetables AND salad), make sure to identify and account for ALL of them in your nutritional calculations.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response content:", content.substring(0, 500));
      
      // Fallback parsing for basic nutrients if JSON parse fails
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/i) || 
                        content.match(/name["\s:]+([^"\n,}]+)/i) || 
                        content.match(/name[:\s]+([^\n,}]+)/i);
      const proteinMatch = content.match(/"protein"\s*:\s*(\d+\.?\d*)/i) || 
                           content.match(/protein["\s:]+(\d+\.?\d*)/i) || 
                           content.match(/protein[:\s]+(\d+\.?\d*)/i);
      const caloriesMatch = content.match(/"calories"\s*:\s*(\d+\.?\d*)/i) || 
                            content.match(/calories["\s:]+(\d+\.?\d*)/i) || 
                            content.match(/calories[:\s]+(\d+\.?\d*)/i);
      const carbsMatch = content.match(/"carbs"\s*:\s*(\d+\.?\d*)/i) || 
                         content.match(/carbs["\s:]+(\d+\.?\d*)/i) || 
                         content.match(/carbs[:\s]+(\d+\.?\d*)/i);
      const fatMatch = content.match(/"fat"\s*:\s*(\d+\.?\d*)/i) || 
                       content.match(/fat["\s:]+(\d+\.?\d*)/i) || 
                       content.match(/fat[:\s]+(\d+\.?\d*)/i);
      const fiberMatch = content.match(/"fiber"\s*:\s*(\d+\.?\d*)/i) || 
                         content.match(/fiber["\s:]+(\d+\.?\d*)/i) || 
                         content.match(/fiber[:\s]+(\d+\.?\d*)/i);
      const sugarMatch = content.match(/"sugar"\s*:\s*(\d+\.?\d*)/i) || 
                         content.match(/sugar["\s:]+(\d+\.?\d*)/i) || 
                         content.match(/sugar[:\s]+(\d+\.?\d*)/i);
      const sodiumMatch = content.match(/"sodium"\s*:\s*(\d+\.?\d*)/i) || 
                           content.match(/sodium["\s:]+(\d+\.?\d*)/i) || 
                           content.match(/sodium[:\s]+(\d+\.?\d*)/i);
      
      parsed = {
        name: nameMatch ? nameMatch[1].trim().replace(/["']/g, "") : "Food Item",
        protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
        calories: caloriesMatch ? parseFloat(caloriesMatch[1]) : 0,
        carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
        fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
        fiber: fiberMatch ? parseFloat(fiberMatch[1]) : 0,
        sugar: sugarMatch ? parseFloat(sugarMatch[1]) : 0,
        sodium: sodiumMatch ? parseFloat(sodiumMatch[1]) : 0,
        vitamins: {},
        minerals: {},
        isAppropriate: true,
        recommendation: content.substring(0, 300),
      };
    }
    
    let dishName = parsed.dishName;
    let ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
    const fullName = parsed.name || "Food Item";

    if (!dishName && fullName) {
      const withMatch = fullName.match(/^(.+?)\s+with\s+(.+)$/i);
      if (withMatch) {
        dishName = withMatch[1].trim();
        ingredients = withMatch[2].split(/\s*,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
      } else {
        dishName = fullName;
      }
    }
    if (!dishName) dishName = fullName;

    // Extract comprehensive nutritional data
    const nutritionData = {
      calories: parsed.calories || 0,
      protein: parsed.protein || 0,
      carbs: parsed.carbs || 0,
      fat: parsed.fat || 0,
      fiber: parsed.fiber || 0,
      sugar: parsed.sugar || 0,
      sodium: parsed.sodium || 0,
      vitamins: parsed.vitamins || {},
      minerals: parsed.minerals || {},
    };

    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const itemsName = parsed.items.map((item) => item.name || item).join(", ");
      return {
        success: true,
        name: parsed.name || itemsName || fullName,
        dishName: dishName || parsed.name || itemsName,
        ingredients,
        ...nutritionData,
        isAppropriate: parsed.isAppropriate !== false,
        recommendation: parsed.recommendation || "",
        items: parsed.items,
      };
    }

    return {
      success: true,
      name: fullName,
      dishName,
      ingredients,
      ...nutritionData,
      isAppropriate: parsed.isAppropriate !== false,
      recommendation: parsed.recommendation || "",
    };
  } catch (error) {
    console.error("Photo analysis error:", error);
    const msg = error?.message || String(error);
    if (msg.includes("API key") || msg.includes("api_key") || msg.includes("Incorrect API key") || msg.includes("Invalid API key")) {
      return { error: "OpenAI API key is missing or invalid. Check backend/.env and restart the server.", details: msg };
    }
    if (msg.includes("rate") || msg.includes("quota") || msg.includes("limit")) {
      return { error: "OpenAI rate limit or quota exceeded. Try again later.", details: msg };
    }
    return {
      error: "Failed to analyze photo. Please try again.",
      details: msg,
    };
  }
}

