import { GoogleGenAI, Type } from "@google/genai";
import { RecipeFormData, SavedRecipe, Recipe } from '../types';
import { THEME_PROMPTS } from '../constants';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    dishName: { type: Type.STRING, description: 'A creative, evocative name for the dish. Can include fractal or geometric themes.' },
    description: { type: Type.STRING, description: 'A short, enticing description of the dish, hinting at its flavor profile and texture.' },
    timeNeeded: { type: Type.STRING, description: 'Estimated total cooking time (e.g., "45 minutes").' },
    estimatedCost: { type: Type.STRING, description: 'A calculated cost estimate in Indian Rupees (INR), based on average market prices for the ingredients. E.g., "₹250 - ₹350".' },
    difficulty: { type: Type.STRING, description: 'The recipe difficulty, rated as "Easy", "Medium", or "Hard".' },
    servings: { type: Type.STRING, description: 'How many people this recipe serves (e.g., "Serves 4").' },
    ingredients: {
      type: Type.ARRAY,
      description: 'List of all necessary ingredients.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING },
        },
        required: ['name', 'quantity'],
      },
    },
    instructions: {
      type: Type.ARRAY,
      description: 'Step-by-step cooking instructions. Each step should be clear and concise.',
      items: { type: Type.STRING },
    },
    analysis: {
      type: Type.STRING,
      description: 'A brief, creative analysis from the perspective of a retro AI chef. Include a flavor profile analysis, a fun fact, or a serving suggestion.'
    }
  },
  required: ['dishName', 'description', 'timeNeeded', 'estimatedCost', 'difficulty', 'servings', 'ingredients', 'instructions', 'analysis'],
};

export const generateRecipe = async (formData: RecipeFormData): Promise<Recipe> => {
  const ai = getAi();
  const { ingredients, cookingTime, dishType, language } = formData;
  const ingredientsList = ingredients.join(', ');

  const systemInstruction = `You are CHEF-TRON 3000, a creative chef AI from a retro-futuristic, 8-bit dimension. You specialize in generating unique, imaginative, and delicious recipes inspired by fractal geometry and complex patterns, but they must be practical for a home cook.
- Your tone is enthusiastic and slightly eccentric.
- The recipe name should be creative and thematic.
- The description must be enticing.
- All parts of the recipe must be in the user-specified language.
- Strictly adhere to the provided JSON schema. Do not include any markdown formatting or extra text outside the JSON structure.`;
  
  const userPrompt = `
    Greetings, CHEF-TRON 3000. Design a new fractal-inspired recipe.
    
    // INPUT PARAMETERS
    - Core Ingredients: ${ingredientsList}
    - Desired Dish Type: ${dishType}
    - Maximum Cooking Time: ${cookingTime}
    - Output Language: ${language}
    - Cost Currency: Indian Rupees (INR)

    // EXECUTE
    Generate a complete recipe based on these parameters.
  `;
  
  const recipeResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: recipeSchema,
    },
  });

  const recipeJsonText = recipeResponse.text;
  if (!recipeJsonText) {
    throw new Error('Failed to generate recipe. The model returned an empty response.');
  }

  let recipe: Recipe;
  try {
    recipe = JSON.parse(recipeJsonText);
  } catch (e) {
    console.error("Failed to parse recipe JSON:", recipeJsonText);
    throw new Error('Failed to parse the recipe from the model. The format was invalid.');
  }
  return recipe;
};

