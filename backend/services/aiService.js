function calculateDaysPostOp(surgeryDateStr) {
  if (!surgeryDateStr) {
    return null;
  }

  const surgeryDate = new Date(surgeryDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  surgeryDate.setHours(0, 0, 0, 0);

  const diffTime = today - surgeryDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getPostOpPhase(daysPostOp) {
  if (daysPostOp === null || daysPostOp < 0) {
    return { phase: null, days: daysPostOp };
  }

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

function buildSystemPrompt(phaseInfo) {
  if (!phaseInfo || !phaseInfo.phase) {
    return "You are a helpful nutrition assistant for bariatric surgery patients. Please ask the patient for their surgery date to provide personalized advice.";
  }

  const { phase, days, name } = phaseInfo;

  let prompt = `You are a medical nutrition assistant for bariatric surgery patients. The patient is Day ${days} post-op (${name} phase). `;

  if (phase === 1) {
    prompt += `STRICTLY FORBID solid foods. The patient is in the healing phase (Days 0-14). `;
    prompt += `Allowed: Protein shakes, skim milk, broth, sugar-free gelatin. `;
    prompt += `Forbidden: Caffeine, carbonation, straws, solid food. `;
    prompt += `Daily goals: 64oz fluids/day, 60-80g protein/day. `;
  } else if (phase === 2) {
    prompt += `Food must be 'baby food' consistency (smooth, no chunks). `;
    prompt += `Allowed: Greek yogurt, cottage cheese, pureed eggs, pureed meats. `;
    prompt += `Forbidden: Bread, rice, pasta, raw veggies. `;
  } else if (phase === 3) {
    prompt += `Food must be 'fork tender'. `;
    prompt += `Allowed: Soft fish, ground turkey, canned fruit (no sugar), soft cooked veggies. `;
    prompt += `Forbidden: Steak, dry meat, bread, rice, pasta (until 6 months). `;
  } else if (phase === 4) {
    const isLessThan6Months = days < 180;
    prompt += `Solids are allowed. `;
    if (isLessThan6Months) {
      prompt += `CRITICAL: Patient is less than 180 days (6 months) post-op. Strictly forbid starches (bread, rice, pasta) to maximize weight loss. `;
    } else {
      prompt += `Patient is 6+ months post-op. Continue healthy eating habits. `;
    }
  }

  prompt += `Always provide personalized, supportive, and medically accurate guidance based on their current phase. `;
  prompt += `CRITICAL FORMATTING RULES: You must write in plain text only. Do NOT use any markdown formatting whatsoever. Never use asterisks (*), hashtags (#), bold (**), italics (*), headers (###), bullet points (- or *), or any special formatting characters. Write in a natural, conversational tone as if you're a caring nutritionist talking to a friend. Use simple paragraph breaks. When listing items, just number them or use plain text like "First," "Second," "Next," etc. Use the patient's name when appropriate. Be concise but friendly. Never use phrases like "I understand" or "I'm here to help" - just answer naturally and directly.`;

  return prompt;
}

export async function getDietResponse(userId, userMessage, userProfile) {
  if (!userProfile || !userProfile.surgeryDate) {
    return {
      error: "User profile missing surgery date. Please update your profile with your surgery date.",
    };
  }

  const daysPostOp = calculateDaysPostOp(userProfile.surgeryDate);
  const phaseInfo = getPostOpPhase(daysPostOp);
  let systemPrompt = buildSystemPrompt(phaseInfo);
  
  if (userProfile.name) {
    systemPrompt += ` The patient's name is ${userProfile.name}. Use their name naturally in conversation.`;
  }
  
  if (userProfile.hasDumpingSyndrome) {
    systemPrompt += ` IMPORTANT: This patient has dumping syndrome. Always warn against high-sugar foods and explain why.`;
  }
  
  if (userProfile.intolerances && userProfile.intolerances.length > 0) {
    systemPrompt += ` The patient has food intolerances: ${userProfile.intolerances.join(", ")}. Avoid recommending these foods.`;
  }

  try {
    const OpenAI = await import("openai");
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
    });

    let responseText = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
    
    responseText = responseText
      .replace(/#{1,6}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/\*/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      response: responseText,
      phaseInfo,
      daysPostOp,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      error: "Failed to generate response. Please check API configuration.",
      details: error.message,
    };
  }
}
