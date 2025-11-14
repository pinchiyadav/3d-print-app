import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithCustomToken,
  signInAnonymously,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  updateDoc,
  runTransaction,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

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
const appId = rawAppId.replace(/[\/.]/g, '-'); // Sanitize to prevent path errors
const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Admin Configuration ---
const ADMIN_EMAIL = "admin@example.com"; // **IMPORTANT**: Change this

// --- Firebase Paths ---
const getBaseDataPath = () => `/artifacts/${appId}/public/data`;
const getUsersCollectionPath = () => `${getBaseDataPath()}/users`;
const getOrdersCollectionPath = () => `${getBaseDataPath()}/orders`;
const getRedeemRequestsCollectionPath = () => `${getBaseDataPath()}/redeemRequests`;
const getCountersCollectionPath = () => `${getBaseDataPath()}/counters`;
const getManualAdjustmentsCollectionPath = () => `${getBaseDataPath()}/manualAdjustments`;
const getModelsCollectionPath = () => `${getBaseDataPath()}/models`; // New

// --- Icon Components (Inline SVG) ---
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);
const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.19-9.51L1 10" />
  </svg>
);
const DollarSignIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);
const UsersIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const CubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);
const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="currentColor"/>
    <path d="M12 6L12 12L16 14M12 6L12 12L8 14M12 6L16 14M12 6L8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 14L12 20L8 14L12 12L16 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


/**
 * Main Application Component
 */
export default function App() {
  const [authUser, setAuthUser] = useState(null); // Firebase Auth user
  const [photographer, setPhotographer] = useState(null); // Our custom user doc from Firestore
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [error, setError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [modal, setModal] = useState({ type: null, data: null }); // For Modals
  const [adminOrderFilter, setAdminOrderFilter] = useState({ filterBy: null, value: null });

  // Load JSZip script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  }, []);

  const fetchPhotographerData = async (uid) => {
    if (!uid) {
      console.warn("fetchPhotographerData called with no UID");
      return null;
    }
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if(!authUser || authUser.uid === uid) {
           setPhotographer(userData);
        }
        return userData;
      } else {
        console.warn("No user document found for uid:", uid);
        return null;
      }
    } catch (error)
    {
      console.error("Error fetching user data:", error);
      setError("Could not fetch user profile.");
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        await fetchPhotographerData(user.uid);
        
        if (user.email === ADMIN_EMAIL) {
          if (page === 'adminOrders' && adminOrderFilter.filterBy) {
            // Do nothing, stay on adminOrders page
          } else if (modal.type === 'adminUser' && page === 'adminUsers') {
             // do nothing, keep page and modal
          } else {
             setPage('adminDashboard');
          }
        } else if (user.isAnonymous) {
          setPage('login');
        } else {
          setPage('dashboard');
        }
      } else {
        setAuthUser(null);
        setPhotographer(null);
        setPage('login');
      }
      setLoadingAuth(false);
      setIsAuthReady(true);
    });

    const checkInitialAuth = async () => {
      if (!auth.currentUser) { 
        if (initialToken) {
          try {
            await signInWithCustomToken(auth, initialToken);
          } catch (tokenError) {
            console.error("Error signing in with token:", tokenError);
            await signInAnonymously(auth);
          }
        }
      }
    };
    checkInitialAuth();
    return () => unsubscribe();
  }, []); // Removed adminOrderFilter from deps to stop re-running

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthUser(null);
      setPhotographer(null);
      setPage('login');
    } catch (error) {
      console.error("Error signing out: ", error);
      setError(error.message);
    }
  };

  const navigate = (targetPage) => {
    setError('');
    // Clear filters when navigating away from admin orders
    if (page === 'adminOrders' && targetPage !== 'adminOrders') {
      setAdminOrderFilter({ filterBy: null, value: null });
    }
    setPage(targetPage);
  };
  
  // Navigation for Admin to filter orders by user
  const adminFilterOrdersByUser = (photographerPId) => {
    setAdminOrderFilter({ filterBy: 'photographerPId', value: photographerPId });
    setPage('adminOrders');
  };


  if (loadingAuth || !isAuthReady) {
    return <LoadingScreen />;
  }

  if (!authUser || (authUser.email !== ADMIN_EMAIL && !photographer && !authUser.isAnonymous)) {
    if (page === 'signup') {
      return <SignUpPage setPage={navigate} setError={setError} error={error} fetchPhotographerData={fetchPhotographerData} />;
    }
    return <LoginPage setPage={navigate} setError={setError} error={error} />;
  }
  
  // User is logged in and photographer data is loaded (or is admin)
  const isAdmin = authUser && authUser.email === ADMIN_EMAIL;
  
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <Navbar 
        user={authUser} 
        photographer={photographer}
        navigate={navigate} 
        handleSignOut={handleSignOut} 
        currentPage={page} 
        isAdmin={isAdmin}
      />
      <main className="flex-1">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {error && <ErrorMessage message={error} onClose={() => setError('')} />}
          
          {!isAdmin ? (
            <>
              {page === 'dashboard' && <Dashboard navigate={navigate} user={authUser} photographer={photographer} setError={setError} />}
              {page === 'placeOrder' && <PlaceOrderPage navigate={navigate} user={authUser} photographer={photographer} />}
              {page === 'previousOrders' && <PreviousOrdersPage user={authUser} photographer={photographer} setModal={setModal} />}
              {page === 'profile' && <ProfilePage user={authUser} photographer={photographer} setPhotographer={setPhotographer} setError={setError} />}
              {page === 'earningStatement' && <EarningStatementPage user={authUser} photographer={photographer} />}
              {page === 'redeemHistory' && <RedeemHistoryPage user={authUser} photographer={photographer} />}
              {page === 'models' && <ModelsPage />}
            </>
          ) : (
            <>
              {page === 'adminDashboard' && <AdminDashboard />}
              {page === 'adminOrders' && (
                <AdminOrdersTab 
                  setModal={setModal} 
                  adminOrderFilter={adminOrderFilter}
                  setAdminOrderFilter={setAdminOrderFilter}
                  adminFilterOrdersByUser={adminFilterOrdersByUser} 
                />
              )}
              {page === 'adminUsers' && <AdminUsersPage setModal={setModal} adminFilterOrdersByUser={adminFilterOrdersByUser} />}
              {page === 'adminRedeem' && <AdminRedeemTab setModal={setModal} />}
              {page === 'adminModels' && <AdminModelsPage />}
            </>
          )}
        </div>
      </main>

      {/* --- Modals --- */}
      {modal.type === 'order' && (
        <OrderModal 
          order={modal.data} 
          onClose={() => setModal({ type: null, data: null })} 
          isAdmin={isAdmin}
          setError={setError}
        />
      )}
      {modal.type === 'redeem' && isAdmin && (
        <RedeemModal 
          request={modal.data} 
          onClose={() => setModal({ type: null, data: null })} 
          adminUser={authUser}
          setError={setError}
        />
      )}
      {modal.type === 'adminUser' && isAdmin && (
        <AdminUserModal 
          photographer={modal.data} 
          onClose={() => setModal({ type: null, data: null })} 
          adminUser={authUser}
          setError={setError}
        />
      )}
    </div>
  );
}

