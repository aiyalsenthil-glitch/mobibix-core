import { initializeApp } from "REMOVED_AUTH_PROVIDER/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "REMOVED_AUTH_PROVIDER/auth";

// Firebase configuration
const REMOVED_AUTH_PROVIDERConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(REMOVED_AUTH_PROVIDERConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Set persistence to LOCAL so sessions survive page refreshes
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Firebase persistence error:", error);
});

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");

export { auth, googleProvider };
export default app;
