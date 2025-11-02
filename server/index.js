import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { verifyMessage } from 'viem';
import argon2 from 'argon2';
import { z } from 'zod';
import admin from 'firebase-admin';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-secret-before-production';
const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 3600);
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? null;
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH ?? 10);
const OTP_TTL_MS = Number(process.env.PWD_RESET_OTP_TTL_MS ?? 10 * 60 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.PWD_RESET_MAX_ATTEMPTS ?? 5);
const USERS_COLLECTION = 'userCredentials';
const OTP_COLLECTION = 'passwordResetOtps';
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? null;

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

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(helmet());
app.disable('x-powered-by');

const createRateLimiter = config =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    ...config,
  });

// GitHub Webhook endpoint (raw body + optional signature verification)
// Payload URL when deployed: https://<your-host>/github-webhook
const webhookRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per IP
  skipSuccessfulRequests: false,
});

app.use('/github-webhook', express.raw({ type: 'application/json', limit: '200kb' }));

const verifyGithubSignature = (secret, payloadBuffer, signatureHeader) => {
  if (!secret || !signatureHeader) return true; // allow when not configured
  const expected = 'sha256=' + createHmac('sha256', secret).update(payloadBuffer).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
};

app.post('/github-webhook', webhookRateLimit, (req, res) => {
  const event = req.header('X-GitHub-Event');
  const delivery = req.header('X-GitHub-Delivery');
  const signature = req.header('X-Hub-Signature-256');

  if (!event || !delivery) {
    res.status(400).json({ error: 'Missing GitHub webhook headers' });
    return;
  }

  const isValid = verifyGithubSignature(GITHUB_WEBHOOK_SECRET, req.body, signature);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  try {
    // Best-effort parse; keep raw for signature
    const payload =
      typeof req.body === 'string' ? JSON.parse(req.body) : JSON.parse(req.body.toString('utf8'));
    const repoName = payload?.repository?.full_name || 'unknown';
    const action = payload?.action || 'n/a';
    // Log structured data to avoid format string vulnerability
    console.log('[GitHub Webhook]', {
      event,
      delivery,
      repository: repoName,
      action,
    });
  } catch (e) {
    console.warn(
      'Received webhook but failed to parse JSON payload:',
      e instanceof Error ? e.message : String(e)
    );
  }
  res.status(200).json({ ok: true });
});

// JSON body parser for the rest of the API
app.use(express.json({ limit: '50kb' }));

const pendingNonces = new Map();
const walletDirectory = new Map();
const userDirectory = new Map();
const activeTokens = new Map();

let firebaseAuth = null;
let firestore = null;
let firestoreFieldValue = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replaceAll(String.raw`\n`, '\n') : undefined;

  if (projectId && clientEmail && privateKey) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    firebaseAuth = admin.auth();
    firestore = admin.firestore();
    firestoreFieldValue = admin.firestore.FieldValue;
    console.log('Firebase Admin ready for custom token issuance');
  } else {
    console.warn(
      'Firebase Admin credentials missing; skipping Firebase Authentication integration.'
    );
  }
} catch (error) {
  firebaseAuth = null;
  firestore = null;
  firestoreFieldValue = null;
  console.error('Failed to initialize Firebase Admin SDK', error);
}

const registerSchema = z.object({
  email: z.string({ required_error: 'Email is required.' }).email('Invalid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .min(6, 'Phone number is too short.')
    .max(32, 'Phone number is too long.'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required.' }).email('Invalid email address.'),
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

const otpRequestSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .min(6, 'Phone number is too short.')
    .max(32, 'Phone number is too long.'),
});

const otpResetSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .min(6, 'Phone number is too short.')
    .max(32, 'Phone number is too long.'),
  otp: z.string({ required_error: 'OTP code is required.' }).length(6, 'OTP must be 6 characters.'),
  newPassword: z
    .string({ required_error: 'New password is required.' })
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
});

const normalizeEmail = email => email.trim().toLowerCase();
const normalizePhone = phone => phone.replaceAll(/\D/g, '');

const normalizeAddress = address => {
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    throw new Error('Invalid wallet address');
  }
  return address.toLowerCase();
};

