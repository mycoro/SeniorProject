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

function buildSystemPrompt(phaseInfo, userProfile, activitySummary) {
  const patientName = userProfile?.name || "there";

  // Pre-Op: surgery date is in the future; we have full profile—never ask for date
  const isPreOp = userProfile?.isPreOp === true || (phaseInfo && phaseInfo.phase === "preOp");
  if (isPreOp) {
    let preOpPrompt = `You are ${patientName}'s personal bariatric nutrition coach. You have their full profile—never ask for their surgery date, name, or any details. Use only the data you were given. `;
    preOpPrompt += `WHO YOU ARE TALKING TO: ${patientName} is PRE-OP. Their surgery is scheduled for ${userProfile?.surgeryDate || "a future date"}. Surgery type: ${userProfile?.surgeryType || "bariatric"}. `;
    preOpPrompt += `Provide pre-operative guidance: preparing for surgery, pre-op diet (many programs use a 1–2 week liquid diet before surgery), what to expect, building healthy habits now, and answering their questions. Never ask them to provide their surgery date—you already have it. `;
    if (userProfile?.surgeryType) {
      preOpPrompt += `Surgery will be: ${userProfile.surgeryType}. `;
      if (userProfile.surgeryType === "Gastric Bypass" || userProfile.surgeryType === "Duodenal Switch") {
        preOpPrompt += `After surgery they will need to avoid sugar and simple carbs (dumping syndrome risk). `;
      }
    }
    preOpPrompt += buildCommonPromptSuffix(userProfile, activitySummary, patientName);
    preOpPrompt += `IMAGES: When you suggest foods or meals, call get_food_image_url 2-3 times with different dish names (e.g. one for breakfast, one for lunch) so we show 2-3 pictures in a row. In your text reply, write first something like "Here are some pictures of the foods" or "Here are a few ideas:" then describe the dishes—the images will appear below your text. Do not mention links or URLs. `;
    preOpPrompt += `VARIETY: If the user asks again for the same meal (e.g. "what for dinner" twice), suggest different dishes than you already recommended in this conversation. Do not repeat the same dish. `;
    preOpPrompt += `CRITICAL FORMATTING: 
    - When listing foods, recommendations, recipes, or steps, put each item on a NEW LINE
    - For recipes: List ingredients first (each on new line with measurements), then numbered steps (each on new line)
    - For food recommendations: List each food option on a new line with brief description
    - Use line breaks between items for readability
    - No markdown, no ![]() image syntax
    - Write like a caring nutritionist. No "I understand" or "I'm here to help"—answer directly.`;
    return preOpPrompt;
  }

  if (!phaseInfo || phaseInfo.phase == null) {
    return "You are a helpful nutrition assistant for bariatric surgery patients. Please ask the patient to complete their profile with their surgery date so you can provide personalized advice.";
  }

  const { phase, days, name } = phaseInfo;

  // Persona summary for deep personalization
  let prompt = `You are ${patientName}'s personal bariatric nutrition coach. You have their full profile—never ask for their surgery date, name, or any details. Use only the data you were given. `;

  prompt += `WHO YOU ARE TALKING TO: ${patientName}, Day ${days} post-op, ${name} phase. `;

  if (userProfile?.surgeryType) {
    prompt += `Surgery: ${userProfile.surgeryType}. `;
    if (userProfile.surgeryType === "Gastric Bypass" || userProfile.surgeryType === "Duodenal Switch") {
      prompt += `Higher risk of dumping and malabsorption—avoid sugar and simple carbs. `;
    }
  }

  if (phase === 1) {
    prompt += `CRITICAL: ${patientName} is in healing (Days 0-14). ONLY liquids: protein shakes, skim milk, broth, sugar-free gelatin. NO solids, caffeine, carbonation, or straws. Aim 64oz fluids, 60-80g protein. `;
  } else if (phase === 2) {
    prompt += `CRITICAL: ${patientName} is on purees. Everything must be smooth like baby food. Allowed: Greek yogurt, cottage cheese, pureed eggs/meats/veg. NO bread, rice, pasta, or chunks. `;
  } else if (phase === 3) {
    prompt += `CRITICAL: ${patientName} is on soft foods. Fork-tender only: soft fish, ground turkey, canned fruit (no added sugar), soft cooked veggies, scrambled eggs. NO steak, bread, rice, pasta. `;
  } else if (phase === 4) {
    const isLessThan6Months = days < 180;
    prompt += `${patientName} is in stabilization. `;
    if (isLessThan6Months) {
      prompt += `Under 6 months: NO starches (bread, rice, pasta, potatoes). `;
    } else {
      prompt += `6+ months: healthy portions, continue habits. `;
    }
  }

  prompt += buildCommonPromptSuffix(userProfile, activitySummary, patientName);

  // Image rules: proactive image for any food suggestion
  prompt += `IMAGES: When you suggest foods or meals, call get_food_image_url 2-3 times with different dish names (e.g. one for breakfast, one for lunch) so we show 2-3 pictures in a row. In your text reply, write first something like "Here are some pictures of the foods" or "Here are a few ideas:" then describe the dishes—the images will appear below your text. Do not mention links or URLs. `;
  prompt += `VARIETY: If the user asks again for the same meal (e.g. "what for dinner" twice), suggest different dishes than you already recommended in this conversation. Do not repeat the same dish. `;
  prompt += `CRITICAL FORMATTING: 
    - When listing foods, recommendations, recipes, or steps, put each item on a NEW LINE
    - For recipes: List ingredients first (each on new line with measurements), then numbered steps (each on new line)
    - For food recommendations: List each food option on a new line with brief description
    - Use line breaks between items for readability
    - No markdown, no ![]() image syntax
    - Write like a caring nutritionist. No "I understand" or "I'm here to help"—answer directly.`;

  return prompt;
}

