import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, runTransaction } from 'firebase/firestore';
import { auth, db, USERS_PATH } from '../services/firebase';
import { Input, Button, ErrorMessage, colors } from '../components/UI';

export default function SignupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePhotographerId = async () => {
    // Query to find the highest photographer ID
    const usersQuery = query(collection(db, USERS_PATH));
    const snapshot = await getDocs(usersQuery);

    let maxId = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.photographerId) {
        const numericPart = parseInt(data.photographerId.replace('PH', ''), 10);
        if (!isNaN(numericPart) && numericPart > maxId) {
          maxId = numericPart;
        }
      }
    });

    const nextId = maxId + 1;
    return `PH${String(nextId).padStart(3, '0')}`;
  };

  const handleSignup = async () => {
    setError('');

    // Validation
    if (!displayName || !email || !phoneNumber || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (phoneNumber.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Generate photographer ID
      const photographerId = await generatePhotographerId();

      // Create user document in Firestore
      await setDoc(doc(db, USERS_PATH, user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        photographerId,
        phoneNumber,
        orderCounter: 0,
        createdAt: new Date(),
        bankDetails: {
          accountName: '',
          accountNumber: '',
          ifsc: '',
        },
      });

      // Navigation will happen automatically via AuthContext
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up as a photographer</Text>
        </View>

        <View style={styles.form}>
          <ErrorMessage message={error} onDismiss={() => setError('')} />

          <Input
            label="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="John Doe"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="1234567890"
            keyboardType="phone-pad"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
          />

          <Button
            title="Sign Up"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.signupButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray700,
  },
  form: {
    flex: 1,
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.gray700,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
