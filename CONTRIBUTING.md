# Contributing to Fractal Recipe Generator

Thanks for your interest in contributing! This project is a Vite + React app with an Express auth server and Firebase (Admin + Client). Please take a moment to read this guide before opening an issue or pull request.

## Ground rules

- Be respectful and constructive.
- Keep secrets out of the repo. Never commit `.env` files or service‑account JSON.
- Prefer small, focused PRs. One logical change per PR.
- Include tests or a small e2e script when you change auth flows or server logic.

## Project structure

- Frontend: Vite + React + TS in the repo root
- Server: Express API in `server/index.js`
- Services: Frontend integrations in `services/`
- Contracts: Solidity sources + ABI in `contracts/`

## Prerequisites

- Node.js: Use Volta or nvm to pin a recent LTS (Node 20+). Example: `volta install node@20`.
- Package manager: npm
- Optional: A Firebase project for Admin + client auth testing

## Setup

1. Install dependencies
   ```bash
   npm ci
   ```
2. Create `.env` from `.env.example` and fill placeholders. For Firebase Admin, escape newlines in keys: `\n`.
3. Run local checks
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
4. Start servers
   ```bash
   npm run server     # Express on http://localhost:4000
   npm run dev        # Vite on http://localhost:5173
   ```

## Branching and commits

- Branch from `main` using `feature/<short-desc>` or `fix/<short-desc>`
- Use conventional commit style when possible: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`
- Keep commits tidy and rebased before opening a PR.

## Linting & type checking

- ESLint is configured with TypeScript support and `--max-warnings=0`.
- TypeScript is strict. Fix types rather than ignoring them.
- CI runs lint + typecheck + build.

### Pre-commit hooks

This repo uses Husky + lint-staged to prevent committing code that fails:

- Prettier formatting
- ESLint (no warnings allowed)
- TypeScript typecheck

If the hook fails, fix the errors and re-stage your changes before committing.

### CI pipeline

The unified `master-pipeline` workflow runs on every push and PR:

- Lint, typecheck, and build
- Dependency audit (high severity)
- CodeQL security analysis

## Testing

- Unit-level checks are done via typecheck and lint.
- For auth flows, use the provided e2e smoke test:
  ```bash
  npm run test:e2e-auth
  ```
  The script exercises email/password registration, login, OTP issuance, and reset flows against the running server.

## Secrets & CI

- Do NOT commit secrets.
- Use `.env` locally and `.env.example` for placeholders only.
- In GitHub, add secrets via: Repository → Settings → Secrets and variables → Actions.
- If you add new env vars, document them in `.env.example` and README.

## Submitting a PR

- Ensure: `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- Include screenshots or logs for UI/auth changes.
- Describe the change, testing steps, and risk/impact.

Thanks again for contributing!
