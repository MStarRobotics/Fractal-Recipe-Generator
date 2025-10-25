<div align="center">

# Fractal Recipe Generator

[![Vite](https://img.shields.io/badge/Vite-Build-blue)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-2b6cff)](https://www.base.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)](LICENSE.md)

Retro‑arcade web app that generates recipes with AI and anchors them on‑chain. MetaMask (SIWE) + Google sign‑in, built with Vite + React, viem/wagmi, and a tiny Express auth server.

</div>

## Quick start

```bash
# Install
npm install

# Dev (frontend)
npm run dev   # http://localhost:3000

# Auth server (optional: wallet JWT + Firebase custom tokens)
npm run server  # http://localhost:4000

# Build
npm run build
```

## Features
- AI recipe generation with a retro UI.
- On‑chain registry on Base Sepolia (lifetime membership model).
- MetaMask sign‑in (SIWE) + Google sign‑in (Firebase or Google Identity fallback).
- Video trailer maker (image + voiceover), local drafts, and cookbook.

## Configure
Copy `.env.example` to `.env` (kept local; ignored by git) and set the values you use:

- VITE_BASE_RPC_URL, VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS, VITE_FRACTAL_RECIPE_DEPLOY_BLOCK
- VITE_PUBLIC_ONCHAINKIT_API_KEY
- VITE_FIREBASE_* or VITE_GOOGLE_OAUTH_CLIENT_ID
- GEMINI_API_KEY (if using video/transcription helpers)

Auth server (`server/.env`): PORT, JWT_SECRET, optional Firebase Admin keys, GOOGLE_OAUTH_CLIENT_ID for token checks.

## Stack
Vite + React + TypeScript • Tailwind • viem/wagmi • OnchainKit • Express • Firebase (client/admin) • Google Identity Services.

## Security notes
- `.env`, `.env.*` are git‑ignored. Use `.env.example` for placeholders.
- Auth server signs short‑lived JWTs. Keep `JWT_SECRET` strong. Never commit real secrets.
- Client sanitizes image URLs used in previews.

## License
Creative Commons BY‑NC‑SA 4.0. See `LICENSE.md`.
