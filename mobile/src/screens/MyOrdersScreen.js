import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, ORDERS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { StatusBadge, EmptyState, Loading, colors } from '../components/UI';

export default function MyOrdersScreen({ navigation }) {
  const { photographer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!photographer?.uid) return;

    const ordersQuery = query(
      collection(db, ORDERS_PATH),
      where('photographerId', '==', photographer.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersData);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [photographer?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { order: item })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.orderId}</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="cube-outline" size={16} color={colors.gray700} />
          <Text style={styles.infoText}>{item.modelName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={colors.gray700} />
          <Text style={styles.infoText}>{item.buyerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.gray700} />
          <Text style={styles.infoText}>
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </View>

      {item.adminComments && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsLabel}>Admin Comments:</Text>
          <Text style={styles.commentsText} numberOfLines={2}>
            {item.adminComments}
          </Text>
        </View>
      )}

      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            message="No orders yet. Place your first order!"
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
  listContent: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
  },
  commentsSection: {
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 14,
    color: colors.gray900,
  },
  viewDetails: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
});
