import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email address.');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('Password reset email sent! Check your inbox.');
      setResetEmail('');
    } catch (error) {
      setResetMessage(`Error: ${error.message}`);
    }
    setResetLoading(false);
  };

  if (showForgotPassword) {
    return (
      <AuthForm
        title="Reset Password"
        subtitle="Enter your email to receive a reset link"
        onSubmit={handleForgotPassword}
        loading={resetLoading}
        error=""
        submitText="Send Reset Email"
        footer={
          <p className="text-sm text-slate-600">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetMessage('');
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Login
            </button>
          </p>
        }
      >
        {resetMessage && (
          <div className={`p-3 rounded-lg text-sm ${resetMessage.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {resetMessage}
          </div>
        )}
        <Input
          id="resetEmail"
          type="email"
          label="Email Address"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          required
        />
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title="Welcome Back!"
      subtitle="Photographer Login"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      submitText="Login"
      footer={
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot Password?
            </button>
          </p>
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
        </div>
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
  const [phoneNumber, setPhoneNumber] = useState('');
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
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number (minimum 10 digits).");
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
        phoneNumber: phoneNumber,
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
        id="phoneNumber"
        type="tel"
        label="Phone Number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
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