/**
 * Vertical Navigation Bar Component
 */
function Navbar({ user, photographer, navigate, handleSignOut, currentPage, isAdmin }) {
  const userName = isAdmin ? "Administrator" : (photographer?.displayName || user?.email);
  const userRole = isAdmin ? "Administrator" : `Photographer (${photographer?.photographerId || '...'})`;

  return (
    <nav className="w-64 bg-white shadow-lg flex flex-col h-screen sticky top-0">
      <div className="flex items-center justify-center h-20 border-b border-slate-200">
        <Logo />
        <span className="text-xl font-bold text-slate-800 ml-2">3D Prints</span>
      </div>
      <div className="flex-1 overflow-y-auto mt-6">
        <div className="px-4 space-y-2">
          {!isAdmin ? (
            <>
              <NavItem 
                onClick={() => navigate('dashboard')} 
                active={currentPage === 'dashboard'}
                icon={<DashboardIcon />}
              >
                Dashboard
              </NavItem>
              <NavItem 
                onClick={() => navigate('placeOrder')} 
                active={currentPage === 'placeOrder'}
                icon={<BriefcaseIcon />}
              >
                Place Order
              </NavItem>
              <NavItem 
                onClick={() => navigate('previousOrders')} 
                active={currentPage === 'previousOrders'}
                icon={<HistoryIcon />}
              >
                My Orders
              </NavItem>
              <NavItem 
                onClick={() => navigate('models')} 
                active={currentPage === 'models'}
                icon={<CubeIcon />}
              >
                View 3D Models
              </NavItem>
              <NavItem 
                onClick={() => navigate('earningStatement')} 
                active={currentPage === 'earningStatement'}
                icon={<DollarSignIcon />}
              >
                My Earnings
              </NavItem>
              <NavItem 
                onClick={() => navigate('redeemHistory')} 
                active={currentPage === 'redeemHistory'}
                icon={<CreditCardIcon />}
              >
                Redeem History
              </NavItem>
              <NavItem 
                onClick={() => navigate('profile')} 
                active={currentPage === 'profile'}
                icon={<UserIcon />}
              >
                My Profile
              </NavItem>
            </>
          ) : (
            <>
              <NavItem 
                onClick={() => navigate('adminDashboard')} 
                active={currentPage === 'adminDashboard'}
                icon={<DashboardIcon />}
              >
                Dashboard
              </NavItem>
              <NavItem 
                onClick={() => navigate('adminOrders')} 
                active={currentPage === 'adminOrders'}
                icon={<BriefcaseIcon />}
              >
                All Orders
              </NavItem>
               <NavItem 
                onClick={() => navigate('adminUsers')} 
                active={currentPage === 'adminUsers'}
                icon={<UsersIcon />}
              >
                Manage Users
              </NavItem>
              <NavItem 
                onClick={() => navigate('adminRedeem')} 
                active={currentPage === 'adminRedeem'}
                icon={<CreditCardIcon />}
              >
                Redeem Requests
              </NavItem>
              <NavItem 
                onClick={() => navigate('adminModels')} 
                active={currentPage === 'adminModels'}
                icon={<CubeIcon />}
              >
                Manage Models
              </NavItem>
            </>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-slate-200">
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
          <p className="text-xs text-slate-500">{userRole}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOutIcon />
          <span className="ml-2">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

const NavItem = ({ onClick, children, active, icon, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center ${
      active
        ? 'bg-blue-50 text-blue-600'
        : 'text-slate-700 hover:bg-slate-100'
    } ${className}`}
  >
    {icon && <span className="mr-3">{icon}</span>}
    {children}
  </button>
);

/**
 * Login Page Component
 */
function LoginPage({ setPage, setError, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <AuthForm
      title="Welcome Back!"
      subtitle="Photographer Login"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      submitText="Login"
      footer={
        <p className="text-sm text-slate-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setPage('signup')}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Create one
          </button>
        </p>
      }
    >
      <Input
        id="email"
        type="email"
        label="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
    </AuthForm>
  );
}

/**
 * Sign Up Page Component
 */
function SignUpPage({ setPage, setError, error, fetchPhotographerData }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (name.length < 4) {
      setError("Full name must be at least 4 characters long.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;
      
      await updateProfile(authUser, {
        displayName: name,
      });

      const counterRef = doc(db, getCountersCollectionPath(), "photographerCounter");
      
      const newPhotographerId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = counterDoc.data().count + 1;
        }
        
        const baseId = name.substring(0, 4).toUpperCase();
        const paddedCount = String(newCount).padStart(3, '0');
        const photographerId = `${baseId}${paddedCount}`;
        
        transaction.set(counterRef, { count: newCount });
        return photographerId;
      });

      const userDocRef = doc(db, getUsersCollectionPath(), authUser.uid);
      await setDoc(userDocRef, {
        uid: authUser.uid,
        photographerId: newPhotographerId,
        displayName: name,
        email: authUser.email,
        createdAt: Timestamp.now(),
        orderCounter: 0,
        bankDetails: {
          accountName: '',
          accountNumber: '',
          ifsc: ''
        }
      });
      
      await fetchPhotographerData(authUser.uid);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <AuthForm
      title="Create Photographer Account"
      subtitle="Get started with your 3D print business"
      onSubmit={handleSignUp}
      loading={loading}
      error={error}
      submitText="Create Account"
      footer={
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setPage('login')}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Log in
          </button>
        </p>
      }
    >
      <Input
        id="name"
        type="text"
        label="Full Name (min. 4 characters)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        id="email"
        type="email"
        label="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        type="password"
        label="Password (min. 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
    </AuthForm>
  );
}

/**
 * Photographer Dashboard Page
 */
function Dashboard({ navigate, user, photographer, setError }) {
  const [orders, setOrders] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const ordersQuery = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
    const redeemQuery = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
    const adjustmentsQuery = query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching orders: ", error));

    const unsubRedeem = onSnapshot(redeemQuery, (snapshot) => {
      setRedeemRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching redeem requests: ", error));
    
    const unsubAdjustments = onSnapshot(adjustmentsQuery, (snapshot) => {
      setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching adjustments: ", error));


    Promise.all([getDocs(ordersQuery), getDocs(redeemQuery), getDocs(adjustmentsQuery)]).then(() => {
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubRedeem();
      unsubAdjustments();
    };
  }, [photographer?.uid]);

  const stats = useMemo(() => {
    const total = orders.length;
    const progress = orders.filter(o => ['pending', 'printing', 'shipped'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const unaccepted = orders.filter(o => o.status === 'unaccepted').length;
    const rejected = orders.filter(o => o.status === 'rejected').length;
    
    const orderEarnings = (delivered * 300) - (unaccepted * 100);
    const adjustmentEarnings = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const grossEarnings = orderEarnings + adjustmentEarnings;
    
    const totalRedeemed = redeemRequests
      .filter(r => r.status === 'paid' && r.amountPaid)
      .reduce((sum, r) => sum + r.amountPaid, 0);
      
    const redeemableEarnings = grossEarnings - totalRedeemed;
    
    return { total, progress, delivered, unaccepted, rejected, grossEarnings, totalRedeemed, redeemableEarnings };
  }, [orders, redeemRequests, adjustments]);

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (!amount || amount <= 0) {
      setMessage("Please enter a valid amount to redeem.");
      return;
    }
    if (amount > stats.redeemableEarnings) {
      setMessage("You cannot redeem more than your redeemable earnings.");
      return;
    }
    if (!photographer.bankDetails?.accountNumber || !photographer.bankDetails?.ifsc) {
      setMessage('Please update your bank details on your Profile page before redeeming.');
      return;
    }

    setRedeemLoading(true);
    setMessage('');
    try {
      await addDoc(collection(db, getRedeemRequestsCollectionPath()), {
        photographerId: photographer.uid,
        photographerName: photographer.displayName || user.email,
        photographerPId: photographer.photographerId,
        amount: amount, // Use the custom amount
        status: 'pending',
        requestedAt: Timestamp.now(),
      });
      setMessage('Redeem request submitted successfully!');
      setRedeemAmount('');
    } catch (error) {
      console.error("Error submitting redeem request: ", error);
      setMessage('Failed to submit request. Please try again.');
    }
    setRedeemLoading(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Welcome, {user.displayName || user.email}!
      </h1>
      
      {message && <SuccessMessage message={message} onClose={() => setMessage('')} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Total Orders" value={stats.total} icon={<BriefcaseIcon />} color="blue" />
        <StatCard title="Orders in Progress" value={stats.progress} icon={<ClockIcon />} color="yellow" />
        <StatCard title="Successfully Delivered" value={stats.delivered} icon={<CheckCircleIcon />} color="green" />
        <StatCard title="Unaccepted Orders" value={stats.unaccepted} icon={<XCircleIcon />} color="red" />
        <StatCard title="Rejected Orders" value={stats.rejected} icon={<XCircleIcon />} color="gray" />
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Redeemable Earnings</h2>
          <p className="text-4xl font-extrabold text-blue-600 mt-2">
            ₹{stats.redeemableEarnings.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            (Gross: ₹{stats.grossEarnings.toLocaleString('en-IN')}) - (Redeemed: ₹{stats.totalRedeemed.toLocaleString('en-IN')})
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 w-full sm:w-auto">
          <Input 
            id="redeemAmount"
            type="number"
            label="Amount to Redeem"
            placeholder={`Max: ${stats.redeemableEarnings}`}
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            className="sm:w-48"
          />
          <button
            onClick={handleRedeem}
            disabled={redeemLoading || stats.redeemableEarnings <= 0}
            className="mt-2 w-full sm:w-48 px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redeemLoading ? 'Submitting...' : 'Redeem Custom Amount'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * File Upload with Preview Component
 */
function FileUploadWithPreview({ files, setFiles, uploadProgress, maxFiles = 10, title="Upload Photos" }) {
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      const fileObjects = newFiles.map(file => ({
        file: file,
        preview: URL.createObjectURL(file)
      }));
      
      if (maxFiles === 1) {
        setFiles(fileObjects); // Replace existing
      } else {
        if (files.length + newFiles.length > maxFiles) {
          alert(`You can only upload a maximum of ${maxFiles} files.`);
          return;
        }
        setFiles(prevFiles => [...prevFiles, ...fileObjects]);
      }
    }
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Clean up object URLs
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    }
  }, [files]);

  return (
    <div>
      <label htmlFor="photos" className="block text-sm font-medium text-slate-700 mb-1">
        {title} {maxFiles > 1 && `(Max ${maxFiles})`}
      </label>
      <input
        id="photos"
        type="file"
        multiple={maxFiles > 1}
        onChange={handleFileChange}
        accept="image/*"
        disabled={files.length >= maxFiles && maxFiles > 1}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
      />
      {files.length > 0 && (
        <div className={`mt-4 grid gap-2 ${maxFiles === 1 ? 'grid-cols-1 w-48' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'}`}>
          {files.map((f, index) => {
            const progress = uploadProgress[f.file.name];
            return (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 z-10"
                >
                  <XIcon />
                </button>
                {progress != null && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    {progress === 100 ? (
                      <CheckCircleIcon className="text-white h-8 w-8" />
                    ) : (
                      <span className="text-white font-bold text-lg">{progress}%</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Place Order Page Component
 */
function PlaceOrderPage({ navigate, user, photographer }) {
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPincode, setBuyerPincode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]); // Array of {file, preview}
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState({}); // { 'filename.jpg': 75 }
  
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      const fetchedModels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
    };
    fetchModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage('Please upload at least one photo.');
      return;
    }
    if (!selectedModel) {
      setMessage('Please select a 3D model.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setUploadProgress({});
    
    try {
      // 1. Upload Photos with Progress
      const uploadPromises = files.map(f => {
        return new Promise((resolve, reject) => {
          const fileRef = ref(storage, `order_photos/${photographer.uid}/${Date.now()}_${f.file.name}`);
          const uploadTask = uploadBytesResumable(fileRef, f.file);
          
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(prev => ({ ...prev, [f.file.name]: progress }));
            },
            (error) => {
              console.error("Upload Error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      });
      
      const photoUrls = await Promise.all(uploadPromises);
      
      // 2. Generate new Order ID
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      const newOrderId = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User document not found!");
        }
        const newOrderCount = userDoc.data().orderCounter + 1;
        const paddedCount = String(newOrderCount).padStart(3, '0');
        const orderId = `${photographer.photographerId}_${paddedCount}`;
        transaction.update(userDocRef, { orderCounter: newOrderCount });
        return orderId;
      });

      // 3. Create Order Document
      const selectedModelData = models.find(m => m.id === selectedModel);
      await addDoc(collection(db, getOrdersCollectionPath()), {
        orderId: newOrderId,
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        photographerName: photographer.displayName || user.email,
        buyerName,
        buyerPhone,
        buyerAddress,
        buyerPincode,
        modelId: selectedModel,
        modelName: selectedModelData?.modelName || 'Unknown Model',
        remarks,
        photoUrls,
        status: 'pending',
        createdAt: Timestamp.now(),
        adminComments: ""
      });
      
      // 4. Reset form
      setMessage(`Order placed successfully! Your Order ID is: ${newOrderId}`);
      setBuyerName('');
      setBuyerPhone('');
      setBuyerAddress('');
      setBuyerPincode('');
      setRemarks('');
      setFiles([]);
      setSelectedModel('');
      e.target.reset();
      
      setTimeout(() => navigate('previousOrders'), 3000);
    } catch (error) {
      console.error("Error placing order: ", error);
      setMessage(`Failed to place order: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Place a New Order</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="photographerName"
          type="text"
          label="Photographer Name"
          value={`${photographer.displayName} (${photographer.photographerId})`}
          disabled
          className="bg-slate-100"
        />
        <Select
          id="model"
          label="Select 3D Model"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          required
        >
          <option value="" disabled>-- Select a Model --</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
        
        <Input
          id="buyerName"
          type="text"
          label="Buyer's Name"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          required
        />
        <Input
          id="buyerPhone"
          type="tel"
          label="Buyer's Phone Number"
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          required
        />
        <TextArea
          id="buyerAddress"
          label="Buyer's Address"
          value={buyerAddress}
          onChange={(e) => setBuyerAddress(e.target.value)}
          required
        />
        <Input
          id="buyerPincode"
          type="text"
          label="Buyer's Pincode"
          value={buyerPincode}
          onChange={(e) => setBuyerPincode(e.target.value)}
          required
        />
        
        <FileUploadWithPreview 
          files={files} 
          setFiles={setFiles} 
          uploadProgress={uploadProgress} 
        />

        <TextArea
          id="remarks"
          label="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting Order...' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}

/**
 * Previous Orders Page Component
 */
function PreviousOrdersPage({ user, photographer, setModal }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [modelFilter, setModelFilter] = useState('all');
  
  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      setModels(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchModels();

    const q = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [photographer?.uid]);

  useEffect(() => {
    let newFilteredOrders = [...orders];
    if (modelFilter !== 'all') {
      newFilteredOrders = newFilteredOrders.filter(o => o.modelId === modelFilter);
    }
    setFilteredOrders(newFilteredOrders);
  }, [orders, modelFilter]);


  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Your Previous Orders</h1>
        <Select 
          id="modelFilter"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="mt-4 md:mt-0 w-full md:w-64"
        >
          <option value="all">All Models</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-slate-500">You haven't placed any orders yet{modelFilter !== 'all' && ' for this model'}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Order ID</Th>
                <Th>Model</Th>
                <Th>Buyer Name</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Admin Comments</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredOrders.map(order => (
                <tr 
                  key={order.id}
                  onClick={() => setModal({ type: 'order', data: order })}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Td>{order.orderId}</Td>
                  <Td>{order.modelName || 'N/A'}</Td>
                  <Td>{order.buyerName}</Td>
                  <Td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                  <Td>
                    <span className="truncate block w-48">{order.adminComments || '-'}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Photographer Profile Page
 */
function ProfilePage({ user, photographer, setPhotographer, setError }) {
  const [bankDetails, setBankDetails] = useState(photographer.bankDetails || { accountName: '', accountNumber: '', ifsc: '' });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const handleBankSave = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    setBankMessage('');
    setError('');
    
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      await updateDoc(userDocRef, { bankDetails });
      setPhotographer(prev => ({ ...prev, bankDetails }));
      setBankMessage('Bank details updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to update bank details. Please try again.');
    }
    setBankLoading(false);
  };

  const handleBankChange = (e) => {
    const { id, value } = e.target;
    setBankDetails(prev => ({ ...prev, [id]: value }));
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage('');
    setPassError('');
    
    if (newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      setPassLoading(false);
      return;
    }
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Re-auth successful, now update password
      await updatePassword(currentUser, newPassword);
      
      setPassMessage('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      console.error(error);
      setPassError(`Failed to update password: ${error.message}`);
    }
    setPassLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Profile</h1>
        <div className="space-y-4">
          <Input
            id="photographerId"
            label="Photographer ID"
            value={photographer.photographerId}
            disabled
          />
          <Input
            id="displayName"
            label="Full Name"
            value={photographer.displayName}
            disabled
          />
          <Input
            id="email"
            label="Email"
            value={photographer.email}
            disabled
          />
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Bank Details (for Payouts)
        </h2>
        {bankMessage && <SuccessMessage message={bankMessage} onClose={() => setBankMessage('')} />}
        <form onSubmit={handleBankSave} className="space-y-6">
          <Input
            id="accountName"
            label="Bank Account Holder Name"
            value={bankDetails.accountName}
            onChange={handleBankChange}
            required
          />
          <Input
            id="accountNumber"
            label="Bank Account Number"
            value={bankDetails.accountNumber}
            onChange={handleBankChange}
            required
          />
          <Input
            id="ifsc"
            label="IFSC Code"
            value={bankDetails.ifsc}
            onChange={handleBankChange}
            required
          />
          
          <button
            type="submit"
            disabled={bankLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {bankLoading ? 'Saving...' : 'Save Bank Details'}
          </button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Change Password
        </h2>
        {passMessage && <SuccessMessage message={passMessage} onClose={() => setPassMessage('')} />}
        {passError && <ErrorMessage message={passError} onClose={() => setPassError('')} />}
        <form onSubmit={handleChangePassword} className="space-y-6">
          <Input
            id="oldPassword"
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={passLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Photographer Earning Statement Page (FIXED)
 */
function EarningStatementPage({ user, photographer }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const ordersQuery = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
        const redeemQuery = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
        const adjustmentsQuery = query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid));

        const [ordersSnap, redeemSnap, adjustmentsSnap] = await Promise.all([
          getDocs(ordersQuery),
          getDocs(redeemQuery),
          getDocs(adjustmentsQuery)
        ]);

        let combinedLedger = [];

        // 1. Process Orders
        ordersSnap.docs.forEach(doc => {
          const order = doc.data();
          if (order.status === 'delivered') {
            combinedLedger.push({
              id: doc.id,
              date: order.createdAt,
              description: `Earning from Order ${order.orderId}`,
              type: 'Earning',
              amount: 300
            });
          } else if (order.status === 'unaccepted') {
            combinedLedger.push({
              id: doc.id,
              date: order.createdAt,
              description: `Penalty for Order ${order.orderId}`,
              type: 'Penalty',
              amount: -100
            });
          }
        });

        // 2. Process Redeem Requests
        redeemSnap.docs.forEach(doc => {
          const req = doc.data();
          if (req.status === 'paid' && req.amountPaid) {
            combinedLedger.push({
              id: doc.id,
              date: req.processedAt || req.requestedAt,
              description: `Redeem Payout (Ref: ${doc.id.substring(0, 5)})`,
              type: 'Payout',
              amount: -req.amountPaid
            });
          }
        });
        
        // 3. Process Manual Adjustments
        adjustmentsSnap.docs.forEach(doc => {
           const adj = doc.data();
           combinedLedger.push({
             id: doc.id,
             date: adj.createdAt,
             description: `Manual Adjustment: ${adj.remarks}`,
             type: 'Adjustment',
             amount: adj.amount
           });
        });

        // Sort by date
        combinedLedger.sort((a, b) => b.date.seconds - a.date.seconds);
        setLedger(combinedLedger);

      } catch (err) {
        console.error("Error building ledger:", err);
      }
      setLoading(false);
    };

    // Use onSnapshot to rebuild ledger on data change
    const unsubOrders = onSnapshot(query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    const unsubRedeem = onSnapshot(query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    const unsubAdjustments = onSnapshot(query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    
    fetchData(); // Initial fetch

    return () => {
      unsubOrders();
      unsubRedeem();
      unsubAdjustments();
    };
  }, [photographer?.uid]);

  const summary = useMemo(() => {
    const totalEarnings = ledger.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
    const totalDeductions = ledger.filter(i => i.amount < 0 && i.type !== 'Payout').reduce((sum, i) => sum + i.amount, 0);
    const totalPayouts = ledger.filter(i => i.type === 'Payout').reduce((sum, i) => sum + i.amount, 0);
    const netBalance = totalEarnings + totalDeductions + totalPayouts;
    
    return { totalEarnings, totalDeductions, totalPayouts, netBalance };
  }, [ledger]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Earning Statement</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Gross Earnings" value={`₹${summary.totalEarnings.toLocaleString('en-IN')}`} icon={<DollarSignIcon />} color="green" />
        <StatCard title="Total Deductions" value={`₹${summary.totalDeductions.toLocaleString('en-IN')}`} icon={<XCircleIcon />} color="red" />
        <StatCard title="Total Payouts" value={`₹${summary.totalPayouts.toLocaleString('en-IN')}`} icon={<CreditCardIcon />} color="blue" />
        <StatCard title="Current Balance" value={`₹${summary.netBalance.toLocaleString('en-IN')}`} icon={<BriefcaseIcon />} color="yellow" />
      </div>

      {ledger.length === 0 ? (
        <p className="text-slate-500">No transactions found yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {ledger.map(item => (
                <tr key={item.id}>
                  <Td>{new Date(item.date.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>{item.description}</Td>
                  <Td><StatusBadge status={item.type.toLowerCase()} /></Td>
                  <Td className={item.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {item.amount > 0 ? '+' : ''}₹{item.amount.toLocaleString('en-IN')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/**
 * Photographer Redeem History Page
 */
function RedeemHistoryPage({ user, photographer }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);
    const q = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedRequests.sort((a, b) => b.requestedAt.seconds - a.requestedAt.seconds);
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching redeem history: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [photographer?.uid]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Redeem History</h1>
      {requests.length === 0 ? (
        <p className="text-slate-500">You haven't made any redeem requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date Requested</Th>
                <Th>Amount Requested</Th>
                <Th>Status</Th>
                <Th>Amount Paid</Th>
                <Th>Admin Remarks</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {requests.map(req => (
                <tr key={req.id}>
                  <Td>{new Date(req.requestedAt.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>₹{req.amount.toLocaleString('en-IN')}</Td>
                  <Td><StatusBadge status={req.status} /></Td>
                  <Td>{req.amountPaid ? `₹${req.amountPaid.toLocaleString('en-IN')}` : '-'}</Td>
                  <Td>{req.remarks || '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * User Models Page (Grid View)
 */
function ModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getModelsCollectionPath()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedModels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching models: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Our 3D Models</h1>
      {models.length === 0 ? (
        <p className="text-slate-500">No models have been added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {models.map(model => (
            <div key={model.id} className="rounded-xl border border-slate-200 shadow-md overflow-hidden">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {model.imageUrl ? (
                  <img src={model.imageUrl} alt={model.modelName} className="w-full h-full object-cover" />
                ) : (
                  <CubeIcon className="w-24 h-24 text-slate-400" />
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-800">{model.modelName}</h3>
                <p className="text-sm text-slate-600 mt-1">{model.modelDescription || 'No description.'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/**
 * Admin Dashboard Page
 */
function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    delivered: 0,
    unaccepted: 0,
    rejected: 0,
    inProgress: 0,
    redeemPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, getUsersCollectionPath()));
        const ordersSnap = await getDocs(collection(db, getOrdersCollectionPath()));
        const redeemSnap = await getDocs(query(collection(db, getRedeemRequestsCollectionPath()), where("status", "==", "pending")));

        const orders = ordersSnap.docs.map(d => d.data());
        
        setStats({
          users: usersSnap.size - 1, // -1 for admin
          orders: orders.length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          unaccepted: orders.filter(o => o.status === 'unaccepted').length,
          rejected: orders.filter(o => o.status === 'rejected').length,
          inProgress: orders.filter(o => ['pending', 'printing', 'shipped'].includes(o.status)).length,
          redeemPending: redeemSnap.size,
        });
      } catch (err) {
        console.error("Error fetching admin stats:", err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Photographers" value={stats.users} icon={<UsersIcon />} color="blue" />
        <StatCard title="Total Orders" value={stats.orders} icon={<BriefcaseIcon />} color="blue" />
        <StatCard title="Orders in Progress" value={stats.inProgress} icon={<ClockIcon />} color="yellow" />
        <StatCard title="Orders Delivered" value={stats.delivered} icon={<CheckCircleIcon />} color="green" />
        <StatCard title="Orders Unaccepted" value={stats.unaccepted} icon={<XCircleIcon />} color="red" />
        <StatCard title="Orders Rejected" value={stats.rejected} icon={<XCircleIcon />} color="gray" />
        <StatCard title="Pending Redeems" value={stats.redeemPending} icon={<CreditCardIcon />} color="yellow" />
      </div>
    </div>
  );
}

/**
 * Admin Page Component - All Orders
 */
function AdminOrdersTab({ setModal, adminOrderFilter, setAdminOrderFilter, adminFilterOrdersByUser }) {
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [models, setModels] = useState([]);
  const [modelFilter, setModelFilter] = useState('all');
  
  const [photographerName, setPhotographerName] = useState('');


  useEffect(() => {
    setLoading(true);
    
    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      setModels(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchModels();
    
    const q = query(collection(db, getOrdersCollectionPath()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setAllOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let orders = [...allOrders];
    
    // Global filter from Users page
    if (adminOrderFilter.filterBy === 'photographerPId' && adminOrderFilter.value) {
      orders = orders.filter(o => o.photographerPId === adminOrderFilter.value);
      // Fetch and display the photographer's name
      const user = orders.length > 0 ? orders[0].photographerName : adminOrderFilter.value;
      setPhotographerName(user);
    } else {
      setPhotographerName('');
    }

    // Local Status Filter
    if (statusFilter !== 'all') {
      orders = orders.filter(o => o.status === statusFilter);
    }
    
    // Local Model Filter
    if (modelFilter !== 'all') {
      orders = orders.filter(o => o.modelId === modelFilter);
    }

    // Local Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      orders = orders.filter(o => 
        o.photographerPId?.toLowerCase().includes(lowerSearch) ||
        o.buyerName?.toLowerCase().includes(lowerSearch) ||
        o.buyerPhone?.toLowerCase().includes(lowerSearch) ||
        o.orderId?.toLowerCase().includes(lowerSearch)
      );
    }
    
    setFilteredOrders(orders);
  }, [allOrders, searchTerm, statusFilter, modelFilter, adminOrderFilter]);


  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, getOrdersCollectionPath(), orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">All Customer Orders</h1>
        {adminOrderFilter.value && (
          <div className="text-right">
            <p className="text-sm text-slate-500">Showing orders for:</p>
            <span className="text-lg font-semibold text-blue-600">{photographerName} ({adminOrderFilter.value})</span>
            <button
              onClick={() => setAdminOrderFilter({ filterBy: null, value: null })}
              className="ml-2 text-sm text-red-500 hover:underline"
            >
              (Clear)
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative md:col-span-1">
          <Input
            id="search"
            type="text"
            placeholder="Search by UserID, Buyer Name, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="printing">Printing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="unaccepted">Unaccepted</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
          <option value="all">All Models</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Order ID</Th>
              <Th>UserID</Th>
              <Th>Model</Th>
              <Th>Buyer Name</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Admin Comments</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredOrders.map(order => (
              <tr 
                key={order.id}
                onClick={() => setModal({ type: 'order', data: order })}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Td>{order.orderId}</Td>
                <Td>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      adminFilterOrdersByUser(order.photographerPId);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {order.photographerPId}
                  </button>
                </Td>
                <Td>{order.modelName || 'N/A'}</Td>
                <Td>{order.buyerName}</Td>
                <Td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="printing">Printing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered (Success)</option>
                    <option value="unaccepted">Unaccepted (Failed)</option>
                    <option value="rejected">Rejected (No Penalty)</option>
                  </Select>
                </Td>
                <Td>
                  <span className="truncate block w-48">{order.adminComments || '-'}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Admin Page Component - All Users
 */
function AdminUsersPage({ setModal, adminFilterOrdersByUser }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getUsersCollectionPath()), where("email", "!=", ADMIN_EMAIL));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id, // This is the UID
        ...doc.data()
      }));
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    let activeUsers = [...users];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      activeUsers = activeUsers.filter(u =>
        u.displayName?.toLowerCase().includes(lowerSearch) ||
        u.photographerId?.toLowerCase().includes(lowerSearch) ||
        u.email?.toLowerCase().includes(lowerSearch)
      );
    }
    setFilteredUsers(activeUsers);
  }, [users, searchTerm]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">All Photographers</h1>
        <div className="relative mt-4 md:mt-0">
          <Input
            id="userSearch"
            type="text"
            placeholder="Search by UserID, Name, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>UserID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <Td>
                  <button 
                    onClick={() => adminFilterOrdersByUser(user.photographerId)}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.photographerId}
                  </button>
                </Td>
                <Td>{user.displayName}</Td>
                <Td>{user.email}</Td>
                <Td>{new Date(user.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                <Td>
                  <button
                    onClick={() => setModal({ type: 'adminUser', data: user })}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Edit / Adjust
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/**
 * Admin Page Component - Redeem Requests
 */
function AdminRedeemTab({ setModal }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getRedeemRequestsCollectionPath()), where("status", "==", filter));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedRequests.sort((a, b) => a.requestedAt.seconds - b.requestedAt.seconds);
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching redeem requests: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);
  
  const stats = useMemo(() => {
    return {
      total: requests.length,
    }
  }, [requests]);


  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Redeem Requests</h1>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b">
          <AdminNavItem title="Pending" active={filter==='pending'} onClick={() => setFilter('pending')} />
          <AdminNavItem title="Paid" active={filter==='paid'} onClick={() => setFilter('paid')} />
          <AdminNavItem title="Rejected" active={filter==='rejected'} onClick={() => setFilter('rejected')} />
        </div>
        <div className="text-right">
          <h4 className="text-sm font-medium text-slate-500">{filter.toUpperCase()} REQUESTS</h4>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="text-slate-500">No {filter} redeem requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Photographer</Th>
                <Th>UserID</Th>
                <Th>Date Requested</Th>
                <Th>Amount</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {requests.map(req => (
                <tr key={req.id}>
                  <Td>{req.photographerName}</Td>
                  <Td>{req.photographerPId}</Td>
                  <Td>{new Date(req.requestedAt.seconds * 1000).toLocaleString()}</Td>
                  <Td>₹{req.amount.toLocaleString('en-IN')}</Td>
                  <Td>
                    <button
                      onClick={() => setModal({ type: 'redeem', data: req })}
                      className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 shadow-sm"
                    >
                      View Request
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Admin Page Component - Manage Models
 */
function AdminModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [files, setFiles] = useState([]); // From FileUploadWithPreview
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getModelsCollectionPath()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedModels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to fetch models.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleAddModel = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setUploadProgress({});
    
    let imageUrl = '';
    
    try {
      // 1. Upload Image if it exists
      if (files.length > 0) {
        const file = files[0].file;
        const fileRef = ref(storage, `model_images/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        
        imageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress({ [file.name]: progress });
            },
            (error) => {
              console.error("Upload Error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }
      
      // 2. Add Model to Firestore
      await addDoc(collection(db, getModelsCollectionPath()), {
        modelName,
        modelDescription,
        imageUrl: imageUrl,
        createdAt: Timestamp.now()
      });
      
      // 3. Reset form
      setModelName('');
      setModelDescription('');
      setFiles([]);
      setUploadProgress({});
      
    } catch (err) {
      console.error("Error adding model:", err);
      setError(`Failed to add model: ${err.message}`);
    }
    setFormLoading(false);
  };
  
  const handleDeleteModel = async (model) => {
    if (!window.confirm(`Are you sure you want to delete the model "${model.modelName}"? This cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Delete image from Storage (if it exists)
      if (model.imageUrl) {
        try {
          const imageRef = ref(storage, model.imageUrl);
          await deleteObject(imageRef);
        } catch (storageError) {
          // Log error but continue deleting doc
          console.warn("Could not delete image from storage:", storageError.message);
        }
      }
      
      // 2. Delete model doc from Firestore
      await deleteDoc(doc(db, getModelsCollectionPath(), model.id));
      
    } catch (err) {
      console.error("Error deleting model:", err);
      setError(`Failed to delete model: ${err.message}`);
    }
    setLoading(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Manage 3D Models</h1>
        {models.length === 0 ? (
          <p className="text-slate-500">No models added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Image</Th>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {models.map(model => (
                  <tr key={model.id}>
                    <Td>
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                        {model.imageUrl ? (
                          <img src={model.imageUrl} alt={model.modelName} className="w-full h-full object-cover" />
                        ) : (
                          <CubeIcon className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                    </Td>
                    <Td>{model.modelName}</Td>
                    <Td><span className="truncate block w-64">{model.modelDescription || '-'}</span></Td>
                    <Td>
                      <button
                        onClick={() => handleDeleteModel(model)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="lg:col-span-1 bg-white p-8 rounded-xl shadow-lg h-fit">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Add New Model</h2>
        {error && <ErrorMessage message={error} onClose={() => setError('')} />}
        <form onSubmit={handleAddModel} className="space-y-6">
          <Input 
            id="modelName"
            label="Model Name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
          <TextArea 
            id="modelDescription"
            label="Model Description (optional)"
            value={modelDescription}
            onChange={(e) => setModelDescription(e.target.value)}
          />
          <FileUploadWithPreview
            title="Upload Image (optional)"
            files={files}
            setFiles={setFiles}
            uploadProgress={uploadProgress}
            maxFiles={1}
          />
          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {formLoading ? 'Adding Model...' : 'Add Model'}
          </button>
        </form>
      </div>
    </div>
  );
}


// --- Modals ---

/**
 * Order Details Modal
 */
function OrderModal({ order, onClose, isAdmin, setError }) {
  const [adminComments, setAdminComments] = useState(order.adminComments || '');
  const [saving, setSaving] = useState(false);
  const [zipState, setZipState] = useState('idle'); // 'idle', 'downloading', 'zipping'
  const [zipProgress, setZipProgress] = useState(0);

  const handleSaveComments = async () => {
    setSaving(true);
    try {
      const orderRef = doc(db, getOrdersCollectionPath(), order.id);
      await updateDoc(orderRef, { adminComments });
    } catch (err) {
      console.error(err);
      setError("Failed to save comments.");
    }
    setSaving(false);
  };
  
  const handleDownloadZip = async () => {
    if (typeof JSZip === 'undefined') {
      setError("File download library (JSZip) is not loaded yet. Please try again in a moment.");
      return;
    }
    
    setZipState('downloading');
    setZipProgress(0);
    setError('');
    
    try {
      const zip = new JSZip();
      
      const downloadPromises = order.photoUrls.map(async (url, index) => {
        let response;
        try {
           // IMPORTANT: This requires CORS to be set up on your Firebase Storage bucket!
           response = await fetch(url);
        } catch (e) {
           console.error("Fetch failed:", e);
           throw new Error(`Failed to fetch images. Please ensure Firebase Storage CORS is configured correctly. ${e.message}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch image ${index + 1} (status: ${response.status}). Check CORS settings.`);
        }
        const blob = await response.blob();
        const filename = url.split('?')[0].split('%2F').pop() || `image_${index + 1}.jpg`;
        zip.file(filename, blob);
      });
      
      await Promise.all(downloadPromises);
      
      setZipState('zipping'); // Move to zipping state
      setZipProgress(0);
      
      zip.generateAsync(
        { type: "blob" },
        (metadata) => { // This is the onUpdate callback for zipping
          setZipProgress(Math.round(metadata.percent));
        }
      ).then((content) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${order.orderId}_photos.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setZipState('idle');
      });
      
    } catch (err) {
      console.error(err);
      setError(`Failed to create zip file: ${err.message}.`);
      setZipState('idle');
    }
  };
  
  let zipButtonText = 'Download All as Zip';
  if (zipState === 'downloading') {
    zipButtonText = 'Downloading files...';
  } else if (zipState === 'zipping') {
    zipButtonText = `Zipping... (${zipProgress}%)`;
  }

  return (
    <Modal onClose={onClose} title={`Order Details: ${order.orderId}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoGroup title="Buyer Details">
          <InfoItem label="Name" value={order.buyerName} />
          <InfoItem label="Phone" value={order.buyerPhone} />
          <InfoItem label="Pincode" value={order.buyerPincode} />
          <InfoItem label="Address" value={order.buyerAddress} />
        </InfoGroup>
        
        <InfoGroup title="Order Info">
          <InfoItem label="Status"><StatusBadge status={order.status} /></InfoItem>
          <InfoItem label="3D Model" value={order.modelName || 'N/A'} />
          <InfoItem label="Photographer" value={`${order.photographerName} (${order.photographerPId})`} />
          <InfoItem label="Date" value={new Date(order.createdAt.seconds * 1000).toLocaleString()} />
          <InfoItem label="User Remarks" value={order.remarks || 'N/A'} />
        </InfoGroup>
      </div>

      <InfoGroup title="Uploaded Photos">
        <div className="flex flex-wrap gap-2 mt-2">
          {order.photoUrls.map((url, index) => (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
              Image {index + 1}
            </a>
          ))}
        </div>
        <button
          onClick={handleDownloadZip}
          disabled={zipState !== 'idle'}
          className="mt-4 flex items-center px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 shadow-sm disabled:opacity-50"
        >
          <DownloadIcon />
          <span className="ml-2">{zipButtonText}</span>
        </button>
      </InfoGroup>

      <InfoGroup title="Admin Comments">
        {isAdmin ? (
          <>
            <TextArea
              id="adminComments"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
            />
            <button
              onClick={handleSaveComments}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Comments'}
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-700 italic">
            {order.adminComments || "No comments from admin yet."}
          </p>
        )}
      </InfoGroup>
    </Modal>
  );
}

/**
 * Redeem Request Modal (Admin)
 */
function RedeemModal({ request, onClose, adminUser, setError }) {
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState(request.amount);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, getUsersCollectionPath(), request.photographerId));
        if (userDoc.exists()) {
          setPhotographer(userDoc.data());
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch photographer details.");
      }
      setLoading(false);
    };
    fetchUser();
  }, [request.photographerId, setError]);

  const handleAction = async (status) => {
    setActionLoading(true);
    setError('');
    
    if (status === 'paid' && (!amountPaid || amountPaid <= 0)) {
      setError("Amount paid must be greater than 0.");
      setActionLoading(false);
      return;
    }
    
    try {
      const requestRef = doc(db, getRedeemRequestsCollectionPath(), request.id);
      await updateDoc(requestRef, {
        status: status,
        remarks: remarks,
        amountPaid: status === 'paid' ? Number(amountPaid) : 0,
        processedAt: Timestamp.now(),
        adminId: adminUser.uid,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(`Failed to ${status} request.`);
    }
    setActionLoading(false);
  };

  return (
    <Modal onClose={onClose} title={`Redeem Request: ${request.photographerPId}`}>
      {loading ? (
        <LoadingScreen />
      ) : (
        <div className="space-y-6">
          <InfoGroup title="Request Details">
            <InfoItem label="Photographer" value={`${request.photographerName} (${request.photographerPId})`} />
            <InfoItem label="Date Requested" value={new Date(request.requestedAt.seconds * 1000).toLocaleString()} />
            <InfoItem label="Amount Requested" value={`₹${request.amount.toLocaleString('en-IN')}`} />
          </InfoGroup>
          
          {photographer?.bankDetails ? (
            <InfoGroup title="Bank Details">
              <InfoItem label="Account Name" value={photographer.bankDetails.accountName} />
              <InfoItem label="Account Number" value={photographer.bankDetails.accountNumber} />
              <InfoItem label="IFSC Code" value={photographer.bankDetails.ifsc} />
            </InfoGroup>
          ) : (
            <ErrorMessage message="No bank details found for this user." onClose={() => {}}/>
          )}

          <div className="space-y-4 pt-4 border-t">
            <Input
              id="amountPaid"
              label="Amount Paid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            <TextArea
              id="remarks"
              label="Remarks (for Paid or Rejected)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleAction('paid')}
                disabled={actionLoading || !photographer?.bankDetails}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark as Paid'}
              </button>
              <button
                onClick={() => handleAction('rejected')}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark as Rejected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Admin User Details Modal
 */
function AdminUserModal({ photographer, onClose, adminUser, setError }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjRemarks, setAdjRemarks] = useState('');
  
  const [userData, setUserData] = useState({
    displayName: photographer.displayName,
    email: photographer.email,
    bankDetails: photographer.bankDetails || { accountName: '', accountNumber: '', ifsc: '' }
  });
  
  const handleUserChange = (e) => {
    const { id, value } = e.target;
    setUserData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleBankChange = (e) => {
    const { id, value } = e.target;
    setUserData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [id]: value
      }
    }));
  };
  
  const handleSaveUserDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      await updateDoc(userDocRef, {
        displayName: userData.displayName,
        email: userData.email, // Note: This only changes Firestore, not Firebase Auth
        bankDetails: userData.bankDetails
      });
      
      if (userData.email !== photographer.email) {
        setMessage('User details saved. Email in Firebase Auth was not changed. User must still log in with old email.');
      } else {
        setMessage('User details saved successfully.');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save user details.");
    }
    setLoading(false);
  };
  
  const handleResetPassword = async () => {
    if (!window.confirm(`Send password reset email to ${photographer.email}?`)) return;
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await sendPasswordResetEmail(auth, photographer.email);
      setMessage('Password reset email sent successfully.');
    } catch (err) {
      console.error(err);
      setError(`Failed to send email: ${err.message}`);
    }
    setLoading(false);
  };


  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(adjAmount);
    if (!amount) {
      setError("Please enter a valid amount (e.g., 50 or -50).");
      return;
    }
    if (!adjRemarks) {
      setError("Remarks are mandatory for all adjustments.");
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await addDoc(collection(db, getManualAdjustmentsCollectionPath()), {
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        amount: amount,
        remarks: adjRemarks,
        createdAt: Timestamp.now(),
        adminId: adminUser.uid,
        adminEmail: adminUser.email
      });
      
      setMessage(`Adjustment of ₹${amount} posted successfully.`);
      setAdjAmount('');
      setAdjRemarks('');
    } catch (err) {
      console.error(err);
      setError("Failed to post adjustment.");
    }
    setLoading(false);
  };
  
  return (
    <Modal onClose={onClose} title={`Edit User: ${photographer.photographerPId}`}>
      <div className="space-y-6">
        {message && <SuccessMessage message={message} onClose={() => setMessage('')} />}
        
        <form onSubmit={handleSaveUserDetails} className="space-y-4">
          <InfoGroup title="Edit User Info">
            <Input 
              id="displayName"
              label="Full Name"
              value={userData.displayName}
              onChange={handleUserChange}
            />
            <Input 
              id="email"
              label="Email (Auth login email won't change)"
              type="email"
              value={userData.email}
              onChange={handleUserChange}
            />
          </InfoGroup>
          
          <InfoGroup title="Edit Bank Details">
            <Input
              id="accountName"
              label="Bank Account Holder Name"
              value={userData.bankDetails.accountName}
              onChange={handleBankChange}
            />
            <Input
              id="accountNumber"
              label="Bank Account Number"
              value={userData.bankDetails.accountNumber}
              onChange={handleBankChange}
            />
            <Input
              id="ifsc"
              label="IFSC Code"
              value={userData.bankDetails.ifsc}
              onChange={handleBankChange}
            />
          </InfoGroup>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save User Details'}
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full py-3 px-4 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Send Password Reset'}
            </button>
          </div>
        </form>
        
        <InfoGroup title="Manual Earnings Adjustment">
          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            <Input 
              id="adjAmount"
              label="Amount (use - for deduction)"
              type="number"
              step="any"
              placeholder="-100"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.g.target.value)}
              required
            />
            <TextArea 
              id="adjRemarks"
              label="Remarks (Mandatory)"
              placeholder="e.g., Bonus for excellent work"
              value={adjRemarks}
              onChange={(e) => setAdjRemarks(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Adjustment'}
            </button>
          </form>
        </InfoGroup>
      </div>
    </Modal>
  );
}


// --- Reusable UI Components ---

const Modal = ({ children, onClose, title }) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
          <XIcon />
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

const InfoGroup = ({ title, children }) => (
  <div className="mt-4">
    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row">
    <span className="text-sm font-medium text-slate-500 w-32">{label}:</span>
    <span className="text-sm text-slate-800 flex-1">{value}</span>
  </div>
);

const AdminNavItem = ({ title, active, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-4 font-medium text-sm focus:outline-none ${
      active
        ? 'border-b-2 border-blue-500 text-blue-600'
        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {title}
  </button>
);

const AuthForm = ({ title, subtitle, onSubmit, loading, error, submitText, footer, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full">
      <div className="flex items-center justify-center mb-6">
        <Logo />
        <span className="text-2xl font-bold text-slate-800 ml-2">3D Prints</span>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        {error && <ErrorMessage message={error} onClose={() => {}} />}
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            {children}
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Processing...' : submitText}
            </button>
          </div>
        </form>
        <div className="text-center">
          {footer}
        </div>
      </div>
    </div>
  </div>
);

const Input = ({ id, label, className = '', ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>}
    <input
      id={id}
      name={id}
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    />
  </div>
);

const TextArea = ({ id, label, className = '', ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <textarea
      id={id}
      name={id}
      rows="4"
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    ></textarea>
  </div>
);

const Select = ({ id, label, className = '', children, ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>}
    <select
      id={id}
      name={id}
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    >
      {children}
    </select>
  </div>
);

const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    gray: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
      <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      <div className={`mt-3 p-3 rounded-full ${classes.bg} ${classes.text}`}>
        {icon}
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-100">
    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ErrorMessage = ({ message, onClose }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
    <span className="block sm:inline">{message}</span>
    {onClose && (
      <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">
        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
      </button>
    )}
  </div>
);

const SuccessMessage = ({ message, onClose }) => (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
    <span className="block sm:inline">{message}</span>
    <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">
      <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
    </button>
  </div>
);

const Th = ({ children }) => (
  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
    {children}
  </th>
);

const Td = ({ children, ...props }) => (
  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800" {...props}>
    {children}
  </td>
);

const StatusBadge = ({ status }) => {
  let colorClasses = '';
  switch (status.toLowerCase()) {
    case 'pending':
      colorClasses = 'bg-yellow-100 text-yellow-800';
      break;
    case 'printing':
      colorClasses = 'bg-blue-100 text-blue-800';
      break;
    case 'shipped':
      colorClasses = 'bg-indigo-100 text-indigo-800';
      break;
    case 'delivered':
    case 'earning':
      colorClasses = 'bg-green-100 text-green-800';
      break;
    case 'unaccepted':
    case 'penalty':
      colorClasses = 'bg-red-100 text-red-800';
      break;
    case 'paid':
    case 'payout':
      colorClasses = 'bg-blue-100 text-blue-800';
      break;
    case 'rejected':
      colorClasses = 'bg-slate-100 text-slate-800'; // Neutral gray
      break;
    case 'adjustment':
      colorClasses = 'bg-purple-100 text-purple-800';
      break;
    default:
      colorClasses = 'bg-slate-100 text-slate-800';
  }
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};