function ageFromDateOfBirth(dateOfBirthStr) {
  if (!dateOfBirthStr || typeof dateOfBirthStr !== "string") return null;
  const trimmed = dateOfBirthStr.trim().slice(0, 10);
  if (!trimmed || trimmed.length < 10) return null;
  const parts = trimmed.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const birth = new Date(year, month, day);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

function buildCommonPromptSuffix(userProfile, activitySummary, patientName) {
  let s = "";
  const age = ageFromDateOfBirth(userProfile?.dateOfBirth);
  if (age != null) {
    s += `AGE: ${patientName} is ${age} years old. Tailor advice for their age when relevant (e.g. bone health, energy needs, life stage). `;
  }
  if (userProfile?.hasDumpingSyndrome) {
    s += `MEDICAL: ${patientName} has dumping syndrome. Never recommend high-sugar or simple carbs. `;
  }
  if (userProfile?.hasDiabetes) {
    s += `MEDICAL: ${patientName} has diabetes. Prioritize low-glycemic foods. `;
  }
  if (userProfile?.intolerances && Array.isArray(userProfile.intolerances) && userProfile.intolerances.length > 0) {
    s += `INTOLERANCES: ${userProfile.intolerances.join(", ")}. Never recommend these. `;
    if (userProfile.intolerances.includes("Lactose")) s += `Use lactose-free dairy. `;
    if (userProfile.intolerances.includes("Gluten")) s += `Gluten-free only. `;
    if (userProfile.intolerances.includes("Red Meat")) s += `Prefer poultry, fish, plant protein. `;
    if (userProfile.intolerances.includes("Eggs")) s += `No eggs. `;
  }
  s += `GOALS: `;
  if (userProfile?.proteinGoal) s += `Protein ${userProfile.proteinGoal}g/day. `;
  if (userProfile?.calorieGoal) s += `Calories ${userProfile.calorieGoal}/day. `;
  if (userProfile?.fluidGoal) s += `Fluids ${userProfile.fluidGoal}oz/day. `;
  if (!userProfile?.proteinGoal && !userProfile?.calorieGoal && !userProfile?.fluidGoal) s += `Encourage phase-appropriate goals. `;
  if (activitySummary && typeof activitySummary === "object" && (activitySummary.proteinToday != null || activitySummary.caloriesToday != null || activitySummary.fluidsToday != null)) {
    s += `TODAY SO FAR: `;
    if (activitySummary.proteinToday != null) s += `${activitySummary.proteinToday}g protein, `;
    if (activitySummary.caloriesToday != null) s += `${activitySummary.caloriesToday} calories, `;
    if (activitySummary.fluidsToday != null) s += `${activitySummary.fluidsToday}oz fluids. `;
    s += `Use this to personalize (e.g. "you've had Xg protein so far—aim for Y more"). `;
  }
  if (userProfile?.tastePreferences && typeof userProfile.tastePreferences === "object") {
    const t = userProfile.tastePreferences;
    const parts = [];
    if (t.sweet != null) parts.push(`sweet ${t.sweet}/5`);
    if (t.spicy != null) parts.push(`spicy ${t.spicy}/5`);
    if (t.savory != null) parts.push(`savory ${t.savory}/5`);
    if (t.bitter != null) parts.push(`bitter ${t.bitter}/5`);
    if (t.sour != null) parts.push(`sour ${t.sour}/5`);
    if (parts.length) s += `Tastes: ${parts.join(", ")}. Match these. `;
  }
  if (userProfile?.dislikedFoods && String(userProfile.dislikedFoods).trim()) {
    s += `Dislikes: ${String(userProfile.dislikedFoods).trim()}. Never suggest these. `;
  }
  if (userProfile?.favoriteCuisines && Array.isArray(userProfile.favoriteCuisines) && userProfile.favoriteCuisines.length > 0) {
    s += `Favorite cuisines: ${userProfile.favoriteCuisines.join(", ")}. Prefer these when fitting. `;
  }
  s += `Tailor meal ideas and portions to ${patientName}'s phase and goals. Use their name naturally. `;
  return s;
}

async function fetchDdgImage(ua, keywords) {
  const htmlRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(keywords)}&iax=images&ia=images`,
    {
      headers: {
        "User-Agent": ua,
        Accept: "text/html",
      },
    }
  );
  const html = await htmlRes.text();

  const vqdMatch =
    html.match(/vqd='([^']+)'/) ||
    html.match(/vqd="([^"]+)"/) ||
    html.match(/"vqd"\s*:\s*"([^"]+)"/);
  const vqd = vqdMatch?.[1];

  if (!vqd) {
    return { url: null, error: "DuckDuckGo token (vqd) not found" };
  }

  const jsonRes = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(keywords)}&vqd=${encodeURIComponent(vqd)}&f=,,,&p=1`,
    {
      headers: {
        "User-Agent": ua,
        Accept: "application/json",
        Referer: "https://duckduckgo.com/",
      },
    }
  );

  const data = await jsonRes.json().catch(() => null);

  if (!jsonRes.ok) {
    const message =
      data?.message ||
      data?.error ||
      `DuckDuckGo image search failed (HTTP ${jsonRes.status})`;
    return { url: null, error: message };
  }

  const results = data?.results || [];
  for (const r of results) {
    const url = r?.image || r?.thumbnail;
    if (url && typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
      return { url, error: null };
    }
  }

  return { url: null, error: "No image results found" };
}

