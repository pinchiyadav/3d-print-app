import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  firebaseConfig,
  getUsersCollectionPath,
  getOrdersCollectionPath,
  getRedeemRequestsCollectionPath,
  getCountersCollectionPath,
  getManualAdjustmentsCollectionPath,
  getModelsCollectionPath,
} from '@3d-print-app/shared';

// App ID for mobile (can be configured)
const APP_ID = 'default-app-id';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase instances
export { auth, db, storage, APP_ID };

// Export collection paths with APP_ID pre-applied
export const USERS_PATH = getUsersCollectionPath(APP_ID);
export const ORDERS_PATH = getOrdersCollectionPath(APP_ID);
export const REDEEM_REQUESTS_PATH = getRedeemRequestsCollectionPath(APP_ID);
export const COUNTERS_PATH = getCountersCollectionPath(APP_ID);
export const MANUAL_ADJUSTMENTS_PATH = getManualAdjustmentsCollectionPath(APP_ID);
export const MODELS_PATH = getModelsCollectionPath(APP_ID);
