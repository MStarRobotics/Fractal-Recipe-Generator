// ABI definition for the FractalRecipeRegistry contract consumed by viem.
import type { Abi } from 'viem';

export const FRACTAL_RECIPE_REGISTRY_ABI = [
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
    type: 'event',
    name: 'LifetimeMembershipPurchased',
    inputs: [
      { name: 'member', type: 'address', indexed: true },
      { name: 'amountPaid', type: 'uint256', indexed: false },
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
    name: 'purchaseLifetimeMembership',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isLifetimeMember',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'isMember', type: 'bool' }],
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
  {
    type: 'function',
    name: 'LIFETIME_MEMBERSHIP_PRICE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [],
  },
] as const satisfies Abi;

export type FractalRecipeRegistryAbi = typeof FRACTAL_RECIPE_REGISTRY_ABI;
