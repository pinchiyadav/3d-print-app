import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db, MODELS_PATH } from '../services/firebase';
import { Card, Loading, EmptyState, colors } from '../components/UI';

export default function ModelsScreen() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const snapshot = await getDocs(collection(db, MODELS_PATH));
      const modelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setModels(modelsData);
    } catch (err) {
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadModels();
  };

  const renderModel = ({ item }) => (
    <Card style={styles.modelCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.modelImage} />
      ) : (
        <View style={styles.modelPlaceholder}>
          <Ionicons name="cube-outline" size={80} color={colors.gray300} />
        </View>
      )}
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{item.modelName}</Text>
        {item.modelDescription && (
          <Text style={styles.modelDescription}>{item.modelDescription}</Text>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <Loading message="Loading 3D models..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={models}
        renderItem={renderModel}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <EmptyState
            message="No 3D models available yet"
            icon={<Ionicons name="cube-outline" size={64} color={colors.gray300} />}
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
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  modelCard: {
    width: '48%',
    marginBottom: 16,
  },
  modelImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  modelPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelInfo: {
    gap: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  modelDescription: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
  },
});
