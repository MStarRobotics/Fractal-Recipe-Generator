import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInAnonymously,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  type ActionCodeSettings,
  type ConfirmationResult,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseInitialized = false;

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
  if (firebaseInitialized) {
    if (firebaseApp && firebaseAuth) {
      return { app: firebaseApp, auth: firebaseAuth };
    }
    return null;
  }
  firebaseInitialized = true;

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

export const ensurePhoneRecaptcha = (containerId: string, size: 'invisible' | 'normal' = 'normal'): RecaptchaVerifier => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  // Create visible reCAPTCHA widget by default for better UX
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size,
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
      console.warn('reCAPTCHA expired, please verify again');
    },
  });
  return verifier;
};

export const signInWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  // Returns a confirmation result; the caller must call confirmation.confirm(code) in the UI.
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmation;
};

export const confirmPhoneCode = async (confirmation: ConfirmationResult, code: string): Promise<UserCredential> => {
  return confirmation.confirm(code);
};

/**
 * Send a sign-in link to the user's email for passwordless authentication.
 * @param email - User's email address
 * @param actionCodeSettings - Configuration for the email link
 */
export const sendEmailSignInLink = async (email: string, actionCodeSettings: ActionCodeSettings): Promise<void> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Save email locally to complete sign-in flow on the same device
  window.localStorage.setItem('emailForSignIn', email);
};

/**
 * Check if the current URL is a sign-in link from email.
 */
export const isEmailSignInLink = (): boolean => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    return false;
  }
  return isSignInWithEmailLink(auth, window.location.href);
};

/**
 * Complete the email link sign-in process.
 * @param email - User's email address (optional if stored locally)
 */
export const completeEmailSignIn = async (email?: string): Promise<UserCredential> => {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }

  let userEmail = email;
  
  // Get the email if available from local storage
  if (!userEmail) {
    const storedEmail = window.localStorage.getItem('emailForSignIn');
    if (storedEmail) {
      userEmail = storedEmail;
    }
  }

  // If still no email, throw error (caller should prompt the user)
  if (!userEmail) {
    throw new Error('Email address is required to complete sign-in. Please provide your email.');
  }

  const result = await signInWithEmailLink(auth, userEmail, window.location.href);
  
  // Clear email from storage after successful sign-in
  window.localStorage.removeItem('emailForSignIn');
  
  return result;
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
