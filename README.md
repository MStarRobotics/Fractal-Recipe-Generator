# Fractal Recipe – Base Batches Builder Track Alpha

Fractal Recipe is a retro-futuristic AI cooking companion handcrafted by the team to anchor every synthesized recipe on **Base Sepolia** for the Base Batches Builder Track. The UI/UX remains pixel-perfect to the provided reference while fulfilling the onchain requirements (wallet connect, contract writes, cookbook reads, Basename resolution, and traceable transaction history).


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

Open [http://localhost:5173](http://localhost:5173) (or the URL printed by Vite). Connect MetaMask, switch/add Base Sepolia when prompted, and synthesize a recipe to push an onchain record.

## Onchain Architecture

| File | Purpose |
| --- | --- |
| [`contracts/FractalRecipeRegistry.sol`](contracts/FractalRecipeRegistry.sol) | Registry that enforces a one-time lifetime membership (0.01 ETH) before anchoring recipe metadata and emits `RecipeSynthesized` plus `LifetimeMembershipPurchased` events. |
| [`contracts/fractalRecipeRegistryAbi.ts`](contracts/fractalRecipeRegistryAbi.ts) | Type-safe ABI, including membership helpers, consumed by the frontend. |
| [`services/baseRegistry.ts`](services/baseRegistry.ts) | Wallet orchestration, Base Sepolia RPC management, membership price lookup/purchase, transaction submission, Basename lookup, and cookbook sync. |
| [`utils/metadata.ts`](utils/metadata.ts) | Base64 data-URI encoding/decoding for recipe payloads. |

### Deployment Flow

- **Step 1 – Deploy the registry:** Compile and deploy the contract on Base Sepolia (Hardhat, Foundry, or Remix).
  - Example with Foundry (assuming `forge` is installed):

    ```bash
    forge create --rpc-url https://sepolia.base.org --private-key <PRIVATE_KEY> contracts/FractalRecipeRegistry.sol:FractalRecipeRegistry
    ```

- **Step 2 – Verify on BaseScan:** Submit the flattened source to [BaseScan (Sepolia)](https://sepolia.basescan.org/verifyContract) for verification.
- **Step 3 – Wire up the frontend:** Record the contract address in `.env.local` as `VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS` (and optionally the deployment block).
- **Step 4 – Trigger an interaction:** Run `npm run dev` locally and use `SYNTHESIZE RECIPE` to log the first onchain transaction (MetaMask will automatically prompt to add/switch chains).
- **Step 5 – Archive proof:** Keep the resulting transaction hash for submission documentation; it is also persisted to localStorage (`fractalLastTx`).

### Frontend Wallet Experience

- A small **CONNECT WALLET** control (top-right) adds/switches to Base Sepolia via MetaMask and resolves Basenames via OnchainKit when available.
- `SYNTHESIZE RECIPE` now requires a connected wallet; after Gemini generates the payload, the dApp encodes metadata and invokes `storeRecipe`.
- The **Cookbook** modal merges local drafts with onchain entries, tagging onchain rows, surfacing transaction links, and allowing read-only viewing.

## Lifetime Membership Model

- Lifetime access costs **0.01 ETH** (configurable via the `LIFETIME_MEMBERSHIP_PRICE` constant) and is paid in Base Sepolia ETH.
- A **Lifetime Membership** panel (bottom-left of the UI) explains benefits and launches the `purchaseLifetimeMembership` transaction flow.
- Recipe synthesis is gated to active members. Non-members are prompted to purchase before new onchain entries are written.
- Contract owners can withdraw collected membership funds via the `withdraw(address)` helper once satisfied with accrued proceeds.

## Submission Checklist

Refer to [`BASE_BATCHES_CHECKLIST.md`](BASE_BATCHES_CHECKLIST.md) for the full Builder Track requirements distilled into executable steps (deployment proof, repo hygiene, demo video, and compliance notes).

### Documentation Expectations

- Include deployment details (contract address, tx hash) and a short Loom walkthrough (≥1 minute) when submitting.
- Acknowledge OFAC/Devfolio/Base terms inside your project README or submission deck.
- Ensure at least one successful Base Sepolia transaction prior to October 24 and provide the transaction link.

## Additional Notes

- The retro UI remains unchanged; all web3 controls follow the existing neon aesthetic.
- Lifetime membership pricing is surfaced directly in-app so reviewers can join (paying 0.01 ETH on Base Sepolia) before testing recipe synthesis.

Happy building! 🧪✨
