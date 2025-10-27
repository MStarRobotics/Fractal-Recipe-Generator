import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInAnonymously,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  type ConfirmationResult,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

let firebaseApp: FirebaseApp | null | undefined;
let firebaseAuth: Auth | null | undefined;

const loadFirebaseConfig = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
};

const ensureFirebase = (): { app: FirebaseApp; auth: Auth } | null => {
  if (firebaseAuth !== undefined && firebaseApp !== undefined) {
    if (firebaseApp && firebaseAuth) {
      return { app: firebaseApp, auth: firebaseAuth };
    }
    return null;
  }

  const config = loadFirebaseConfig();
  if (!config) {
    firebaseApp = null;
    firebaseAuth = null;
    console.warn('Firebase configuration missing. Skipping client initialization.');
    return null;
  }

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const auth = getAuth(app);
    firebaseApp = app;
    firebaseAuth = auth;
    return { app, auth };
  } catch (error) {
    firebaseApp = null;
    firebaseAuth = null;
    console.error('Failed to initialize Firebase client', error);
    return null;
  }
};

export const getFirebaseAuthInstance = (): Auth | null => {
  const instance = ensureFirebase();
  return instance ? instance.auth : null;
};

export const subscribeToFirebaseAuth = (listener: (user: User | null) => void): (() => void) => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    listener(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, listener);
};

export const signInWithGooglePopup = async (): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
};

export const signInWithGithubPopup = async (): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const provider = new GithubAuthProvider();
  provider.setCustomParameters({ allow_signup: 'true' });
  return signInWithPopup(auth, provider);
};

export const createUserWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInAnonymouslyClient = async (): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  return signInAnonymously(auth);
};

export const ensurePhoneRecaptcha = (containerId: string): RecaptchaVerifier => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  // Firebase v9 uses RecaptchaVerifier without manually passing site key; key must be configured in Console.
  // If you use enterprise or need explicit key, you can set grecaptcha params here.
  // We initialize an invisible verifier by default.
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  return verifier;
};

export const signInWithPhone = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const verifier = ensurePhoneRecaptcha(recaptchaContainerId);
  // Returns a confirmation result; the caller must call confirmation.confirm(code) in the UI.
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmation;
};

export const confirmPhoneCode = async (confirmation: ConfirmationResult, code: string): Promise<UserCredential> => {
  return confirmation.confirm(code);
};

export const signInWithFirebaseCustomToken = async (token: string): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Unable to sign in with custom token.');
  }
  return signInWithCustomToken(auth, token);
};

export const firebaseSignOut = async (): Promise<void> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    return;
  }
  await signOut(auth);
};

export const isFirebaseReady = (): boolean => Boolean(getFirebaseAuthInstance());
