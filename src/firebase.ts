import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithPopup, 
  signInWithCredential,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, logEvent as firebaseLogEvent, setUserId as firebaseSetUserId } from "firebase/analytics"; 
import { Capacitor } from "@capacitor/core";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";

// Configuration loaded from environment / firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDkPKi9z-Hk4wiRe0plCleJBRygX9nrbKs",
  authDomain: "cardioguard-ai-75ed3.firebaseapp.com",
  projectId: "cardioguard-ai-75ed3",
  storageBucket: "cardioguard-ai-75ed3.firebasestorage.app",
  messagingSenderId: "974234507121",
  appId: "1:974234507121:web:4cacdb9c1fe71a95a2c8d0",
  measurementId: "G-285K5W3XTE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Web Firebase Analytics safely
let webAnalytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId && firebaseConfig.measurementId !== "G-285K5W3XTE") {
      try {
        webAnalytics = getAnalytics(app);
        console.log("[Analytics] Web Firebase Analytics initialized");
      } catch (e) {
        console.warn("[Analytics] Failed to initialize web analytics:", e);
      }
    }
  }).catch(() => {});
}

// Unified helper to log analytics events across Web and Native Android
export const logAnalyticsEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAnalytics.logEvent({
        name: eventName,
        params: params || {}
      });
    } else if (webAnalytics) {
      firebaseLogEvent(webAnalytics, eventName, params);
    }
  } catch (err) {
    console.debug("[Analytics] Event logging skipped or failed:", err);
  }
};

// Set User ID for tracking individual active users
export const setAnalyticsUser = async (userId: string | null) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAnalytics.setUserId({
        userId: userId || undefined
      });
    } else if (webAnalytics && userId) {
      firebaseSetUserId(webAnalytics, userId);
    }
  } catch (err) {
    console.debug("[Analytics] Setting user ID skipped:", err);
  }
};

// Automatically track active auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    setAnalyticsUser(user.uid);
    logAnalyticsEvent("login", { method: user.providerData?.[0]?.providerId || "unknown" });
  } else {
    setAnalyticsUser(null);
  }
});

// Initial app open event
if (typeof window !== "undefined") {
  logAnalyticsEvent("app_open", { platform: Capacitor.getPlatform() });
}

export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithPopup, 
  signOut,
  signInWithCredential,
  onAuthStateChanged
};
