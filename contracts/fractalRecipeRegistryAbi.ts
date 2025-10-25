import type { Abi } from 'viem';

export const FRACTAL_RECIPE_REGISTRY_ABI: Abi = [
  {
    type: 'event',
    name: 'RecipeSynthesized',
    inputs: [
      { name: 'recipeId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'dishName', type: 'string', indexed: false },
      { name: 'metadataURI', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'storeRecipe',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dishName', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ name: 'recipeId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalRecipes',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getRecipe',
    stateMutability: 'view',
    inputs: [{ name: 'recipeId', type: 'uint256' }],
    outputs: [
      {
        components: [
          { name: 'creator', type: 'address' },
          { name: 'dishName', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
  },
  {
    type: 'function',
    name: 'getRecipes',
    stateMutability: 'view',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        components: [
          { name: 'creator', type: 'address' },
          { name: 'dishName', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: 'items',
        type: 'tuple[]',
      },
    ],
  },
];
