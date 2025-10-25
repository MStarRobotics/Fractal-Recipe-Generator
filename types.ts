import { COOKING_TIMES, DISH_TYPES, LANGUAGES } from './constants';

export interface Recipe {
  dishName: string;
  description: string;
  timeNeeded: string;
  estimatedCost: string;
  difficulty: string;
  servings: string;
  ingredients: {
    name: string;
    quantity: string;
  }[];
  instructions: string[];
  analysis?: string;
}

export interface RecipeFormData {
  ingredients: string[];
  cookingTime: typeof COOKING_TIMES[number];
  dishType: typeof DISH_TYPES[number];
  language: typeof LANGUAGES[number];
}

export type RecipeSource = 'local' | 'onchain';

export interface SavedRecipe {
  recipe: Recipe;
  imageUrl: string;
  source?: RecipeSource;
  metadataUri?: string;
  txHash?: string;
  creator?: string;
  createdAt?: number;
}

export type LoadingState = 'idle' | 'recipe' | 'transition' | 'image';