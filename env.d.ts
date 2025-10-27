/// <reference types="vite/client" />

// Typed declaration of the Vite environment variables used across the app.
declare global {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_PUBLIC_ONCHAINKIT_API_KEY?: string;
    readonly VITE_BASE_RPC_URL?: string;
    readonly VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS?: string;
    readonly VITE_FRACTAL_RECIPE_DEPLOY_BLOCK?: string;
    readonly VITE_AUTH_API_URL?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
    readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // Minimal Ethereum provider typing for MetaMask events we use
  interface EthereumProvider {
    on?: (event: 'accountsChanged', handler: (accounts: string[]) => void) => void;
    removeListener?: (event: 'accountsChanged', handler: (accounts: string[]) => void) => void;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
