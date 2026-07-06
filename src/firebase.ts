import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDkPKi9z-Hk4wiRe0plCleJBRygX9nrbKs",
  authDomain: "cardioguard-ai-75ed3.firebaseapp.com",
  projectId: "cardioguard-ai-75ed3",
  storageBucket: "cardioguard-ai-75ed3.firebasestorage.app",
  messagingSenderId: "974234507121",
  appId: "1:974234507121:web:4cacdb9c1fe71a95a2c8d0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
};
