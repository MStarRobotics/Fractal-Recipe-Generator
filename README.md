<div align="center">
  <img width="1200" height="475" alt="Fractal Recipe UI" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Fractal Recipe – Base Batches Builder Track Alpha

Fractal Recipe is a retro-futuristic AI cooking companion that now anchors every synthesized recipe on **Base Sepolia** for the Base Batches Builder Track. The UI/UX remains pixel-perfect to the provided reference while fulfilling the onchain requirements (wallet connect, contract writes, cookbook reads, Basename resolution, and traceable transaction history).

- Live demo (configure your own deployment): _TODO_
- AI Studio preview: https://ai.studio/apps/drive/1Z32TEU6UvuU06ODxnpaVB2JUdqys7_PK

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the template and populate the required values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Existing key for Gemini content generation (already referenced by the AI services). |
| `VITE_PUBLIC_ONCHAINKIT_API_KEY` | Client key from the [Coinbase Developer Platform](https://portal.cdp.coinbase.com/). Required for OnchainKit wallet + Basename services. |
| `VITE_BASE_RPC_URL` | Base Sepolia RPC URL (defaults to `https://sepolia.base.org`). Alternate RPCs can be added here. |
| `VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS` | Deployed `FractalRecipeRegistry` contract address on Base Sepolia. |
| `VITE_FRACTAL_RECIPE_DEPLOY_BLOCK` | (Optional) Block height where the registry was deployed. Speeds up event log queries. |

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173 (or the URL printed by Vite). Connect MetaMask, switch/add Base Sepolia when prompted, and synthesize a recipe to push an onchain record.

## Onchain Architecture

| File | Purpose |
| --- | --- |
| [`contracts/FractalRecipeRegistry.sol`](contracts/FractalRecipeRegistry.sol) | Minimal registry that stores recipe metadata URIs and emits `RecipeSynthesized` events. |
| [`contracts/fractalRecipeRegistryAbi.ts`](contracts/fractalRecipeRegistryAbi.ts) | Type-safe ABI consumed by the frontend. |
| [`services/baseRegistry.ts`](services/baseRegistry.ts) | Wallet orchestration, Base Sepolia RPC management, transaction submission, Basename lookup, and cookbook sync. |
| [`utils/metadata.ts`](utils/metadata.ts) | Base64 data-URI encoding/decoding for recipe payloads. |

### Deployment Flow

1. Compile and deploy the contract on Base Sepolia (Hardhat, Foundry, or Remix).
   ```bash
   # Example with Foundry (assuming forge is installed)
   forge create --rpc-url https://sepolia.base.org --private-key <PRIVATE_KEY> contracts/FractalRecipeRegistry.sol:FractalRecipeRegistry
   ```
2. Verify the contract on [BaseScan (Sepolia)](https://sepolia.basescan.org/verifyContract) using the flattened Solidity source if required.
3. Record the contract address in `.env.local` as `VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS` (and optionally the deployment block).
4. Run `npm run dev` locally and trigger `SYNTHESIZE RECIPE` to log the first onchain transaction (MetaMask will automatically prompt to add/switch chains).
5. Save the resulting transaction hash for submission documentation; it is also persisted to localStorage (`fractalLastTx`).

### Frontend Wallet Experience

- A small **CONNECT WALLET** control (top-right) adds/switches to Base Sepolia via MetaMask and resolves Basenames via OnchainKit when available.
- `SYNTHESIZE RECIPE` now requires a connected wallet; after Gemini generates the payload, the dApp encodes metadata and invokes `storeRecipe`.
- The **Cookbook** modal merges local drafts with onchain entries, tagging onchain rows, surfacing transaction links, and allowing read-only viewing.

## Submission Checklist

Refer to [`BASE_BATCHES_CHECKLIST.md`](BASE_BATCHES_CHECKLIST.md) for the full Builder Track requirements distilled into executable steps (deployment proof, repo hygiene, demo video, and compliance notes).

### Documentation Expectations

- Include deployment details (contract address, tx hash) and a short Loom walkthrough (≥1 minute) when submitting.
- Acknowledge OFAC/Devfolio/Base terms inside your project README or submission deck.
- Ensure at least one successful Base Sepolia transaction prior to October 24 and provide the transaction link.

## Additional Notes

- The retro UI remains unchanged; all web3 controls follow the existing neon aesthetic.
- Basename support is optional for users—if no name resolves, the truncated address is shown.
- The Gemini service remains untouched aside from the new onchain persistence hook.

Happy building! 🧪✨
