// Blockchain helpers for wallet connectivity, membership management, and cookbook syncing.
import { createWalletClient, createPublicClient, custom, http, parseAbiItem, type Address, type Hex } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { FRACTAL_RECIPE_REGISTRY_ABI, type FractalRecipeRegistryAbi } from '../contracts/fractalRecipeRegistryAbi';
import type { SavedRecipe } from '../types';
import { buildFallbackRecipe, decodeRecipeMetadata, encodeRecipeMetadata } from '../utils/metadata';
import { getName } from '@coinbase/onchainkit/identity';

const DEFAULT_BASE_RPC = 'https://sepolia.base.org';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34';
export const DEFAULT_MEMBERSHIP_PRICE_WEI = 10_000_000_000_000_000n; // 0.01 ether

const rpcUrl = import.meta.env.VITE_BASE_RPC_URL || DEFAULT_BASE_RPC;
const contractAddressEnv = import.meta.env.VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS;
const contractAddress = contractAddressEnv ? (contractAddressEnv as Address) : undefined;
const deployBlock = import.meta.env.VITE_FRACTAL_RECIPE_DEPLOY_BLOCK
  ? BigInt(import.meta.env.VITE_FRACTAL_RECIPE_DEPLOY_BLOCK)
  : 0n;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

const registryAbi: FractalRecipeRegistryAbi = FRACTAL_RECIPE_REGISTRY_ABI;

const recipeSynthesizedEvent = parseAbiItem('event RecipeSynthesized(uint256 indexed recipeId, address indexed creator, string dishName, string metadataURI, uint256 timestamp)');

type EIP1193Provider = {
  request: (payload: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

const isEip1193Provider = (val: unknown): val is EIP1193Provider => {
  return !!val && typeof (val as { request?: unknown }).request === 'function';
};

const getInjectedProvider = (): EIP1193Provider => {
  const globalWindow = typeof globalThis === 'object'
    ? (globalThis as unknown as Window & { ethereum?: unknown })
    : undefined;

  if (!isEip1193Provider(globalWindow?.ethereum)) {
    throw new Error('MetaMask not detected. Install MetaMask to continue.');
  }
  return globalWindow.ethereum;
};

const ensureBaseSepolia = async (provider: EIP1193Provider) => {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const code = (error as { code?: number }).code;
    if (code === 4902 || message.includes('unrecognized chain')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BASE_SEPOLIA_CHAIN_ID,
            chainName: 'Base Sepolia',
            rpcUrls: [rpcUrl, DEFAULT_BASE_RPC],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          },
        ],
      });
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
      });
      return;
    }
    throw error;
  }
};

export const connectWallet = async (): Promise<Address> => {
  const provider = getInjectedProvider();
  await ensureBaseSepolia(provider);
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) {
    throw new Error('Wallet connection rejected.');
  }
  return accounts[0] as Address;
};

export const recordRecipeOnchain = async (
  account: Address,
  savedRecipe: SavedRecipe,
): Promise<Hex> => {
  if (!contractAddress) {
    throw new Error('Contract address missing. Set VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS before recording recipes.');
  }

  const provider = getInjectedProvider();
  await ensureBaseSepolia(provider);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(provider),
  });

  const metadataUri = encodeRecipeMetadata(savedRecipe);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: registryAbi,
    functionName: 'storeRecipe',
    args: [savedRecipe.recipe.dishName, metadataUri],
    account,
    chain: baseSepolia,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
};

export const fetchMembershipPrice = async (): Promise<bigint> => {
  if (!contractAddress) {
    return DEFAULT_MEMBERSHIP_PRICE_WEI;
  }

  try {
    return await publicClient.readContract({
      address: contractAddress,
      abi: registryAbi,
      functionName: 'LIFETIME_MEMBERSHIP_PRICE',
    });
  } catch (error) {
    console.warn('Failed to read membership price, using default.', error);
    return DEFAULT_MEMBERSHIP_PRICE_WEI;
  }
};

export const checkLifetimeMembership = async (account: Address): Promise<boolean> => {
  if (!contractAddress) {
    return false;
  }

  try {
    return await publicClient.readContract({
      address: contractAddress,
      abi: registryAbi,
      functionName: 'isLifetimeMember',
      args: [account],
    });
  } catch (error) {
    console.warn('Failed to check lifetime membership', error);
    return false;
  }
};

export const purchaseLifetimeMembership = async (account: Address, priceOverride?: bigint): Promise<Hex> => {
  if (!contractAddress) {
    throw new Error('Contract address missing. Set VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS before purchasing membership.');
  }

  const provider = getInjectedProvider();
  await ensureBaseSepolia(provider);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(provider),
  });

  const value = priceOverride ?? (await fetchMembershipPrice());

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: registryAbi,
    functionName: 'purchaseLifetimeMembership',
    args: [],
    value,
    account,
    chain: baseSepolia,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
};

export const fetchOnchainCookbook = async (limit = 12): Promise<SavedRecipe[]> => {
  if (!contractAddress) {
    return [];
  }

  const total = await publicClient.readContract({
    address: contractAddress,
    abi: registryAbi,
    functionName: 'totalRecipes',
  });

  if (total === 0n) {
    return [];
  }

  const clamped = Math.min(Number(total), limit);
  const startIndex = Number(total) - clamped;

  const rawRecipes = await publicClient.readContract({
    address: contractAddress,
    abi: registryAbi,
    functionName: 'getRecipes',
    args: [BigInt(startIndex), BigInt(clamped)],
  });

  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: recipeSynthesizedEvent,
    fromBlock: deployBlock,
    toBlock: 'latest',
  });

  const transactionMap = new Map<number, Hex>();
  for (const log of logs) {
    const id = Number(log.args?.recipeId ?? 0n);
    if (!Number.isNaN(id) && log.transactionHash) {
      transactionMap.set(id, log.transactionHash);
    }
  }

  return rawRecipes.map((entry, index) => {
    const decoded = decodeRecipeMetadata(entry.metadataURI);
    const fallbackRecipe = buildFallbackRecipe(entry.dishName, entry.creator);

    return {
      recipe: decoded?.recipe ?? fallbackRecipe,
      imageUrl: decoded?.imageUrl ?? '',
      metadataUri: entry.metadataURI,
      source: 'onchain',
      creator: entry.creator,
      createdAt: Number(entry.createdAt) * 1000,
      txHash: transactionMap.get(startIndex + index) ?? undefined,
    } satisfies SavedRecipe;
  });
};

export const resolveBasename = async (address: Address): Promise<string | null> => {
  try {
    const result = await getName({ address, chain: base });
    return result ?? null;
  } catch (error) {
    console.warn('Basename lookup failed', error);
    return null;
  }
};
