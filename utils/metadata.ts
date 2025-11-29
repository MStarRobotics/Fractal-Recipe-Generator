// Helpers for encoding and decoding recipe metadata into onchain-friendly payloads.
import type { Recipe, SavedRecipe } from '../types';

const DATA_URI_PREFIX = 'data:application/json;base64,';

export interface OnchainRecipeMetadata {
  version: string;
  createdAt: number;
  recipe: Recipe;
  imageUrl: string;
}

const toBase64 = (value: string) => {
  // Prefer Web APIs when available
  if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    const binary = bytes.reduce((acc, byte) => acc + String.fromCodePoint(byte), '');
    return globalThis.btoa(binary);
  }

  // Node.js fallback
  type NodeBufferCtor = { from: (input: string, encoding: 'utf8' | 'base64') => { toString: (encoding: 'base64' | 'utf8') => string } };
  const maybeGlobal = typeof globalThis === 'object' ? (globalThis as unknown as { Buffer?: NodeBufferCtor }) : undefined;
  const bufferCtor = maybeGlobal?.Buffer;
  if (bufferCtor) {
    return bufferCtor.from(value, 'utf8').toString('base64');
  }

  throw new Error('Unable to encode metadata: no base64 encoder available.');
};

const fromBase64 = (value: string) => {
  // Prefer Web APIs when available
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // Node.js fallback
  type NodeBufferCtor = { from: (input: string, encoding: 'utf8' | 'base64') => { toString: (encoding: 'base64' | 'utf8') => string } };
  const maybeGlobal = typeof globalThis === 'object' ? (globalThis as unknown as { Buffer?: NodeBufferCtor }) : undefined;
  const bufferCtor = maybeGlobal?.Buffer;
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
