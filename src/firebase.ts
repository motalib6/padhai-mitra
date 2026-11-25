import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase setup for PadhaiMitra.
 *
 * Copy `.env.example` to `.env` and fill in your own Firebase web-app
 * config (console.firebase.google.com -> your project -> web app).
 * The app renders a setup screen instead of crashing when no config
 * is present, so the scaffold can be reviewed before Firebase exists.
 *
 * NEVER commit `.env`, App Check debug tokens or API keys. `.env` is
 * gitignored; see README.md.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env
    .VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey);

export const app: FirebaseApp | null = firebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

/** Firebase AI Logic client (Gemini Developer API backend, Spark plan). */
export const ai: AI | null = app
  ? getAI(app, { backend: new GoogleAIBackend() })
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

/** Anonymous sign-in (one click, no signup friction for judges). */
export async function ensureAnonymousAuth(): Promise<string> {
  if (!auth) throw new Error("Firebase is not configured yet.");
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser?.uid ?? "";
}

// App Check is REQUIRED for Firebase AI Logic. In local dev, use the
// debug provider: the token is printed in the console on first run —
// register THAT token in the Firebase console, never commit it.
if (import.meta.env.DEV) {
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
    true;
}
const recaptchaSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as
  | string
  | undefined;
if (app && recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
