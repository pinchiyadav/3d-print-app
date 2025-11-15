import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, USERS_PATH } from './firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch photographer data from Firestore
        try {
          const photographerDoc = await getDoc(doc(db, USERS_PATH, firebaseUser.uid));
          if (photographerDoc.exists()) {
            setPhotographer({ uid: firebaseUser.uid, ...photographerDoc.data() });
          } else {
            setPhotographer(null);
          }
        } catch (error) {
          console.error('Error fetching photographer data:', error);
          setPhotographer(null);
        }
      } else {
        setPhotographer(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    photographer,
    setPhotographer, // Allow updating photographer data
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
