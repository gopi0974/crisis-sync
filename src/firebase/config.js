import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging, isSupported } from "firebase/messaging";

// IMPORTANT: Replace with actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCcFL0pJA-SZd_3_67BXEFbnSGgehZ5JW0",
  authDomain: "crisissync-c46e7.firebaseapp.com",
  databaseURL: "https://crisissync-c46e7-default-rtdb.firebaseio.com",
  projectId: "crisissync-c46e7",
  storageBucket: "crisissync-c46e7.firebasestorage.app",
  messagingSenderId: "445044781527",
  appId: "1:445044781527:web:8d6733c60d71199a8a9b92"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Initialize messaging only if supported (browser might not support it)
export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});
