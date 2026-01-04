// Auth Adapter - wraps Firebase Auth calls
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
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    type ConfirmationResult,
    type Auth,
    type User,
    type UserCredential,
    type ActionCodeSettings,
} from 'firebase/auth';

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;

// Load config from env or return null if missing
const getConfig = () => {
    const env = import.meta.env;
    if (!env.VITE_FIREBASE_API_KEY) return null;

    return {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
        measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
    };
};

// Singleton init
const initAuth = (): Auth | null => {
    if (_auth) return _auth;

    const conf = getConfig();
    if (!conf) {
        console.warn('Auth Adapter: Missing Firebase config.');
        return null;
    }

    try {
        // Prevent double-init
        _app = getApps().length ? getApps()[0] : initializeApp(conf);
        _auth = getAuth(_app);
        return _auth;
    } catch (err) {
        console.error('Auth Adapter: Init failed', err);
        return null;
    }
};

export const getAuthInstance = () => initAuth();
export const isReady = () => !!initAuth();

// --- Auth Providers ---

export const loginWithGoogle = async (): Promise<UserCredential> => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
};

export const loginWithGithub = async (): Promise<UserCredential> => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');

    const provider = new GithubAuthProvider();
    provider.setCustomParameters({ allow_signup: 'true' });
    return signInWithPopup(auth, provider);
};

// --- Email/Password ---

export const registerEmail = async (em: string, pass: string) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return createUserWithEmailAndPassword(auth, em, pass);
};

export const loginEmail = async (em: string, pass: string) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return signInWithEmailAndPassword(auth, em, pass);
};

// --- Magic Link ---

export const sendMagicLink = async (email: string, settings: ActionCodeSettings) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return sendSignInLinkToEmail(auth, email, settings);
};

export const isMagicLink = (url?: string) => {
    const auth = initAuth();
    if (!auth) return false;
    return isSignInWithEmailLink(auth, url || window.location.href);
};

export const finishMagicLink = async (email: string, url?: string) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return signInWithEmailLink(auth, email, url || window.location.href);
};

// --- Phone / OTP ---

export const initRecaptcha = (divId: string): RecaptchaVerifier => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');

    // Invisible is cleaner UX
    return new RecaptchaVerifier(auth, divId, {
        size: 'invisible',
    });
};

export const sendSms = async (phone: string, captchaId: string) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');

    const verifier = initRecaptcha(captchaId);
    return signInWithPhoneNumber(auth, phone, verifier);
};

export const verifySms = async (result: ConfirmationResult, code: string) => {
    return result.confirm(code);
};

// --- Misc ---

export const loginAnon = async () => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return signInAnonymously(auth);
};

export const loginCustomToken = async (token: string) => {
    const auth = initAuth();
    if (!auth) throw new Error('Auth not configured');
    return signInWithCustomToken(auth, token);
};

export const logout = async () => {
    const auth = initAuth();
    if (auth) await signOut(auth);
};

export const subscribeAuth = (cb: (u: User | null) => void) => {
    const auth = initAuth();
    if (!auth) {
        cb(null);
        return () => { };
    }
    return onAuthStateChanged(auth, cb);
};
