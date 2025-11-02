// Shared constants that drive form defaults, flavor copy, and theming cues.
export const COOKING_TIMES = ['< 30 min', '30-60 min', '> 1 hour'] as const;
export const DISH_TYPES = ['Main Course', 'Appetizer', 'Side Dish', 'Dessert'] as const;
export const LANGUAGES = ['English', 'Spanish', 'French', 'Hindi', 'Bengali'] as const;

export const COMMON_INGREDIENTS = [
  'Salt', 'Pepper', 'Olive Oil', 'Garlic', 'Onion', 'Tomato', 'Potato',
  'Carrot', 'Celery', 'Bell Pepper', 'Chicken', 'Beef', 'Pork', 'Fish',
  'Shrimp', 'Tofu', 'Rice', 'Pasta', 'Bread', 'Flour', 'Sugar', 'Egg',
  'Milk', 'Butter', 'Cheese', 'Lemon', 'Lime', 'Vinegar', 'Soy Sauce',
  'Mustard', 'Ketchup', 'Mayonnaise', 'Chili Powder', 'Paprika', 'Cumin',
  'Oregano', 'Thyme', 'Rosemary', 'Basil', 'Parsley', 'Cilantro', 'Ginger',
  'Turmeric', 'Cinnamon', 'Nutmeg', 'Honey', 'Maple Syrup', 'Mushroom',
  'Spinach', 'Broccoli', 'Corn', 'Peas', 'Beans', 'Lentils', 'Chickpeas',
  'Avocado', 'Cucumber', 'Zucchini', 'Eggplant', 'Lettuce', 'Cabbage',
  'Apple', 'Banana', 'Orange', 'Berries', 'Grapes', 'Yogurt', 'Cream',
  'Nuts', 'Chocolate', 'Coffee', 'Tea', 'Wine', 'Beer'
];

export const RECIPE_GENERATION_MESSAGES = [
  "CONNECTING TO CULINARY MATRIX",
  "ANALYZING FLAVOR VECTORS",
  "DEFRAGMENTING INGREDIENT DATA",
  "COMPILING GASTRONOMIC INSTRUCTIONS",
  "CALIBRATING TASTE SENSORS",
];

export const IMAGE_GENERATION_MESSAGES = [
  "SYNTHESIZING VISUAL DATA",
  "RENDERING PIXEL PALATE",
  "FOCUSING LENS ON FLAVOR",
  "DEVELOPING DIGITAL DELICACY",
];

export const VIDEO_GENERATION_MESSAGES = [
  "Preheating the digital oven",
  "Sourcing the freshest pixels",
  "Chopping video frames",
  "Simmering the rendering engine",
  "Plating the final cut",
  "Adding a dash of cinematic spice",
  "Your video is almost ready to serve",
];

export const ANALYSIS_MESSAGES = [
  "SCANNING COOKBOOK_V2.0",
  "DECRYPTING FLAVOR SIGNATURES",
  "CALCULATING CULINARY PROFILE",
  "PROJECTING NEXT QUEST...",
];

export const THEMATIC_BACKGROUNDS: Record<string, string> = {
  'None': '',
  'Cosmic Kitchen': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/cosmic.jpg',
  'Cyberpunk Diner': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/cyberpunk.jpg',
  'Enchanted Forest': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/forest.jpg',
};

export const THEME_PROMPTS: Record<string, string> = {
  'None': 'A clean, modern, professional food photography studio with bright, natural lighting.',
  'Cosmic Kitchen': 'A surreal, cosmic kitchen floating in a nebula. Stars and galaxies are visible through a large viewport. The cooking process uses shimmering, ethereal ingredients that leave trails of light. Utensils are sleek and futuristic. The final dish glows with an inner light.',
  'Cyberpunk Diner': 'A gritty, neon-lit cyberpunk diner on a rainy, perpetually dark city street. The video has a high-contrast, Blade Runner aesthetic. Food is presented with high-tech, glowing garnishes. Steam from the cooking should catch the neon light, creating a hazy, atmospheric effect.',
  'Enchanted Forest': 'An ancient, magical forest clearing bathed in soft, dappled sunlight filtering through a dense canopy. The cooking happens over a mystical, crackling fire or on moss-covered stones. Ingredients are vibrant and natural, some with a subtle magical glow. The process feels like an old-world, Ghibli-esque ritual.',
};
