import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import admin from 'firebase-admin';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-secret-before-production';
const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 3600);
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? null;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));

// Simple in-memory rate limiter per IP + path
const rateBuckets = new Map();
function rateLimit(options) {
  const { windowMs = 60_000, limit = 60, keyGenerator } = options ?? {};
  return (req, res, next) => {
    try {
      const keyBase = keyGenerator ? keyGenerator(req) : `${req.ip}:${req.path}`;
      const now = Date.now();
      const bucket = rateBuckets.get(keyBase) ?? { count: 0, reset: now + windowMs };
      if (now > bucket.reset) {
        bucket.count = 0;
        bucket.reset = now + windowMs;
      }
      bucket.count += 1;
      rateBuckets.set(keyBase, bucket);
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
      res.setHeader('X-RateLimit-Reset', String(bucket.reset));
      if (bucket.count > limit) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
      }
      next();
    } catch (e) {
      next();
    }
  };
}

const pendingNonces = new Map();
const walletDirectory = new Map();
const userDirectory = new Map();
const activeTokens = new Map();

let firebaseAuth = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  if (projectId && clientEmail && privateKey) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    firebaseAuth = admin.auth();
    console.log('Firebase Admin ready for custom token issuance');
  } else {
    console.warn('Firebase Admin credentials missing; skipping Firebase Authentication integration.');
  }
} catch (error) {
  firebaseAuth = null;
  console.error('Failed to initialize Firebase Admin SDK', error);
}

const normalizeAddress = (address) => {
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    throw new Error('Invalid wallet address');
  }
  return address.toLowerCase();
};

