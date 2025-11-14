import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import {
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db, ADMIN_EMAIL, getUsersCollectionPath, initialToken } from './firebase.config';
import { LoginPage, SignUpPage } from './components/Auth';
import { 
  Dashboard, 
  PlaceOrderPage, 
  PreviousOrdersPage, 
  ProfilePage, 
  EarningStatementPage, 
  RedeemHistoryPage, 
  ModelsPage 
} from './components/User';
import {
  AdminDashboard,
  AdminOrdersTab,
  AdminUsersPage,
  AdminRedeemTab,
  AdminModelsPage
} from './components/Admin';
import { OrderModal, RedeemModal, AdminUserModal } from './components/Modals';
import { LoadingScreen, ErrorMessage } from './components/UI';
import { 
  Logo, 
  DashboardIcon, 
  BriefcaseIcon, 
  HistoryIcon, 
  CubeIcon, 
  DollarSignIcon, 
  CreditCardIcon, 
  UserIcon, 
  UsersIcon, 
  LogOutIcon 
} from './components/Icons';

// Load JSZip script
if (typeof document !== 'undefined') {
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  script.async = true;
  document.body.appendChild(script);
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [error, setError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [modal, setModal] = useState({ type: null, data: null });
  const [adminOrderFilter, setAdminOrderFilter] = useState({ filterBy: null, value: null });

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
  }, []);

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
    if (page === 'adminOrders' && targetPage !== 'adminOrders') {
      setAdminOrderFilter({ filterBy: null, value: null });
    }
    setPage(targetPage);
  };
  
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