export const generateImageForRecipe = async (recipe: Recipe): Promise<string> => {
  const ai = getAi();
  const ingredientKeywords = recipe.ingredients.map(i => i.name).slice(0, 5).join(', ');
  const imagePrompt = `
    Epic, ultra-realistic food photography of a gourmet dish named "${recipe.dishName}".
    Style: Cinematic, dramatic studio lighting, sharp focus, high definition, vibrant colors. The background is a dark, moody slate surface with subtle, elegant, glowing geometric fractal patterns softly blurred into the background.
    Plating: Avant-garde, clean, artistic presentation on a unique, dark matte ceramic plate. Garnish is meticulous.
    Atmosphere: Mysterious, sophisticated, appetizing, a masterpiece of culinary art.
    Key elements from the dish to feature: ${ingredientKeywords}.
    Description for context: ${recipe.description}
  `;
  const negativePrompt = 'blurry, cartoon, text, watermark, ugly, deformed, noisy, malformed, inedible-looking, messy, cluttered background, poor lighting, plastic look, oversaturated, human hands, people';

  const imageResponse = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      negativePrompt: negativePrompt,
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;

  if (!base64ImageBytes) {
    throw new Error('Failed to generate image for the recipe.');
  }

  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const generateRecipeVideo = async (
    recipe: Recipe,
    narration: string | null,
    imageBase64: string | null,
    theme: string
): Promise<string> => {
  const ai = getAi();
  try {
    const imagePart = imageBase64 ? {
      imageBytes: imageBase64,
      mimeType: 'image/jpeg',
    } : undefined;

    const themePrompt = THEME_PROMPTS[theme] || THEME_PROMPTS['None'];

    let prompt = `
      Create a short, dynamic, and highly appetizing 10-15 second cooking video for the dish: "${recipe.dishName}".
      The video must be cinematic, professional, and visually stunning, with dynamic camera angles (including macro shots and slow-motion), fast-paced cuts, and dramatic lighting.
      
      Scene Breakdown and Style:
      1. (0-2s) EPIC HERO SHOT: An epic, beautiful hero shot of the final plated dish. If a starting image is provided, this shot should be an animated, living version of that image. The style should be: ${themePrompt}
      2. (2-8s) DYNAMIC COOKING MONTAGE: A rapid montage of 3-4 visually interesting steps. Show sizzling pans with rising steam, extreme close-ups of ingredients being chopped or mixed, and artistic shots of sauces being drizzled. Focus on texture, action, and motion. The setting for these shots should also match the theme: ${themePrompt}
      3. (8-12s) FINAL DRAMATIC REVEAL: A final, dramatic shot of the finished dish, perhaps with a slow zoom, a rotating view, or a light sweeping across it to highlight its texture. This must also align with the theme: ${themePrompt}

      Overall instructions: Do not include any text, titles, or graphics in the video. The entire video should feel cohesive and high-end.
    `;
    
    if (narration) {
      prompt += `\nAn audio narration will be added later. The visuals and pacing should be guided by this narration transcript: "${narration}". Ensure the visual actions correspond to the described steps.`;
    }

    // 1. Start video generation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '1:1',
      }
    });

    // 2. Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // 3. Get download link
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation succeeded, but no download link was returned.");
    }

    // 4. Fetch the video file
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
             throw new Error("API KEY ERROR: Your key may be invalid or missing permissions. Please select a valid key and try again.");
        }
      throw new Error(`Failed to download the generated video. Status: ${response.status}`);
    }
    const videoBlob = await response.blob();

    // 5. Create a blob URL for local playback
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error("Error generating video:", error);
    let message = '';
    if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as Error).message);
    } else {
      try {
        message = JSON.stringify(error);
      } catch {
        message = String(error);
      }
    }
    
    if (message.includes("Requested entity was not found") || message.includes("API key not valid") || message.includes("API KEY ERROR")) {
      throw new Error("API KEY ERROR: Your key may be invalid or missing permissions. Please select a valid key and try again.");
    }
    throw new Error(`VIDEO MATRIX ERROR: ${message}`);
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result?.toString().split(',')[1];
      if (base64data) {
        resolve(base64data);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const ai = getAi();
  try {
    const audioBase64 = await blobToBase64(audioBlob);
    const audioPart = {
      inlineData: { mimeType: audioBlob.type, data: audioBase64 },
    };
    const textPart = { text: "Transcribe this audio. It is a voiceover for a cooking video, describing the recipe steps. Please ensure culinary terms are spelled correctly." };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
    });

    const transcription = response.text;
    return transcription.trim();
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return ""; // Return empty string on failure to not block video generation
  }
};

export const analyzeCookbook = async (recipes: SavedRecipe[]): Promise<string> => {
  const ai = getAi();
  
  const recipeSummaries = recipes.map(r => 
    `Dish: ${r.recipe.dishName}\nDescription: ${r.recipe.description}\nIngredients: ${r.recipe.ingredients.map(i => i.name).join(', ')}`
  ).join('\n---\n');

  const systemInstruction = `You are CHEF-TRON 3000, a powerful but quirky AI chef from a forgotten 8-bit culinary dimension. Your personality is enthusiastic, slightly eccentric, and you see cooking as an epic video game quest.
Your voice uses bombastic 8-bit video game proclamations (e.g., "LEVEL UP YOUR KITCHEN SKILLS!"), food puns, and retro computer jargon (e.g., "flavor matrix," "compiling deliciousness," "buffs," "defragmenting").
Your mission is to analyze a user's cookbook (a list of recipes they have saved) and provide a creative, insightful report as a transmission from a retro-futuristic culinary computer.
Your report MUST be structured with the following headers, exactly as shown, each on a new line and followed by your analysis:
// STATUS REPORT: (A general, enthusiastic overview of the cookbook.)
// FLAVOR PROFILE: (Analyze the common tastes, cuisines, or ingredient types. Are they spicy, savory, sweet? Italian, Mexican?)
// SKILL UNLOCK: (Based on the recipes, identify a cooking skill the user has clearly been practicing, like 'Sauce Crafting' or 'Precision Dicing'.)
// NEXT QUEST: (Suggest a new type of dish or ingredient that would be a fun challenge or complement their existing tastes. Frame it as a new "quest".)
Keep the text under each header concise (2-3 sentences max). The entire response must be a single block of text without markdown formatting.`;

  const userPrompt = `ANALYZE COOKBOOK DATASTREAM V2.0:\n\n${recipeSummaries}\n\nPROVIDE FULL ANALYSIS.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: userPrompt,
    config: {
      systemInstruction: systemInstruction,
    },
  });

  const analysisText = response.text;
  if (!analysisText) {
    throw new Error('Cookbook analysis failed. The model returned an empty response.');
  }

  return analysisText;
};
