import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  firebaseConfig as sharedFirebaseConfig,
  ADMIN_EMAIL,
  getUsersCollectionPath as getSharedUsersPath,
  getOrdersCollectionPath as getSharedOrdersPath,
  getRedeemRequestsCollectionPath as getSharedRedeemPath,
  getCountersCollectionPath as getSharedCountersPath,
  getManualAdjustmentsCollectionPath as getSharedAdjustmentsPath,
  getModelsCollectionPath as getSharedModelsPath,
} from '@3d-print-app/shared';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : sharedFirebaseConfig;

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
export const appId = rawAppId.replace(/[\/.]/g, '-');
export const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export admin email from shared
export { ADMIN_EMAIL };

// --- Firebase Paths (wrapper functions that use shared paths with appId) ---
export const getUsersCollectionPath = () => getSharedUsersPath(appId);
export const getOrdersCollectionPath = () => getSharedOrdersPath(appId);
export const getRedeemRequestsCollectionPath = () => getSharedRedeemPath(appId);
export const getCountersCollectionPath = () => getSharedCountersPath(appId);
export const getManualAdjustmentsCollectionPath = () => getSharedAdjustmentsPath(appId);
export const getModelsCollectionPath = () => getSharedModelsPath(appId);
