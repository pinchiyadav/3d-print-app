import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, USERS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { Input, Button, Card, ErrorMessage, SuccessMessage, colors } from '../components/UI';

export default function ProfileScreen() {
  const { photographer, setPhotographer } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(photographer?.phoneNumber || '');
  const [accountName, setAccountName] = useState(photographer?.bankDetails?.accountName || '');
  const [accountNumber, setAccountNumber] = useState(photographer?.bankDetails?.accountNumber || '');
  const [ifsc, setIfsc] = useState(photographer?.bankDetails?.ifsc || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');

    if (phoneNumber.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, USERS_PATH, photographer.uid);
      await updateDoc(userRef, {
        phoneNumber,
        bankDetails: {
          accountName,
          accountNumber,
          ifsc,
        },
      });

      // Update local state
      setPhotographer({
        ...photographer,
        phoneNumber,
        bankDetails: { accountName, accountNumber, ifsc },
      });

      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ErrorMessage message={error} onDismiss={() => setError('')} />
      <SuccessMessage message={success} onDismiss={() => setSuccess('')} />

      <Card>
        <Text style={styles.cardTitle}>Photographer Information</Text>
        <Input
          label="Photographer ID"
          value={photographer?.photographerId || ''}
          editable={false}
        />
        <Input
          label="Name"
          value={photographer?.displayName || ''}
          editable={false}
        />
        <Input
          label="Email"
          value={photographer?.email || ''}
          editable={false}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Contact Information</Text>
        <Input
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="1234567890"
          keyboardType="phone-pad"
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Bank Details</Text>
        <Text style={styles.cardSubtitle}>
          Required for receiving payouts
        </Text>
        <Input
          label="Account Holder Name"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="John Doe"
        />
        <Input
          label="Account Number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="1234567890"
          keyboardType="numeric"
        />
        <Input
          label="IFSC Code"
          value={ifsc}
          onChangeText={setIfsc}
          placeholder="ABCD0123456"
          autoCapitalize="characters"
        />
      </Card>

      <Button
        title="Save Profile"
        onPress={handleUpdateProfile}
        loading={loading}
        disabled={loading}
        style={styles.saveButton}
      />

      <Card>
        <Text style={styles.cardTitle}>Change Password</Text>
        <Input
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          secureTextEntry
        />
        <Input
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />
        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry
        />
        <Button
          title="Change Password"
          onPress={handleChangePassword}
          loading={passwordLoading}
          disabled={passwordLoading}
        />
      </Card>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.gray700,
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});
