// Core engine for AI content generation (Recipes, Media, etc.)
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeFormData, SavedRecipe, Recipe } from '../types';
import { THEME_PROMPTS } from '../constants';

// Env check - supports both Vite and standard node process.env
const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
// Define valid type structure to avoid 'any'
type EnvWithProcess = { process?: { env?: { VITE_GEMINI_API_KEY?: string; GEMINI_API_KEY?: string } } };
const globalEnv = globalThis as unknown as EnvWithProcess;
const processKey = globalEnv.process?.env?.VITE_GEMINI_API_KEY || globalEnv.process?.env?.GEMINI_API_KEY;
const API_KEY = viteKey || processKey;

const initModel = () => {
    if (!API_KEY) {
        throw new Error('Missing API Key. Please check your .env file for VITE_GEMINI_API_KEY.');
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Schema definition for the recipe output
// Tweak this if the model starts hallucinating fields
const RECIPE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        dishName: { type: Type.STRING, description: 'Creative fractal-themed name' },
        description: { type: Type.STRING, description: 'Short, tasty description' },
        timeNeeded: { type: Type.STRING },
        estimatedCost: { type: Type.STRING, description: 'INR cost estimate' },
        difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
        servings: { type: Type.STRING },
        ingredients: {
            type: Type.ARRAY,
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
            items: { type: Type.STRING },
        },
        analysis: {
            type: Type.STRING,
            description: 'Fun Chef-Tron persona analysis'
        }
    },
    required: ['dishName', 'description', 'timeNeeded', 'estimatedCost', 'difficulty', 'servings', 'ingredients', 'instructions', 'analysis'],
};

export const generateRecipe = async (inputs: RecipeFormData): Promise<Recipe> => {
    const engine = initModel();
    const { ingredients, cookingTime, dishType, language } = inputs;

    // prompt engineering part
    const systemPrompt = `You are CHEF-TRON 3000. 8-bit retro-futuristic chef AI.
  Style: Quirky, enthusiastic, slightly erratic but professional.
  Goal: Create a fractal-inspired recipe that is actually cookable.
  Constraints:
  - Output Language: ${language}
  - Strict JSON output matching the schema.
  - No markdown, just raw JSON.`;

    const userPrompt = `New Order:
  - Ingredients: ${ingredients.join(', ')}
  - Type: ${dishType}
  - Time Limit: ${cookingTime}
  - Budget: INR
  
  Go!`;

    const result = await engine.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: userPrompt,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: RECIPE_SCHEMA,
        },
    });

    const rawText = result.text;
    if (!rawText) throw new Error('AI Engine stalled (empty response).');

    try {
        return JSON.parse(rawText) as Recipe;
    } catch {
        console.error("JSON Parse fail:", rawText);
        throw new Error('AI returned invalid JSON. It happens sometimes.');
    }
};

export const generateImageForRecipe = async (recipe: Recipe): Promise<string> => {
    const engine = initModel();

    // Pick top 5 ingredients for the prompt so we don't overflow the context window
    const keyIngredients = recipe.ingredients.map(i => i.name).slice(0, 5).join(', ');

    const prompt = `
    High-end food photography, "${recipe.dishName}".
    Style: Dark moody lighting, slate background, glowing fractal geometry patterns in bokeh.
    Plating: Avant-garde, Michelin star.
    Ingredients visible: ${keyIngredients}.
    Context: ${recipe.description}
  `;

    const negative = 'text, logo, blurry, cartoon, low res, bad hands, plastic';

    const res = await engine.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            negativePrompt: negative,
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1', // Instagram ready
        },
    });

    const bytes = res.generatedImages?.[0]?.image?.imageBytes;
    if (!bytes) throw new Error('Image gen failed.');

    return `data:image/jpeg;base64,${bytes}`;
};

export const generateRecipeVideo = async (
    recipe: Recipe,
    narration: string | null,
    base64Img: string | null,
    theme: string
): Promise<string> => {
    const engine = initModel();

    try {
        const themeStyle = THEME_PROMPTS[theme] || THEME_PROMPTS['None'];

        let prompt = `Create a 10s cinematic cooking video for "${recipe.dishName}".
    No text/overlays.
    Style: ${themeStyle}
    
    Shots:
    1. Hero shot of plated dish (start with static image if provided).
    2. Dynamic cooking action (close ups, steam, motion).
    3. Final reveal.`;

        if (narration) {
            prompt += `\nMatch pacing to voiceover: "${narration}"`;
        }

        // Start the video train
        const op = await engine.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            image: base64Img ? { imageBytes: base64Img, mimeType: 'image/jpeg' } : undefined,
            config: {
                resolution: '720p',
                aspectRatio: '1:1',
            },
        });

        // Simple poller
        let current = op;
        while (!current.done) {
            await new Promise(r => setTimeout(r, 10000)); // Sleep 10s
            current = await engine.operations.getVideosOperation({ operation: current });
        }

        const uri = current.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error('No video URI returned.');

        // Download it
        const dl = await fetch(`${uri}&key=${API_KEY}`);
        if (!dl.ok) throw new Error(`Video download check failed: ${dl.status}`);

        const blob = await dl.blob();
        return URL.createObjectURL(blob);

    } catch (err: unknown) {
        // catch any weird google errors
        let msg = 'Unknown error';
        if (err instanceof Error) {
            msg = err.message;
        } else {
             try {
                msg = JSON.stringify(err);
            } catch {
                msg = String(err);
            }
        }
        
        console.error('Video gen crashed:', msg);
        if (msg.includes('API key')) throw new Error('Check API Key permissions.');
        throw new Error('Video generation failed. Try again?');
    }
};

// Helper for audio processing
const blobB64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const parts = (reader.result as string).split(',');
            resolve(parts[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const transcribeAudio = async (audio: Blob): Promise<string> => {
    const engine = initModel();
    try {
        const b64 = await blobB64(audio);

        const res = await engine.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Transcribe this cooking voiceover perfectly." },
                    { inlineData: { mimeType: audio.type, data: b64 } }
                ]
            },
        });

        return res.text?.trim() || '';
    } catch (e) {
        console.error("Transcription dropped:", e);
        return "";
    }
};

export const analyzeCookbook = async (recipes: SavedRecipe[]): Promise<string> => {
    const engine = initModel();

    const data = recipes.map(r =>
        `Dish: ${r.recipe.dishName}, Ingreds: ${r.recipe.ingredients.map(i => i.name).join(', ')}`
    ).join('\n');

    const prompt = `Use your CHEF-TRON persona.
  Analyze this user's cookbook history.
  
  Format:
  // STATUS REPORT: (Overview)
  // FLAVOR PROFILE: (Taste analysis)
  // SKILL UNLOCK: (What are they good at?)
  // NEXT QUEST: (Suggestion)
  
  Keep it short and punchy. No markdown.
  
  Data:
  ${data}`;

    const res = await engine.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });

    return res.text || 'Analysis failed.';
};
