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

// Check if Firebase is properly configured
const isFirebaseConfigured = Object.values(REMOVED_AUTH_PROVIDERConfig).every(
  (value) => typeof value === "string" && value.trim() !== "",
);

let app: any = null;
let auth: any = null;
let storage: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    // Initialize Firebase
    app = initializeApp(REMOVED_AUTH_PROVIDERConfig);

    // Initialize Firebase Authentication
    auth = getAuth(app);

    // Set persistence to LOCAL so sessions survive page refreshes
    setPersistence(auth, browserLocalPersistence).catch((error) => {

    });

    // Initialize Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("profile");
    googleProvider.addScope("email");

    // Initialize Storage
    const { getStorage } = await import("REMOVED_AUTH_PROVIDER/storage");
    storage = getStorage(app);

    // console.log("Firebase initialized successfully");
  } catch (error) {
    // Fail silently in prod
  }
} else {
  // Config missing
}

export { auth, googleProvider, storage };
export default app;
