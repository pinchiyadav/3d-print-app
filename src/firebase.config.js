import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "AIzaSyByijgSz0Q_rDTrEaQUs2w_Azr-sGP8zcY",
      authDomain: "model-3d-print.firebaseapp.com",
      projectId: "model-3d-print",
      storageBucket: "model-3d-print.firebasestorage.app",
      messagingSenderId: "564935462378",
      appId: "1:564935462378:web:82bab77c45c5c0e34d7693",
      measurementId: "G-RVYJ0K79G6"
    };

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
export const appId = rawAppId.replace(/[\/.]/g, '-');
export const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Admin Configuration ---
export const ADMIN_EMAIL = "admin@example.com"; // **IMPORTANT**: Change this

// --- Firebase Paths ---
export const getBaseDataPath = () => `/artifacts/${appId}/public/data`;
export const getUsersCollectionPath = () => `${getBaseDataPath()}/users`;
export const getOrdersCollectionPath = () => `${getBaseDataPath()}/orders`;
export const getRedeemRequestsCollectionPath = () => `${getBaseDataPath()}/redeemRequests`;
export const getCountersCollectionPath = () => `${getBaseDataPath()}/counters`;
export const getManualAdjustmentsCollectionPath = () => `${getBaseDataPath()}/manualAdjustments`;
export const getModelsCollectionPath = () => `${getBaseDataPath()}/models`;