async function getFoodImageUrl(query) {
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const trimmed = String(query || "").trim();
  if (!trimmed) {
    return { url: null, error: "Missing query" };
  }

  // Normalize: cap length, remove extra words for better image search relevance
  const words = trimmed.split(/\s+/).filter(Boolean);
  const primaryQuery = words.slice(0, 4).join(" ").slice(0, 50);

  const searchQueries = [
    `${primaryQuery} food dish`,
    `${primaryQuery} meal`,
    `${primaryQuery} food`,
    primaryQuery.split(/\s+/).length > 2 ? `${words.slice(0, 2).join(" ")} food` : null,
    `${primaryQuery} plate`,
  ].filter(Boolean);

  try {
    let result = { url: null, error: null };
    for (const keywords of searchQueries) {
      if (!keywords) continue;
      result = await fetchDdgImage(ua, keywords);
      if (result.url) break;
    }

    return result;
  } catch (error) {
    console.error("DuckDuckGo image search error:", error);
    return { url: null, error: "DuckDuckGo image search request failed" };
  }
}

export async function getDietResponse(userId, userMessage, userProfile, activitySummary, conversationHistory) {
  if (!userProfile || !userProfile.surgeryDate) {
    return {
      error: "User profile missing surgery date. Please update your profile with your surgery date.",
    };
  }

  const daysPostOp = calculateDaysPostOp(userProfile.surgeryDate);
  const isPreOp = userProfile.isPreOp === true || daysPostOp < 0;
  const phaseInfo = isPreOp
    ? { phase: "preOp", days: daysPostOp, name: "Pre-Op", surgeryDate: userProfile.surgeryDate }
    : getPostOpPhase(daysPostOp);
  const systemPrompt = buildSystemPrompt(phaseInfo, userProfile, activitySummary || null);
  if (!systemPrompt || typeof systemPrompt !== "string") {
    return {
      error: "Failed to build system prompt. Please check your profile data.",
    };
  }

  try {
    const OpenAI = await import("openai");
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const tools = [
      {
        type: "function",
        function: {
          name: "get_food_image_url",
          description: "Fetch one image URL for a specific food/dish. Call this 2-3 times with different dish names so we show 2-3 pictures in a row below your text. (1) For meal ideas or what to eat, call with 2-3 different dishes (e.g. 'Greek yogurt', 'chicken broth', 'scrambled eggs'). (2) You must then reply with text: start with something like 'Here are some ideas for you' or 'Here are a few options:' and briefly describe each dish. Never leave your text reply empty. Use short queries (2-4 words). Never mention links or URLs.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Exact dish or food name you are recommending (2-4 words), e.g. 'scrambled eggs', 'Greek yogurt', 'chicken broth', 'pureed carrots'. Use the same dish name you wrote in your reply so the image matches your suggestion. No sentences or questions.",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    const messages = [
      { role: "system", content: systemPrompt },
    ];
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-10);
      for (const msg of recent) {
        if (msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string" && msg.content.trim()) {
          messages.push({ role: msg.role, content: msg.content.trim() });
        }
      }
    }
    messages.push({ role: "user", content: userMessage });

    const imageUrls = [];
    const dishNames = [];
    let imageError = null;
    let finalResponseText = "";

    // When user asks about food/meals, force the model to call the image tool so we always show pictures
    const mealKeywords = [
      "breakfast", "lunch", "dinner", "snack", "meal plan", "what to eat", "what should i eat", "what should i have",
      "what can i eat", "what to have", "suggest", "recommend", "ideas for", "have today", "eat today", "today's meal",
      "today's food", "what's for", "foods to eat", "eating", "good to eat", "safe to eat", "can i eat", "meal ideas",
      "diet", "nutrition",
    ];
    const mealSuggestionIntent = mealKeywords.some((kw) =>
      String(userMessage).toLowerCase().includes(kw)
    );
    const forceImageTool = mealSuggestionIntent ? { type: "function", function: { name: "get_food_image_url" } } : "auto";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: forceImageTool,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
    });

    const message = completion.choices[0]?.message;
    finalResponseText = message?.content || "";

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "get_food_image_url") {
          let query = "";
          try {
            const args = JSON.parse(toolCall.function.arguments || "{}");
            query = String(args.query || "").trim();
          } catch {
            query = "";
          }

          const result = query ? await getFoodImageUrl(query) : { url: null, error: "Missing query" };
          
          if (result.url) {
            imageUrls.push(result.url);
            if (query) dishNames.push(query);
          } else if (result.error) {
            imageError = result.error;
          }

          messages.push({
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.url
              ? `Image found: ${result.url}`
              : `Image not found. Reason: ${result.error || "unknown"}`,
          });
        }
      }

      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
        max_tokens: 512,
      });

      const secondMessage = secondCompletion.choices[0]?.message;
      finalResponseText = secondMessage?.content || finalResponseText;
    }

    finalResponseText = finalResponseText
      .replace(/#{1,6}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/\*/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Remove any URLs and markdown image syntax so the chat never shows links or ![]()
    finalResponseText = finalResponseText
      .replace(/https?:\/\/[^\s)]+/gi, "")
      .replace(/!\[[^\]]*\]\s*\([^)]*\)/g, " ")
      .replace(/\s*\[?\s*here'?s?\s+(?:the\s+)?(?:image\s+)?link\.?\s*\]?/gi, " ")
      .replace(/\s*\(?\s*see\s+(?:the\s+)?(?:image\s+)?(?:at\s+)?(?:link|url)\.?\s*\)?/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/\n\s+\n/g, "\n\n")
      .trim();

    // If we have images but the model returned no text, generate real suggestion text from the dish names we fetched
    if (imageUrls.length > 0 && !finalResponseText) {
      if (dishNames.length > 0) {
        try {
          const dishList = [...new Set(dishNames)].slice(0, 5).join(", ");
          const gen = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `You are a bariatric nutrition coach. In one short, friendly paragraph (2-4 sentences), suggest these dishes to the patient: ${dishList}. Mention each dish briefly and why it fits. Plain text only, no bullets or links.`,
              },
            ],
            temperature: 0.6,
            max_tokens: 150,
          });
          const generated = (gen.choices[0]?.message?.content || "").trim();
          if (generated) finalResponseText = generated;
        } catch (err) {
          console.error("Fallback text generation error:", err);
        }
      }
      if (!finalResponseText) {
        finalResponseText = "Here are some ideas for you.";
      }
    }

    // Fallback: meal suggestion but still no images (tool wasn't called or search failed) — extract a dish and fetch one
    if (imageUrls.length === 0 && mealSuggestionIntent && finalResponseText.length > 20) {
      try {
        const extractCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `From this nutritionist response, extract exactly ONE food or dish name (2-4 words) that would work for an image search. Reply with ONLY that phrase, nothing else. No punctuation. Examples: Greek yogurt, chicken broth, scrambled eggs, protein shake.\n\nText:\n${finalResponseText.slice(0, 600)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 30,
        });
        const dishPhrase = (extractCompletion.choices[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "").slice(0, 50);
        if (dishPhrase.length >= 2) {
          const fallbackResult = await getFoodImageUrl(dishPhrase);
          if (fallbackResult.url) {
            imageUrls.push(fallbackResult.url);
            imageError = null;
          }
        }
      } catch (err) {
        console.error("Fallback image extraction error:", err);
      }
    }

    return {
      response: finalResponseText,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      image_error: imageUrls.length > 0 ? null : imageError,
      phaseInfo,
      daysPostOp,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    const msg = (error && error.message) ? String(error.message) : "";
    const hint = !process.env.OPENAI_API_KEY || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid")
      ? " Check backend/.env has a valid OPENAI_API_KEY and restart the backend (node server.js)."
      : "";
    return {
      error: "Failed to generate response. Please check API configuration." + hint,
      details: msg,
    };
  }
}
