# Fractal Recipe Generator

[![CI](https://github.com/MStarRobotics/Fractal-Recipe-Generator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MStarRobotics/Fractal-Recipe-Generator/actions/workflows/ci.yml)
[![CodeQL](https://github.com/MStarRobotics/Fractal-Recipe-Generator/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/MStarRobotics/Fractal-Recipe-Generator/actions/workflows/codeql.yml)
[![Vite](https://img.shields.io/badge/Vite-Build-blue)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-2b6cff)](https://www.base.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)](LICENSE.md)

Retro‑arcade web app that generates recipes with AI and anchors them on‑chain. MetaMask (SIWE) + Google sign‑in, built with Vite + React, viem/wagmi, and a tiny Express auth server.

## Quick start

```bash
# Install
npm install

# Dev (frontend)
npm run dev   # http://localhost:5173

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

## Quality gates

Build: PASS

Lint/Typecheck: PASS

Security scan (CodeQL): ENABLED

## Configure

Copy `.env.example` to `.env` (kept local; ignored by git) and set the values you use:

- Frontend: `VITE_BASE_RPC_URL`, `VITE_FRACTAL_RECIPE_CONTRACT_ADDRESS`, `VITE_FRACTAL_RECIPE_DEPLOY_BLOCK`, `VITE_PUBLIC_ONCHAINKIT_API_KEY`, optional Firebase client keys (`VITE_FIREBASE_*`), and `VITE_GEMINI_API_KEY` (for all Gemini-powered features).
- Auth server: `PORT`, `JWT_SECRET`, `JWT_TTL_SECONDS`, `CORS_ORIGIN` plus the Firebase Admin trio `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. Store the private key in an env var with escaped newlines (`\n`)—never commit the JSON file. Optional: `GOOGLE_OAUTH_CLIENT_ID`, `PASSWORD_MIN_LENGTH`, `PWD_RESET_OTP_TTL_MS`, `PWD_RESET_MAX_ATTEMPTS` to tune password policy and OTP behaviour.

Once the env vars exist locally, mirror any production secrets inside **Settings → Secrets and variables → Actions** so GitHub workflows can build without exposing keys.

Security hardening defaults:
- Express sets strict CORS allowlist via `CORS_ORIGIN`
- Helmet is enabled for secure HTTP headers (CSP disabled by default to simplify local dev)
- Rate limiting and tight JSON body size limit (50 KB)
- Zod input validation on all credential endpoints
- JWT sessions are short‑lived; maintain strong `JWT_SECRET`

### Firebase Admin key placement

1. In the Firebase console create a service-account key (JSON).
2. Copy the `project_id`, `client_email`, and `private_key` values into your `.env` file as shown above. Replace real line breaks in the private key with `\n` so Node.js can reconstruct the value.
3. Keep the JSON off disk (or store it outside the repo) and never commit it. The server reconstructs the credentials at runtime from the environment variables.

### Email + phone credential helpers

The auth server now exposes secure helpers backed by Firebase Admin + Firestore:

- `POST /auth/register/email` – store an email/password/phone triple (password is Argon2id-hashed).
- `POST /auth/login/email` – verify credentials and return a JWT session.
- `POST /auth/password/request-otp` – create a short-lived OTP for a phone number (integrate an SMS provider to deliver it).
- `POST /auth/password/reset` – verify the OTP and set a new password.

OTP codes are logged to the server console only while `NODE_ENV !== 'production'` to assist local testing.

### Firebase Authentication SDK (client)

If you want the “real” Firebase Auth experience in the browser (recommended), fill the `VITE_FIREBASE_*` variables and enable providers in Firebase Console:

- Email/password
- Federated GitHub (create a GitHub OAuth app and paste the client/secret in Firebase console)
- Phone number (configure reCAPTCHA v2 site key and set it to `VITE_FIREBASE_RECAPTCHA_SITE_KEY`)
- Anonymous

The client exposes helpers in `services/firebaseClient.ts`:

- `createUserWithEmail(email, password)` and `signInWithEmail(email, password)`
- `signInWithGithubPopup()`
- `signInWithPhoneNumber(phone, recaptchaContainerId)` (uses `RecaptchaVerifier`)
- `signInAnonymouslyClient()`
- `firebaseSignOut()`

These can be wired into UI buttons as needed. For SMS delivery of OTP in server flows, integrate Twilio or a similar provider; the server currently returns a demo OTP in development.

## How to operate and run

1) Install toolchain and dependencies
```bash
npm ci
```

2) Populate `.env` (copy from `.env.example`). For Firebase Admin, escape newlines in `FIREBASE_PRIVATE_KEY` using `\n`.

3) Local quality gates
```bash
npm run lint
npm run typecheck
npm run build
```

4) Start backend and frontend (separate terminals)
```bash
npm run server    # http://localhost:4000
npm run dev       # http://localhost:5173
```

5) Test APIs quickly (optional)
```bash
curl http://localhost:4000/health
```

6) E2E auth smoke test (server must be running)
```bash
npm run test:e2e-auth
```

Postman:
- Import `postman/FractalAuth.postman_collection.json`
- Set `baseUrl` to your server (default `http://localhost:4000`)
- Use `token` variable after logging in to call protected endpoints

Secrets hygiene:
- `.env` and service-account JSON must not be committed (already git-ignored).
- Use GitHub Actions Secrets for CI.
- Rotate leaked keys immediately.

## Stack

Vite + React + TypeScript • Tailwind • viem/wagmi • OnchainKit • Express • Firebase (client/admin) • Google Identity Services.

## Security notes

- `.env`, `.env.*` are git‑ignored. Use `.env.example` for placeholders.
- Auth server signs short‑lived JWTs. Keep `JWT_SECRET` strong. Never commit real secrets.
- Client sanitizes image URLs used in previews.
- Service‑account JSON is git‑ignored; prefer env variables over storing the JSON on disk.
- Enable GitHub’s secret scanning and CodeQL (workflows included).

## License
Creative Commons BY‑NC‑SA 4.0. See `LICENSE.md`.
