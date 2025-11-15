import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, ORDERS_PATH, REDEEM_REQUESTS_PATH, MANUAL_ADJUSTMENTS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { EARNING_PER_ORDER, PENALTY_PER_UNACCEPTED } from '@3d-print-app/shared';
import { Card, Loading, EmptyState, colors } from '../components/UI';

export default function EarningsScreen() {
  const { photographer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!photographer?.uid) return;

    const ordersQuery = query(
      collection(db, ORDERS_PATH),
      where('photographerId', '==', photographer.uid)
    );
    const redeemQuery = query(
      collection(db, REDEEM_REQUESTS_PATH),
      where('photographerId', '==', photographer.uid)
    );
    const adjustmentsQuery = query(
      collection(db, MANUAL_ADJUSTMENTS_PATH),
      where('photographerId', '==', photographer.uid)
    );

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

  useEffect(() => {
    // Combine all transactions
    const allTransactions = [];

    // Add orders
    orders.forEach(order => {
      if (order.status === 'delivered') {
        allTransactions.push({
          id: order.id,
          date: order.createdAt,
          description: `Order ${order.orderId} - Delivered`,
          type: 'earning',
          amount: EARNING_PER_ORDER,
        });
      } else if (order.status === 'unaccepted') {
        allTransactions.push({
          id: order.id,
          date: order.createdAt,
          description: `Order ${order.orderId} - Unaccepted (Penalty)`,
          type: 'penalty',
          amount: -PENALTY_PER_UNACCEPTED,
        });
      }
    });

    // Add manual adjustments
    adjustments.forEach(adj => {
      allTransactions.push({
        id: adj.id,
        date: adj.createdAt,
        description: adj.remarks || 'Manual Adjustment',
        type: adj.amount >= 0 ? 'adjustment' : 'deduction',
        amount: adj.amount,
      });
    });

    // Add paid redeem requests
    redeemRequests
      .filter(req => req.status === 'paid' && req.amountPaid)
      .forEach(req => {
        allTransactions.push({
          id: req.id,
          date: req.processedAt || req.requestedAt,
          description: `Payout - ₹${req.amountPaid}`,
          type: 'payout',
          amount: -req.amountPaid,
        });
      });

    // Sort by date (newest first)
    allTransactions.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(0);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(0);
      return dateB - dateA;
    });

    setTransactions(allTransactions);
  }, [orders, redeemRequests, adjustments]);

  // Calculate summary
  const summary = {
    totalEarnings: orders.filter(o => o.status === 'delivered').length * EARNING_PER_ORDER,
    totalPenalties: orders.filter(o => o.status === 'unaccepted').length * PENALTY_PER_UNACCEPTED,
    totalAdjustments: adjustments.reduce((sum, adj) => sum + adj.amount, 0),
    totalPayouts: redeemRequests
      .filter(r => r.status === 'paid' && r.amountPaid)
      .reduce((sum, r) => sum + r.amountPaid, 0),
  };

  summary.grossEarnings = summary.totalEarnings - summary.totalPenalties + summary.totalAdjustments;
  summary.currentBalance = summary.grossEarnings - summary.totalPayouts;

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earning':
        return <Ionicons name="arrow-up-circle" size={24} color={colors.success} />;
      case 'penalty':
      case 'deduction':
        return <Ionicons name="arrow-down-circle" size={24} color={colors.error} />;
      case 'payout':
        return <Ionicons name="cash-outline" size={24} color={colors.warning} />;
      case 'adjustment':
        return <Ionicons name="swap-horizontal" size={24} color={colors.primary} />;
      default:
        return <Ionicons name="ellipse" size={24} color={colors.gray700} />;
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        {getTransactionIcon(item.type)}
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>
          {item.date?.toDate ? item.date.toDate().toLocaleDateString() : 'N/A'}
        </Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        item.amount >= 0 ? styles.positiveAmount : styles.negativeAmount,
      ]}>
        {item.amount >= 0 ? '+' : ''}₹{Math.abs(item.amount)}
      </Text>
    </View>
  );

  if (loading) {
    return <Loading message="Loading earnings..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gross Earnings:</Text>
            <Text style={styles.summaryValue}>₹{summary.totalEarnings}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Penalties:</Text>
            <Text style={[styles.summaryValue, styles.negativeAmount]}>-₹{summary.totalPenalties}</Text>
          </View>
          {summary.totalAdjustments !== 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Adjustments:</Text>
              <Text style={styles.summaryValue}>
                {summary.totalAdjustments >= 0 ? '+' : ''}₹{summary.totalAdjustments}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Payouts:</Text>
            <Text style={[styles.summaryValue, styles.negativeAmount]}>-₹{summary.totalPayouts}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Current Balance:</Text>
            <Text style={styles.totalValue}>₹{summary.currentBalance}</Text>
          </View>
        </Card>
      </View>

      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            message="No transactions yet"
            icon={<Ionicons name="receipt-outline" size={64} color={colors.gray300} />}
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
  summaryContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    backgroundColor: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.gray700,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
  },
  transactionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray900,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.gray700,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
});
