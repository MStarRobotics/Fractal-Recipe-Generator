import type { Recipe, SavedRecipe } from '../types';

const DATA_URI_PREFIX = 'data:application/json;base64,';

export interface OnchainRecipeMetadata {
  version: string;
  createdAt: number;
  recipe: Recipe;
  imageUrl: string;
}

const toBase64 = (value: string) => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(value)));
  }

  const maybeGlobal = typeof globalThis === 'object' ? (globalThis as Record<string, unknown>) : undefined;
  const bufferCtor = maybeGlobal && typeof maybeGlobal.Buffer === 'function'
    ? (maybeGlobal.Buffer as unknown as { from: (input: string, encoding: string) => { toString: (encoding: string) => string } })
    : undefined;
  if (bufferCtor) {
    return bufferCtor.from(value, 'utf8').toString('base64');
  }

  throw new Error('Unable to encode metadata: no base64 encoder available.');
};

const fromBase64 = (value: string) => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    return decodeURIComponent(escape(globalThis.atob(value)));
  }

  const maybeGlobal = typeof globalThis === 'object' ? (globalThis as Record<string, unknown>) : undefined;
  const bufferCtor = maybeGlobal && typeof maybeGlobal.Buffer === 'function'
    ? (maybeGlobal.Buffer as unknown as { from: (input: string, encoding: string) => { toString: (encoding: string) => string } })
    : undefined;
  if (bufferCtor) {
    return bufferCtor.from(value, 'base64').toString('utf8');
  }

  throw new Error('Unable to decode metadata: no base64 decoder available.');
};

export const encodeRecipeMetadata = (saved: SavedRecipe): string => {
  const payload: OnchainRecipeMetadata = {
    version: '1',
    createdAt: Date.now(),
    recipe: saved.recipe,
    imageUrl: saved.imageUrl,
  };

  const json = JSON.stringify(payload);
  const base64 = toBase64(json);
  return `${DATA_URI_PREFIX}${base64}`;
};

export const decodeRecipeMetadata = (uri: string): OnchainRecipeMetadata | null => {
  if (!uri.startsWith(DATA_URI_PREFIX)) {
    return null;
  }

  try {
    const base64 = uri.slice(DATA_URI_PREFIX.length);
    const json = fromBase64(base64);
    return JSON.parse(json) as OnchainRecipeMetadata;
  } catch (error) {
    console.error('Failed to decode recipe metadata', error);
    return null;
  }
};

export const buildFallbackRecipe = (dishName: string, creator: string): Recipe => ({
  dishName,
  description: 'Onchain recipe entry synced from Base.',
  timeNeeded: 'Unknown',
  estimatedCost: 'Unknown',
  difficulty: 'Unknown',
  servings: 'Unknown',
  ingredients: [
    {
      name: 'Onchain provenance',
      quantity: '1 record',
    },
  ],
  instructions: [
    `Recipe stored by ${creator}`,
    'Metadata payload missing or unreadable.',
  ],
});
