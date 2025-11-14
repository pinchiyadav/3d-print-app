import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { auth, db, getUsersCollectionPath, getCountersCollectionPath } from '../firebase.config';
import { AuthForm, Input } from './UI';

export function LoginPage({ setPage, setError, error }) {
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

export function SignUpPage({ setPage, setError, error, fetchPhotographerData }) {
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
