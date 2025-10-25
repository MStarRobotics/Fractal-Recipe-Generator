/// <reference types="vite/client" />

// Typed declaration of the Vite environment variables used across the app.
declare global {
  interface ImportMetaEnv {
    readonly VITE_PUBLIC_ONCHAINKIT_API_KEY?: string;
    readonly VITE_BASE_RPC_URL?: string;
    readonly VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS?: string;
    readonly VITE_FRACTAL_RECIPE_DEPLOY_BLOCK?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
