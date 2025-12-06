// Provider tree that configures OnchainKit and shared clients for the app.
import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import '@coinbase/onchainkit/styles.css';
import { baseSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const DEFAULT_BASE_RPC = 'https://sepolia.base.org';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const rpcUrl = import.meta.env.VITE_BASE_RPC_URL || DEFAULT_BASE_RPC;
  const apiKey = import.meta.env.VITE_PUBLIC_ONCHAINKIT_API_KEY;
  // Create a public client for OnchainKit (used internally via rpcUrl prop)
  // Note: OnchainKitProvider does not accept `defaultPublicClients`; rely on rpcUrl.
  createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });

  if (!apiKey) {
    console.warn('VITE_PUBLIC_ONCHAINKIT_API_KEY is not set; Basename resolution and wallet helpers will be unavailable.');
  }

  return (
    <OnchainKitProvider
      apiKey={apiKey}
      chain={baseSepolia}
      rpcUrl={rpcUrl}
      config={{
        appearance: { mode: 'dark' },
        wallet: { display: 'modal' },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
