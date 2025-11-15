import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge, Card, colors } from '../components/UI';

export default function OrderDetailsScreen({ route }) {
  const { order } = route.params;

  const openPhotoLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open photo link');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.orderId}>{order.orderId}</Text>
          <StatusBadge status={order.status} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>{order.modelName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {order.createdAt?.toDate
                ? order.createdAt.toDate().toLocaleString()
                : 'N/A'}
            </Text>
          </View>
          {order.remarks && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Remarks:</Text>
              <Text style={styles.value}>{order.remarks}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyer Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color={colors.gray700} />
            <Text style={styles.valueWithIcon}>{order.buyerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={colors.gray700} />
            <Text style={styles.valueWithIcon}>{order.buyerPhone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={colors.gray700} />
            <Text style={styles.valueWithIcon}>
              {order.buyerAddress}, {order.buyerPincode}
            </Text>
          </View>
        </View>

        {order.adminComments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Comments</Text>
            <View style={styles.commentsBox}>
              <Text style={styles.commentsText}>{order.adminComments}</Text>
            </View>
          </View>
        )}

        {order.photoUrls && order.photoUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({order.photoUrls.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoGrid}>
                {order.photoUrls.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.photoContainer}
                    onPress={() => openPhotoLink(url)}
                  >
                    <Image source={{ uri: url }} style={styles.photo} />
                    <View style={styles.photoOverlay}>
                      <Ionicons name="open-outline" size={24} color={colors.white} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.photoHint}>Tap any photo to view in full size</Text>
          </View>
        )}
      </Card>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    width: 100,
  },
  value: {
    fontSize: 14,
    color: colors.gray900,
    flex: 1,
  },
  valueWithIcon: {
    fontSize: 14,
    color: colors.gray900,
    marginLeft: 8,
    flex: 1,
  },
  commentsBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  commentsText: {
    fontSize: 14,
    color: colors.gray900,
  },
  photoGrid: {
    flexDirection: 'row',
  },
  photoContainer: {
    width: 150,
    height: 150,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  photoHint: {
    fontSize: 12,
    color: colors.gray700,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
