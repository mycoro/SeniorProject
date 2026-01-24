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

For the response, use this JSON format:
{
  "name": "Complete meal description including ALL items (e.g., 'Grilled Chicken with Cucumber and Lettuce Salad')",
  "protein": total protein in grams for the entire meal,
  "calories": total calories for the entire meal,
  "carbs": total carbs in grams for the entire meal,
  "isAppropriate": true/false based on phase,
  "recommendation": brief recommendation or warning,
  "items": [optional array of individual items if multiple foods detected]
}

Be extremely thorough - do not miss any visible food items. If you see vegetables, fruits, proteins, grains, or any other food items, you must include them all in your analysis.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Carefully analyze this food image and identify EVERY food item visible on the plate. Look at the entire image - check for proteins, vegetables, fruits, grains, and any other food items. Provide accurate nutritional estimates for the complete meal including ALL items you can see. Consider portion sizes visible in the image.

Patient phase context: ${phaseContext}

Be thorough and detailed. If you see multiple items (like chicken AND vegetables AND salad), make sure to identify and account for ALL of them in your nutritional calculations.`,
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
      max_tokens: 1000,
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
      
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/i) || 
                        content.match(/name["\s:]+([^"\n,}]+)/i) || 
                        content.match(/name[:\s]+([^\n,}]+)/i);
      const proteinMatch = content.match(/"protein"\s*:\s*(\d+)/i) || 
                           content.match(/protein["\s:]+(\d+)/i) || 
                           content.match(/protein[:\s]+(\d+)/i);
      const caloriesMatch = content.match(/"calories"\s*:\s*(\d+)/i) || 
                            content.match(/calories["\s:]+(\d+)/i) || 
                            content.match(/calories[:\s]+(\d+)/i);
      const carbsMatch = content.match(/"carbs"\s*:\s*(\d+)/i) || 
                         content.match(/carbs["\s:]+(\d+)/i) || 
                         content.match(/carbs[:\s]+(\d+)/i);
      
      parsed = {
        name: nameMatch ? nameMatch[1].trim().replace(/["']/g, "") : "Food Item",
        protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
        calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
        isAppropriate: true,
        recommendation: content.substring(0, 300),
      };
    }
    
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const fullName = parsed.items.map(item => item.name || item).join(", ");
      return {
        success: true,
        name: parsed.name || fullName || "Food Item",
        protein: parsed.protein || 0,
        calories: parsed.calories || 0,
        carbs: parsed.carbs || 0,
        isAppropriate: parsed.isAppropriate !== false,
        recommendation: parsed.recommendation || "",
        items: parsed.items,
      };
    }
    
    return {
      success: true,
      name: parsed.name || "Food Item",
      protein: parsed.protein || 0,
      calories: parsed.calories || 0,
      carbs: parsed.carbs || 0,
      isAppropriate: parsed.isAppropriate !== false,
      recommendation: parsed.recommendation || "",
    };
  } catch (error) {
    console.error("Photo analysis error:", error);
    return {
      error: "Failed to analyze photo. Please try again.",
      details: error.message,
    };
  }
}

