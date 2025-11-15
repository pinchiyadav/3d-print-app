import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, REDEEM_REQUESTS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { Loading, EmptyState, colors } from '../components/UI';

export default function RedeemHistoryScreen() {
  const { photographer } = useAuth();
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!photographer?.uid) return;

    const redeemQuery = query(
      collection(db, REDEEM_REQUESTS_PATH),
      where('photographerId', '==', photographer.uid),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(redeemQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRedeemRequests(requests);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [photographer?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: colors.warning, text: 'Pending', icon: 'time-outline' },
      paid: { color: colors.success, text: 'Paid', icon: 'checkmark-circle-outline' },
      rejected: { color: colors.error, text: 'Rejected', icon: 'close-circle-outline' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={14} color={colors.white} />
        <Text style={styles.badgeText}>{config.text}</Text>
      </View>
    );
  };

  const renderRedeemRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.requestDate}>
          {item.requestedAt?.toDate
            ? item.requestedAt.toDate().toLocaleDateString()
            : 'N/A'}
        </Text>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.amountRow}>
          <Text style={styles.label}>Requested Amount:</Text>
          <Text style={styles.amount}>₹{item.amount}</Text>
        </View>

        {item.status === 'paid' && item.amountPaid > 0 && (
          <View style={styles.amountRow}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={[styles.amount, styles.paidAmount]}>₹{item.amountPaid}</Text>
          </View>
        )}

        {item.status === 'paid' && item.processedAt && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.gray700} />
            <Text style={styles.infoText}>
              Processed: {item.processedAt.toDate().toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksLabel}>Admin Remarks:</Text>
            <Text style={styles.remarksText}>{item.remarks}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <Loading message="Loading redeem history..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={redeemRequests}
        renderItem={renderRedeemRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            message="No redeem requests yet"
            icon={<Ionicons name="wallet-outline" size={64} color={colors.gray300} />}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  requestDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.gray700,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  paidAmount: {
    color: colors.success,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.gray700,
    marginLeft: 6,
  },
  remarksSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 13,
    color: colors.gray900,
  },
});