const createNonceRecord = (address) => {
  const nonce = randomBytes(16).toString('hex');
  const message = `Sign in to Fractal Recipe\nNonce: ${nonce}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  pendingNonces.set(address, { nonce, message, expiresAt });
  return { nonce, message };
};

const buildWalletRecord = (address) => {
  const existing = walletDirectory.get(address);
  if (existing) {
    return existing;
  }
  const record = { address, createdAt: Date.now(), lastLoginAt: null, googleId: null };
  walletDirectory.set(address, record);
  return record;
};

const issueJwt = (payload) => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
  activeTokens.set(token, { address: payload.address, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 });
  return token;
};

const verifyGoogleAccessToken = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Missing Google access token');
  }

  const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!tokenInfoResponse.ok) {
    throw new Error('Invalid Google access token');
  }
  const tokenInfo = await tokenInfoResponse.json();

  if (GOOGLE_OAUTH_CLIENT_ID && tokenInfo.aud && tokenInfo.aud !== GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error('Google access token audience mismatch');
  }

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('Failed to load Google profile');
  }

  return userInfoResponse.json();
};

const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token missing' });
    return;
  }
  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const active = activeTokens.get(token);
    if (!active || active.expiresAt < Date.now()) {
      activeTokens.delete(token);
      res.status(401).json({ error: 'Session has expired' });
      return;
    }
    req.auth = decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed', error);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/auth/nonce', rateLimit({ windowMs: 60_000, limit: 30 }), (req, res) => {
  try {
    const { address } = req.body ?? {};
    if (!address) {
      res.status(400).json({ error: 'Wallet address required' });
      return;
    }
    const normalized = normalizeAddress(address);
    const record = createNonceRecord(normalized);
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message ?? 'Unable to generate nonce' });
  }
});

app.post('/auth/verify', rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res) => {
  try {
    const { address, signature } = req.body ?? {};
    if (!address || !signature) {
      res.status(400).json({ error: 'Wallet address and signature are required' });
      return;
    }
    const normalized = normalizeAddress(address);
    const nonceRecord = pendingNonces.get(normalized);
    if (!nonceRecord) {
      res.status(400).json({ error: 'Nonce not found. Request a new one.' });
      return;
    }
    if (nonceRecord.expiresAt < Date.now()) {
      pendingNonces.delete(normalized);
      res.status(400).json({ error: 'Nonce expired. Request a new one.' });
      return;
    }

    const validSignature = await verifyMessage({
      address: normalized,
      message: nonceRecord.message,
      signature,
    });

    if (!validSignature) {
      res.status(401).json({ error: 'Signature verification failed' });
      return;
    }

    pendingNonces.delete(normalized);

    const walletRecord = buildWalletRecord(normalized);
    walletRecord.lastLoginAt = Date.now();

    let firebaseCustomToken = null;
    if (firebaseAuth) {
      try {
        firebaseCustomToken = await firebaseAuth.createCustomToken(normalized, {
          wallets: [normalized],
          linkedGoogleId: walletRecord.googleId ?? null,
        });
      } catch (firebaseError) {
        console.error('Failed to craft Firebase custom token', firebaseError);
      }
    }

    const token = issueJwt({ address: normalized, linkedGoogleId: walletRecord.googleId ?? null });
    res.json({ token, address: normalized, linkedGoogleId: walletRecord.googleId, firebaseCustomToken });
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'Signature verification failed' });
  }
});

app.post('/auth/link', authenticateRequest, rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res) => {
  try {
    const { googleId, email, displayName, googleAccessToken } = req.body ?? {};

    let verifiedProfile = null;
    if (googleAccessToken) {
      try {
        verifiedProfile = await verifyGoogleAccessToken(googleAccessToken);
      } catch (error) {
        res.status(401).json({ error: error.message ?? 'Failed to verify Google access token' });
        return;
      }
    }

    const resolvedGoogleId = verifiedProfile?.sub ?? googleId;
    if (!resolvedGoogleId) {
      res.status(400).json({ error: 'Google ID is required to link accounts' });
      return;
    }

    const normalizedAddress = normalizeAddress(req.auth.address);
    const walletRecord = buildWalletRecord(normalizedAddress);

    if (walletRecord.googleId && walletRecord.googleId !== resolvedGoogleId) {
      res.status(409).json({ error: 'Wallet already linked to a different Google account' });
      return;
    }

    const resolvedEmail = verifiedProfile?.email ?? email ?? null;
    const resolvedDisplayName = verifiedProfile?.name ?? displayName ?? null;

    let userRecord = userDirectory.get(resolvedGoogleId);
    if (!userRecord) {
      userRecord = {
        googleId: resolvedGoogleId,
        wallets: new Set(),
        email: resolvedEmail,
        displayName: resolvedDisplayName,
        createdAt: Date.now(),
        lastLinkedAt: null,
      };
      userDirectory.set(resolvedGoogleId, userRecord);
    } else {
      userRecord.email = userRecord.email ?? resolvedEmail;
      userRecord.displayName = userRecord.displayName ?? resolvedDisplayName;
    }

    userRecord.wallets.add(normalizedAddress);
    userRecord.lastLinkedAt = Date.now();

    walletRecord.googleId = resolvedGoogleId;

    const responsePayload = {
      address: normalizedAddress,
      linkedGoogleId: resolvedGoogleId,
      wallets: Array.from(userRecord.wallets),
      email: userRecord.email,
      displayName: userRecord.displayName,
    };

    let firebaseCustomToken = null;
    if (firebaseAuth) {
      try {
        firebaseCustomToken = await firebaseAuth.createCustomToken(normalizedAddress, {
          linkedGoogleId: resolvedGoogleId,
          wallets: Array.from(userRecord.wallets),
        });
      } catch (firebaseError) {
        console.error('Failed to craft Firebase token for linked account', firebaseError);
      }
    }

    const token = issueJwt({ address: normalizedAddress, linkedGoogleId: resolvedGoogleId });

    res.json({ ...responsePayload, token, firebaseCustomToken });
  } catch (error) {
    console.error('Account linking failed', error);
    res.status(500).json({ error: error.message ?? 'Failed to link Google account' });
  }
});

app.get('/auth/profile', authenticateRequest, rateLimit({ windowMs: 60_000, limit: 60 }), (req, res) => {
  try {
    const normalizedAddress = normalizeAddress(req.auth.address);
    const walletRecord = buildWalletRecord(normalizedAddress);
    let linkedWallets = [normalizedAddress];
    if (walletRecord.googleId) {
      const userRecord = userDirectory.get(walletRecord.googleId);
      if (userRecord) {
        linkedWallets = Array.from(userRecord.wallets);
      }
    }

    res.json({
      address: normalizedAddress,
      linkedGoogleId: walletRecord.googleId,
      wallets: linkedWallets,
    });
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'Failed to load profile' });
  }
});

app.post('/auth/logout', authenticateRequest, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.slice('Bearer '.length);
  activeTokens.delete(token);
  res.json({ success: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [address, record] of pendingNonces.entries()) {
    if (record.expiresAt < now) {
      pendingNonces.delete(address);
    }
  }
  for (const [token, details] of activeTokens.entries()) {
    if (details.expiresAt < now) {
      activeTokens.delete(token);
    }
  }
}, 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`Authentication server running on port ${PORT}`);
});
