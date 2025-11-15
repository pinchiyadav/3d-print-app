import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, getDocs, addDoc, runTransaction, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, MODELS_PATH, ORDERS_PATH, USERS_PATH } from '../services/firebase';
import { useAuth } from '../services/AuthContext';
import { Input, Button, Loading, ErrorMessage, SuccessMessage, colors } from '../components/UI';

export default function PlaceOrderScreen({ navigation }) {
  const { photographer } = useAuth();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPincode, setBuyerPincode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadModels();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library permissions to upload photos.');
    }
  };

  const loadModels = async () => {
    try {
      const snapshot = await getDocs(collection(db, MODELS_PATH));
      const modelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(modelsData);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load 3D models');
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset, index) => ({
          id: Date.now() + index,
          uri: asset.uri,
          name: `photo_${Date.now()}_${index}.jpg`,
        }));

        if (photos.length + newPhotos.length > 10) {
          Alert.alert('Limit Exceeded', 'You can upload a maximum of 10 photos');
          return;
        }

        setPhotos([...photos, ...newPhotos]);
      }
    } catch (err) {
      console.error('Error picking images:', err);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removePhoto = (photoId) => {
    setPhotos(photos.filter(p => p.id !== photoId));
  };

  const uploadPhoto = async (photo, orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(photo.uri);
        const blob = await response.blob();

        const storageRef = ref(storage, `orders/${orderId}/${photo.name}`);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(prev => ({ ...prev, [photo.id]: progress }));
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!selectedModel) {
      const errorMsg = 'Please select a 3D model';
      setError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (!buyerName || !buyerPhone || !buyerAddress || !buyerPincode) {
      const errorMsg = 'Please fill in all buyer details';
      setError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (buyerPhone.length < 10) {
      const errorMsg = 'Phone number must be at least 10 digits';
      setError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (photos.length === 0) {
      Alert.alert('No Photos', 'Are you sure you want to place an order without photos?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => submitOrder() },
      ]);
      return;
    }

    await submitOrder();
  };

  const submitOrder = async () => {
    console.log('submitOrder started');
    setSubmitting(true);

    try {
      console.log('Generating order ID...');
      // Generate order ID using transaction
      const orderId = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, USERS_PATH, photographer.uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentCounter = userData.orderCounter || 0;
        const newCounter = currentCounter + 1;

        const generatedOrderId = `${photographer.photographerId}_${String(newCounter).padStart(3, '0')}`;

        // Update counter
        transaction.update(userRef, { orderCounter: newCounter });

        return generatedOrderId;
      });

      // Upload photos
      const photoUrls = [];
      for (const photo of photos) {
        const url = await uploadPhoto(photo, orderId);
        photoUrls.push(url);
      }

      // Get selected model details
      const model = models.find(m => m.id === selectedModel);

      // Create order document
      await addDoc(collection(db, ORDERS_PATH), {
        orderId,
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        photographerName: photographer.displayName,
        buyerName,
        buyerPhone,
        buyerAddress,
        buyerPincode,
        modelId: selectedModel,
        modelName: model?.modelName || '',
        remarks,
        photoUrls,
        status: 'pending',
        adminComments: '',
        createdAt: new Date(),
      });

      setSuccess(`Order ${orderId} placed successfully!`);

      // Reset form
      setTimeout(() => {
        setSelectedModel('');
        setBuyerName('');
        setBuyerPhone('');
        setBuyerAddress('');
        setBuyerPincode('');
        setRemarks('');
        setPhotos([]);
        setUploadProgress({});
        navigation.navigate('Dashboard');
      }, 2000);
    } catch (err) {
      console.error('Order submission error:', err);
      const errorMsg = err.message || 'Failed to place order. Please try again.';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Loading models..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ErrorMessage message={error} onDismiss={() => setError('')} />
      <SuccessMessage message={success} onDismiss={() => setSuccess('')} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photographer Details</Text>
        <Input label="Name" value={photographer?.displayName || ''} editable={false} />
        <Input label="Photographer ID" value={photographer?.photographerId || ''} editable={false} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select 3D Model</Text>
        <View style={styles.modelGrid}>
          {models.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelCard,
                selectedModel === model.id && styles.modelCardSelected,
              ]}
              onPress={() => setSelectedModel(model.id)}
            >
              {model.imageUrl ? (
                <Image source={{ uri: model.imageUrl }} style={styles.modelImage} />
              ) : (
                <View style={styles.modelPlaceholder}>
                  <Ionicons name="cube-outline" size={40} color={colors.gray300} />
                </View>
              )}
              <Text style={styles.modelName}>{model.modelName}</Text>
              {selectedModel === model.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary}
                  style={styles.selectedIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buyer Details</Text>
        <Input
          label="Buyer Name"
          value={buyerName}
          onChangeText={setBuyerName}
          placeholder="Enter buyer name"
        />
        <Input
          label="Buyer Phone"
          value={buyerPhone}
          onChangeText={setBuyerPhone}
          placeholder="1234567890"
          keyboardType="phone-pad"
        />
        <Input
          label="Buyer Address"
          value={buyerAddress}
          onChangeText={setBuyerAddress}
          placeholder="Enter complete address"
          multiline
          numberOfLines={3}
        />
        <Input
          label="Pincode"
          value={buyerPincode}
          onChangeText={setBuyerPincode}
          placeholder="123456"
          keyboardType="numeric"
        />
        <Input
          label="Remarks (Optional)"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Any special instructions"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Photos (Max 10)</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
          <Ionicons name="camera" size={24} color={colors.primary} />
          <Text style={styles.uploadButtonText}>Select Photos</Text>
        </TouchableOpacity>

        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
              {uploadProgress[photo.id] !== undefined && uploadProgress[photo.id] < 100 && (
                <View style={styles.progressOverlay}>
                  <Text style={styles.progressText}>{uploadProgress[photo.id]}%</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <Button
        title="Place Order"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 12,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  modelCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    margin: '1%',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelCardSelected: {
    borderColor: colors.primary,
  },
  modelImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  modelPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    textAlign: 'center',
  },
  selectedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    marginBottom: 32,
  },
});
