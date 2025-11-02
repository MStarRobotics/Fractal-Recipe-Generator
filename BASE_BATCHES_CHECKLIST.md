## Objective

Deliver Base Batches Builder Track–ready Fractal Recipe alpha without altering existing UI aesthetics.

## Steps

1. **Configure Base Sepolia RPC** – Update env/config to use `https://sepolia.base.org` with fallback Coinbase node; expose chainId `0x14a34`.
2. **Smart Contract Deployment** – Implement `FractalRecipeRegistry` storing recipe structs and emitting `RecipeSynthesized`; deploy + verify on Base Sepolia; save address & ABI JSON.
3. **Frontend Contract Hookup** – Wire `SYNTHESIZE RECIPE` to write via viem/ethers; ensure MetaMask transaction flow succeeds; persist tx hash for docs.
4. **Wallet Handling** – Add connect button; auto-prompt MetaMask to add/switch to Base Sepolia; surface connected address or resolved Basename.
5. **Cookbook Data** – Read latest recipes from contract for Cookbook view while keeping UI identical.
6. **Basename Support** – Use OnchainKit to resolve/display Basenames when available.
7. **Public Deployment** – Publish identical UI build to Vercel/Netlify with SSL; confirm app loads contract interactions.
8. **Repository Prep** – Push full source to public GitHub; include README with setup, deploy steps, contract info, tx proof, and compliance notices (OFAC, T&C, Devfolio CoC).
9. **Demo Video** – Record ≥1 min walkthrough covering intro, problem, solution, architecture, onchain demo; link in README/submission.
10. **Submission Assets** – Compile faucet links, advisor notes, resource credits usage, and attach required documentation before October 24 deadline.
