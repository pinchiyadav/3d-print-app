import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db, ORDERS_PATH, REDEEM_REQUESTS_PATH, MANUAL_ADJUSTMENTS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { calculateEarningsSummary } from '@3d-print-app/shared';
import { StatCard, Button, Loading, ErrorMessage, SuccessMessage, colors, Card } from '../components/UI';

export default function DashboardScreen({ navigation }) {
  const { photographer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photographer?.uid) return;

    const ordersQuery = query(collection(db, ORDERS_PATH), where('photographerId', '==', photographer.uid));
    const redeemQuery = query(collection(db, REDEEM_REQUESTS_PATH), where('photographerId', '==', photographer.uid));
    const adjustmentsQuery = query(collection(db, MANUAL_ADJUSTMENTS_PATH), where('photographerId', '==', photographer.uid));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      setRefreshing(false);
    });

    const unsubRedeem = onSnapshot(redeemQuery, (snapshot) => {
      setRedeemRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAdjustments = onSnapshot(adjustmentsQuery, (snapshot) => {
      setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubRedeem();
      unsubAdjustments();
    };
  }, [photographer?.uid]);

  const stats = calculateEarningsSummary(orders, adjustments, redeemRequests);

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount to redeem');
      return;
    }

    if (amount > stats.redeemableEarnings) {
      setError('You cannot redeem more than your redeemable earnings');
      return;
    }

    if (!photographer.bankDetails?.accountNumber || !photographer.bankDetails?.ifsc) {
      Alert.alert(
        'Bank Details Required',
        'Please add your bank details in the Profile section before requesting a redeem.',
        [{ text: 'OK' }]
      );
      return;
    }

    setRedeemLoading(true);
    setError('');
    setMessage('');

    try {
      await addDoc(collection(db, REDEEM_REQUESTS_PATH), {
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        photographerName: photographer.displayName,
        amount,
        status: 'pending',
        amountPaid: 0,
        remarks: '',
        requestedAt: new Date(),
      });

      setMessage('Redeem request submitted successfully!');
      setRedeemAmount('');
    } catch (err) {
      console.error('Redeem error:', err);
      setError('Failed to submit redeem request. Please try again.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listeners will automatically refresh the data
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {photographer?.displayName || 'Photographer'}!</Text>
        <Text style={styles.photographerId}>ID: {photographer?.photographerId || 'N/A'}</Text>
      </View>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      <SuccessMessage message={message} onDismiss={() => setMessage('')} />

      {/* Earnings Card */}
      <Card style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Ionicons name="wallet" size={24} color={colors.success} />
          <Text style={styles.earningsTitle}>Redeemable Earnings</Text>
        </View>
        <Text style={styles.earningsAmount}>₹{stats.redeemableEarnings.toFixed(2)}</Text>
        <Text style={styles.earningsSubtext}>
          Gross: ₹{stats.grossEarnings} | Redeemed: ₹{stats.totalRedeemed}
        </Text>

        <View style={styles.redeemSection}>
          <TextInput
            style={styles.redeemInput}
            value={redeemAmount}
            onChangeText={setRedeemAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor={colors.gray300}
          />
          <Button
            title="Redeem"
            onPress={handleRedeem}
            loading={redeemLoading}
            disabled={redeemLoading}
            style={styles.redeemButton}
          />
        </View>
      </Card>

      {/* Order Statistics */}
      <Text style={styles.sectionTitle}>Order Statistics</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Orders"
          value={stats.total}
          color={colors.primary}
          icon={<Ionicons name="briefcase" size={18} color={colors.primary} />}
        />
        <StatCard
          title="In Progress"
          value={stats.progress}
          color={colors.warning}
          icon={<Ionicons name="time" size={18} color={colors.warning} />}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Delivered"
          value={stats.delivered}
          color={colors.success}
          icon={<Ionicons name="checkmark-circle" size={18} color={colors.success} />}
        />
        <StatCard
          title="Unaccepted"
          value={stats.unaccepted}
          color={colors.error}
          icon={<Ionicons name="close-circle" size={18} color={colors.error} />}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Rejected"
          value={stats.rejected}
          color={colors.gray700}
          icon={<Ionicons name="ban" size={18} color={colors.gray700} />}
        />
        <View style={{ flex: 1, marginHorizontal: 4 }} />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('PlaceOrder')}
      >
        <Ionicons name="add-circle" size={24} color={colors.primary} />
        <Text style={styles.actionButtonText}>Place New Order</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.gray300} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('RedeemHistory')}
      >
        <Ionicons name="receipt" size={24} color={colors.primary} />
        <Text style={styles.actionButtonText}>View Redeem History</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.gray300} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Models')}
      >
        <Ionicons name="cube" size={24} color={colors.primary} />
        <Text style={styles.actionButtonText}>View 3D Models</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.gray300} />
      </TouchableOpacity>
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
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  photographerId: {
    fontSize: 14,
    color: colors.gray700,
    marginTop: 4,
  },
  earningsCard: {
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginLeft: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 12,
    color: colors.gray700,
    marginBottom: 16,
  },
  redeemSection: {
    flexDirection: 'row',
    gap: 8,
  },
  redeemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  redeemButton: {
    flex: 0.4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray900,
    marginLeft: 12,
  },
});
