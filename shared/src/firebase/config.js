/**
 * Firebase Configuration
 * Shared Firebase config for web and mobile apps
 */

// Firebase configuration object
// This can be overridden by platform-specific implementations
export const firebaseConfig = {
  apiKey: "AIzaSyByijgSz0Q_rDTrEaQUs2w_Azr-sGP8zcY",
  authDomain: "model-3d-print.firebaseapp.com",
  projectId: "model-3d-print",
  storageBucket: "model-3d-print.firebasestorage.app",
  messagingSenderId: "564935462378",
  appId: "1:564935462378:web:82bab77c45c5c0e34d7693",
  measurementId: "G-RVYJ0K79G6"
};

// Admin email (used for admin-only operations)
export const ADMIN_EMAIL = "admin@example.com";

/**
 * Get the base data path for Firestore collections
 * @param {string} appId - The application ID
 * @returns {string} The base path
 */
export const getBaseDataPath = (appId) => {
  const sanitizedAppId = appId.replace(/[\/.]/g, '-');
  return `/artifacts/${sanitizedAppId}/public/data`;
};

/**
 * Get the path for the users collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getUsersCollectionPath = (appId) => `${getBaseDataPath(appId)}/users`;

/**
 * Get the path for the orders collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getOrdersCollectionPath = (appId) => `${getBaseDataPath(appId)}/orders`;

/**
 * Get the path for the redeem requests collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getRedeemRequestsCollectionPath = (appId) => `${getBaseDataPath(appId)}/redeemRequests`;

/**
 * Get the path for the counters collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getCountersCollectionPath = (appId) => `${getBaseDataPath(appId)}/counters`;

/**
 * Get the path for the manual adjustments collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getManualAdjustmentsCollectionPath = (appId) => `${getBaseDataPath(appId)}/manualAdjustments`;

/**
 * Get the path for the models collection
 * @param {string} appId - The application ID
 * @returns {string} The collection path
 */
export const getModelsCollectionPath = (appId) => `${getBaseDataPath(appId)}/models`;
