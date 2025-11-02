// Shared TypeScript interfaces that describe recipes, forms, and UI state.
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
  cookingTime: (typeof COOKING_TIMES)[number];
  dishType: (typeof DISH_TYPES)[number];
  language: (typeof LANGUAGES)[number];
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

export interface AuthProfile {
  address: string;
  linkedGoogleId: string | null;
  wallets: string[];
  email?: string | null;
  displayName?: string | null;
}