const createNonceRecord = address => {
  const nonce = randomBytes(16).toString('hex');
  const message = `Sign in to Fractal Recipe\nNonce: ${nonce}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  pendingNonces.set(address, { nonce, message, expiresAt });
  return { nonce, message };
};

const respondValidationError = (res, validationError) => {
  res.status(400).json({
    error: 'Invalid input payload',
    details: validationError.flatten().fieldErrors,
  });
};

const ensureCredentialStoreAvailable = res => {
  if (!firestore || !firestoreFieldValue) {
    res.status(503).json({
      error:
        'User credential storage is not configured. Provide Firebase Admin credentials on the server to enable this feature.',
    });
    return false;
  }
  return true;
};

const generateOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

const buildWalletRecord = address => {
  const existing = walletDirectory.get(address);
  if (existing) {
    return existing;
  }
  const record = { address, createdAt: Date.now(), lastLoginAt: null, googleId: null };
  walletDirectory.set(address, record);
  return record;
};

const issueJwt = payload => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
  activeTokens.set(token, {
    payload,
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
  });
  return token;
};

const verifyGoogleAccessToken = async accessToken => {
  if (!accessToken) {
    throw new Error('Missing Google access token');
  }

  const tokenInfoResponse = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
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
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token missing' });
    return;
  }
  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const active = activeTokens.get(token);
    if (!active) {
      activeTokens.delete(token);
      res.status(401).json({ error: 'Session has expired' });
      return;
    }
    const activeExpiresAt = typeof active.expiresAt === 'number' ? active.expiresAt : 0;
    if (activeExpiresAt < Date.now()) {
      activeTokens.delete(token);
      res.status(401).json({ error: 'Session has expired' });
      return;
    }
    if (!active.payload && active.address) {
      active.payload = { address: active.address };
    }
    req.auth = decoded;
    req.session = active.payload ?? decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed', error);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

app.post(
  '/auth/register/email',
  createRateLimiter({ windowMs: 60_000, limit: 20 }),
  async (req, res) => {
    if (!ensureCredentialStoreAvailable(res)) {
      return;
    }

    const parseResult = registerSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      respondValidationError(res, parseResult.error);
      return;
    }

    const normalizedEmail = normalizeEmail(parseResult.data.email);
    const normalizedPhone = normalizePhone(parseResult.data.phone);

    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      res.status(400).json({ error: 'Phone number must contain between 8 and 15 digits.' });
      return;
    }

    try {
      const userDocRef = firestore.collection(USERS_COLLECTION).doc(normalizedEmail);
      const existingUser = await userDocRef.get();
      if (existingUser.exists) {
        res.status(409).json({ error: 'Email is already registered.' });
        return;
      }

      const phoneCollision = await firestore
        .collection(USERS_COLLECTION)
        .where('phone', '==', normalizedPhone)
        .limit(1)
        .get();
      if (!phoneCollision.empty) {
        res.status(409).json({ error: 'Phone number is already associated with another account.' });
        return;
      }

      const passwordHash = await argon2.hash(parseResult.data.password, { type: argon2.argon2id });
      await userDocRef.set({
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        createdAt: firestoreFieldValue.serverTimestamp(),
        updatedAt: firestoreFieldValue.serverTimestamp(),
        lastLoginAt: null,
      });

      res.status(201).json({
        message: 'ACCOUNT_CREATED',
        email: normalizedEmail,
        phone: normalizedPhone,
      });
    } catch (error) {
      console.error('Email registration failed', error);
      res.status(500).json({ error: 'Failed to register account.' });
    }
  }
);

app.post(
  '/auth/login/email',
  createRateLimiter({ windowMs: 60_000, limit: 30 }),
  async (req, res) => {
    if (!ensureCredentialStoreAvailable(res)) {
      return;
    }

    const parseResult = loginSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      respondValidationError(res, parseResult.error);
      return;
    }

    const normalizedEmail = normalizeEmail(parseResult.data.email);

    try {
      const userDocRef = firestore.collection(USERS_COLLECTION).doc(normalizedEmail);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const userData = userDoc.data();
      if (!userData?.passwordHash) {
        res.status(500).json({ error: 'Account is missing credentials. Contact support.' });
        return;
      }

      const passwordMatches = await argon2.verify(userData.passwordHash, parseResult.data.password);
      if (!passwordMatches) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      await userDocRef.update({
        lastLoginAt: firestoreFieldValue.serverTimestamp(),
        updatedAt: firestoreFieldValue.serverTimestamp(),
      });

      const token = issueJwt({
        authType: 'email-password',
        email: normalizedEmail,
        phone: userData.phone ?? null,
      });

      res.json({
        token,
        email: normalizedEmail,
        phone: userData.phone ?? null,
      });
    } catch (error) {
      console.error('Email login failed', error);
      res.status(500).json({ error: 'Failed to authenticate.' });
    }
  }
);

app.post(
  '/auth/password/request-otp',
  createRateLimiter({ windowMs: 60_000, limit: 5 }),
  async (req, res) => {
    if (!ensureCredentialStoreAvailable(res)) {
      return;
    }

    const parseResult = otpRequestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      respondValidationError(res, parseResult.error);
      return;
    }

    const normalizedPhone = normalizePhone(parseResult.data.phone);
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      res.status(400).json({ error: 'Phone number must contain between 8 and 15 digits.' });
      return;
    }

    try {
      const userSnapshot = await firestore
        .collection(USERS_COLLECTION)
        .where('phone', '==', normalizedPhone)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        res.status(404).json({ error: 'No account found for the provided phone number.' });
        return;
      }

      const [userDoc] = userSnapshot.docs;
      const otpCode = generateOtpCode();
      const otpHash = await argon2.hash(otpCode, { type: argon2.argon2id });
      const expiresAt = Date.now() + OTP_TTL_MS;

      await firestore.collection(OTP_COLLECTION).doc(normalizedPhone).set({
        phone: normalizedPhone,
        email: userDoc.id,
        otpHash,
        attempts: 0,
        expiresAt,
        createdAt: firestoreFieldValue.serverTimestamp(),
      });

      if (IS_DEVELOPMENT) {
        console.info(`Password reset OTP for ${normalizedPhone}: ${otpCode}`);
      }

      res.json({
        message: 'OTP dispatched. Integrate an SMS provider to deliver the code to the user.',
        ...(IS_DEVELOPMENT
          ? { demoOtp: otpCode, expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) }
          : {}),
      });
    } catch (error) {
      console.error('OTP request failed', error);
      res.status(500).json({ error: 'Failed to generate OTP code.' });
    }
  }
);

app.post(
  '/auth/password/reset',
  createRateLimiter({ windowMs: 60_000, limit: 5 }),
  async (req, res) => {
    if (!ensureCredentialStoreAvailable(res)) {
      return;
    }

    const parseResult = otpResetSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      respondValidationError(res, parseResult.error);
      return;
    }

    const normalizedPhone = normalizePhone(parseResult.data.phone);
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      res.status(400).json({ error: 'Phone number must contain between 8 and 15 digits.' });
      return;
    }

    const { otp, newPassword } = parseResult.data;
    const otpDocRef = firestore.collection(OTP_COLLECTION).doc(normalizedPhone);

    try {
      const otpDoc = await otpDocRef.get();
      if (!otpDoc.exists) {
        res.status(400).json({ error: 'OTP is invalid or has expired.' });
        return;
      }

      const otpData = otpDoc.data();
      if (!otpData) {
        await otpDocRef.delete();
        res.status(400).json({ error: 'OTP is invalid or has expired.' });
        return;
      }

      const attempts = otpData.attempts ?? 0;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await otpDocRef.delete();
        res.status(429).json({ error: 'Too many invalid attempts. Request a new OTP.' });
        return;
      }

      if (typeof otpData.expiresAt === 'number' && otpData.expiresAt < Date.now()) {
        await otpDocRef.delete();
        res.status(400).json({ error: 'OTP expired. Request a new code.' });
        return;
      }

      const otpValid = await argon2.verify(otpData.otpHash, otp);
      if (!otpValid) {
        await otpDocRef.update({ attempts: attempts + 1 });
        res.status(401).json({ error: 'Invalid OTP code.' });
        return;
      }

      const linkedEmail = otpData.email;
      if (!linkedEmail) {
        await otpDocRef.delete();
        res.status(500).json({ error: 'Failed to resolve account for OTP.' });
        return;
      }

      const userDocRef = firestore.collection(USERS_COLLECTION).doc(linkedEmail);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        await otpDocRef.delete();
        res.status(404).json({ error: 'Account record not found.' });
        return;
      }

      const newPasswordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

      await userDocRef.update({
        passwordHash: newPasswordHash,
        updatedAt: firestoreFieldValue.serverTimestamp(),
      });

      await otpDocRef.delete();

      res.json({
        message: 'Password reset successful.',
        email: linkedEmail,
      });
    } catch (error) {
      console.error('Password reset failed', error);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/auth/nonce', createRateLimiter({ windowMs: 60_000, limit: 30 }), (req, res) => {
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

app.post('/auth/verify', createRateLimiter({ windowMs: 60_000, limit: 20 }), async (req, res) => {
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
    res.json({
      token,
      address: normalized,
      linkedGoogleId: walletRecord.googleId,
      firebaseCustomToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message ?? 'Signature verification failed' });
  }
});

// Rate-limited route: 20 requests per minute
// lgtm[js/missing-rate-limiting]
app.post(
  '/auth/link',
  createRateLimiter({ windowMs: 60_000, limit: 20 }),
  authenticateRequest,
  async (req, res) => {
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
      if (userRecord) {
        userRecord.email = userRecord.email ?? resolvedEmail;
        userRecord.displayName = userRecord.displayName ?? resolvedDisplayName;
      } else {
        userRecord = {
          googleId: resolvedGoogleId,
          wallets: new Set(),
          email: resolvedEmail,
          displayName: resolvedDisplayName,
          createdAt: Date.now(),
          lastLinkedAt: null,
        };
        userDirectory.set(resolvedGoogleId, userRecord);
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
  }
);

// Rate-limited route: 60 requests per minute
// lgtm[js/missing-rate-limiting]
app.get(
  '/auth/profile',
  createRateLimiter({ windowMs: 60_000, limit: 60 }),
  authenticateRequest,
  (req, res) => {
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
  }
);

// Rate-limited route: 30 requests per minute
// lgtm[js/missing-rate-limiting]
app.post(
  '/auth/logout',
  createRateLimiter({ windowMs: 60_000, limit: 30 }),
  authenticateRequest,
  (req, res) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token missing' });
      return;
    }
    const token = authHeader.slice('Bearer '.length);
    activeTokens.delete(token);
    res.json({ success: true });
  }
);

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
