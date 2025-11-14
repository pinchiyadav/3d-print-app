import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
} from 'firebase/auth';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { auth, db, storage, getUsersCollectionPath, getOrdersCollectionPath, getRedeemRequestsCollectionPath, getManualAdjustmentsCollectionPath, getModelsCollectionPath } from '../firebase.config';
import { LoadingScreen, SuccessMessage, Input, TextArea, Select, StatCard, Th, Td, StatusBadge, ErrorMessage } from './UI';
import { BriefcaseIcon, ClockIcon, CheckCircleIcon, XCircleIcon, XIcon, DownloadIcon, CubeIcon, SearchIcon, DollarSignIcon, CreditCardIcon } from './Icons';

function Dashboard({ navigate, user, photographer, setError }) {
  const [orders, setOrders] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const ordersQuery = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
    const redeemQuery = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
    const adjustmentsQuery = query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching orders: ", error));

    const unsubRedeem = onSnapshot(redeemQuery, (snapshot) => {
      setRedeemRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching redeem requests: ", error));
    
    const unsubAdjustments = onSnapshot(adjustmentsQuery, (snapshot) => {
      setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching adjustments: ", error));


    Promise.all([getDocs(ordersQuery), getDocs(redeemQuery), getDocs(adjustmentsQuery)]).then(() => {
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubRedeem();
      unsubAdjustments();
    };
  }, [photographer?.uid]);

  const stats = useMemo(() => {
    const total = orders.length;
    const progress = orders.filter(o => ['pending', 'printing', 'shipped'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const unaccepted = orders.filter(o => o.status === 'unaccepted').length;
    const rejected = orders.filter(o => o.status === 'rejected').length;
    
    const orderEarnings = (delivered * 300) - (unaccepted * 100);
    const adjustmentEarnings = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const grossEarnings = orderEarnings + adjustmentEarnings;
    
    const totalRedeemed = redeemRequests
      .filter(r => r.status === 'paid' && r.amountPaid)
      .reduce((sum, r) => sum + r.amountPaid, 0);
      
    const redeemableEarnings = grossEarnings - totalRedeemed;
    
    return { total, progress, delivered, unaccepted, rejected, grossEarnings, totalRedeemed, redeemableEarnings };
  }, [orders, redeemRequests, adjustments]);

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (!amount || amount <= 0) {
      setMessage("Please enter a valid amount to redeem.");
      return;
    }
    if (amount > stats.redeemableEarnings) {
      setMessage("You cannot redeem more than your redeemable earnings.");
      return;
    }
    if (!photographer.bankDetails?.accountNumber || !photographer.bankDetails?.ifsc) {
      setMessage('Please update your bank details on your Profile page before redeeming.');
      return;
    }

    setRedeemLoading(true);
    setMessage('');
    try {
      await addDoc(collection(db, getRedeemRequestsCollectionPath()), {
        photographerId: photographer.uid,
        photographerName: photographer.displayName || user.email,
        photographerPId: photographer.photographerId,
        amount: amount, // Use the custom amount
        status: 'pending',
        requestedAt: Timestamp.now(),
      });
      setMessage('Redeem request submitted successfully!');
      setRedeemAmount('');
    } catch (error) {
      console.error("Error submitting redeem request: ", error);
      setMessage('Failed to submit request. Please try again.');
    }
    setRedeemLoading(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Welcome, {user.displayName || user.email}!
      </h1>
      
      {message && <SuccessMessage message={message} onClose={() => setMessage('')} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Total Orders" value={stats.total} icon={<BriefcaseIcon />} color="blue" />
        <StatCard title="Orders in Progress" value={stats.progress} icon={<ClockIcon />} color="yellow" />
        <StatCard title="Successfully Delivered" value={stats.delivered} icon={<CheckCircleIcon />} color="green" />
        <StatCard title="Unaccepted Orders" value={stats.unaccepted} icon={<XCircleIcon />} color="red" />
        <StatCard title="Rejected Orders" value={stats.rejected} icon={<XCircleIcon />} color="gray" />
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Redeemable Earnings</h2>
          <p className="text-4xl font-extrabold text-blue-600 mt-2">
            ₹{stats.redeemableEarnings.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            (Gross: ₹{stats.grossEarnings.toLocaleString('en-IN')}) - (Redeemed: ₹{stats.totalRedeemed.toLocaleString('en-IN')})
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 w-full sm:w-auto">
          <Input 
            id="redeemAmount"
            type="number"
            label="Amount to Redeem"
            placeholder={`Max: ${stats.redeemableEarnings}`}
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            className="sm:w-48"
          />
          <button
            onClick={handleRedeem}
            disabled={redeemLoading || stats.redeemableEarnings <= 0}
            className="mt-2 w-full sm:w-48 px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redeemLoading ? 'Submitting...' : 'Redeem Custom Amount'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * File Upload with Preview Component
 */
function FileUploadWithPreview({ files, setFiles, uploadProgress, maxFiles = 10, title="Upload Photos" }) {
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      const fileObjects = newFiles.map(file => ({
        file: file,
        preview: URL.createObjectURL(file)
      }));
      
      if (maxFiles === 1) {
        setFiles(fileObjects); // Replace existing
      } else {
        if (files.length + newFiles.length > maxFiles) {
          alert(`You can only upload a maximum of ${maxFiles} files.`);
          return;
        }
        setFiles(prevFiles => [...prevFiles, ...fileObjects]);
      }
    }
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Clean up object URLs
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    }
  }, [files]);

  return (
    <div>
      <label htmlFor="photos" className="block text-sm font-medium text-slate-700 mb-1">
        {title} {maxFiles > 1 && `(Max ${maxFiles})`}
      </label>
      <input
        id="photos"
        type="file"
        multiple={maxFiles > 1}
        onChange={handleFileChange}
        accept="image/*"
        disabled={files.length >= maxFiles && maxFiles > 1}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
      />
      {files.length > 0 && (
        <div className={`mt-4 grid gap-2 ${maxFiles === 1 ? 'grid-cols-1 w-48' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'}`}>
          {files.map((f, index) => {
            const progress = uploadProgress[f.file.name];
            return (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 z-10"
                >
                  <XIcon />
                </button>
                {progress != null && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    {progress === 100 ? (
                      <CheckCircleIcon className="text-white h-8 w-8" />
                    ) : (
                      <span className="text-white font-bold text-lg">{progress}%</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Place Order Page Component
 */
function PlaceOrderPage({ navigate, user, photographer }) {
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPincode, setBuyerPincode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]); // Array of {file, preview}
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState({}); // { 'filename.jpg': 75 }
  
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      const fetchedModels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
    };
    fetchModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage('Please upload at least one photo.');
      return;
    }
    if (!selectedModel) {
      setMessage('Please select a 3D model.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setUploadProgress({});
    
    try {
      // 1. Upload Photos with Progress
      const uploadPromises = files.map(f => {
        return new Promise((resolve, reject) => {
          const fileRef = ref(storage, `order_photos/${photographer.uid}/${Date.now()}_${f.file.name}`);
          const uploadTask = uploadBytesResumable(fileRef, f.file);
          
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(prev => ({ ...prev, [f.file.name]: progress }));
            },
            (error) => {
              console.error("Upload Error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      });
      
      const photoUrls = await Promise.all(uploadPromises);
      
      // 2. Generate new Order ID
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      const newOrderId = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User document not found!");
        }
        const newOrderCount = userDoc.data().orderCounter + 1;
        const paddedCount = String(newOrderCount).padStart(3, '0');
        const orderId = `${photographer.photographerId}_${paddedCount}`;
        transaction.update(userDocRef, { orderCounter: newOrderCount });
        return orderId;
      });

      // 3. Create Order Document
      const selectedModelData = models.find(m => m.id === selectedModel);
      await addDoc(collection(db, getOrdersCollectionPath()), {
        orderId: newOrderId,
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        photographerName: photographer.displayName || user.email,
        buyerName,
        buyerPhone,
        buyerAddress,
        buyerPincode,
        modelId: selectedModel,
        modelName: selectedModelData?.modelName || 'Unknown Model',
        remarks,
        photoUrls,
        status: 'pending',
        createdAt: Timestamp.now(),
        adminComments: ""
      });
      
      // 4. Reset form
      setMessage(`Order placed successfully! Your Order ID is: ${newOrderId}`);
      setBuyerName('');
      setBuyerPhone('');
      setBuyerAddress('');
      setBuyerPincode('');
      setRemarks('');
      setFiles([]);
      setSelectedModel('');
      e.target.reset();
      
      setTimeout(() => navigate('previousOrders'), 3000);
    } catch (error) {
      console.error("Error placing order: ", error);
      setMessage(`Failed to place order: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Place a New Order</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="photographerName"
          type="text"
          label="Photographer Name"
          value={`${photographer.displayName} (${photographer.photographerId})`}
          disabled
          className="bg-slate-100"
        />
        <Select
          id="model"
          label="Select 3D Model"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          required
        >
          <option value="" disabled>-- Select a Model --</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
        
        <Input
          id="buyerName"
          type="text"
          label="Buyer's Name"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          required
        />
        <Input
          id="buyerPhone"
          type="tel"
          label="Buyer's Phone Number"
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          required
        />
        <TextArea
          id="buyerAddress"
          label="Buyer's Address"
          value={buyerAddress}
          onChange={(e) => setBuyerAddress(e.target.value)}
          required
        />
        <Input
          id="buyerPincode"
          type="text"
          label="Buyer's Pincode"
          value={buyerPincode}
          onChange={(e) => setBuyerPincode(e.target.value)}
          required
        />
        
        <FileUploadWithPreview 
          files={files} 
          setFiles={setFiles} 
          uploadProgress={uploadProgress} 
        />

        <TextArea
          id="remarks"
          label="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting Order...' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}

/**
 * Previous Orders Page Component
 */
function PreviousOrdersPage({ user, photographer, setModal }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [modelFilter, setModelFilter] = useState('all');
  
  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      setModels(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchModels();

    const q = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [photographer?.uid]);

  useEffect(() => {
    let newFilteredOrders = [...orders];
    if (modelFilter !== 'all') {
      newFilteredOrders = newFilteredOrders.filter(o => o.modelId === modelFilter);
    }
    setFilteredOrders(newFilteredOrders);
  }, [orders, modelFilter]);


  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Your Previous Orders</h1>
        <Select 
          id="modelFilter"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="mt-4 md:mt-0 w-full md:w-64"
        >
          <option value="all">All Models</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-slate-500">You haven't placed any orders yet{modelFilter !== 'all' && ' for this model'}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Order ID</Th>
                <Th>Model</Th>
                <Th>Buyer Name</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Admin Comments</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredOrders.map(order => (
                <tr 
                  key={order.id}
                  onClick={() => setModal({ type: 'order', data: order })}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Td>{order.orderId}</Td>
                  <Td>{order.modelName || 'N/A'}</Td>
                  <Td>{order.buyerName}</Td>
                  <Td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                  <Td>
                    <span className="truncate block w-48">{order.adminComments || '-'}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Photographer Profile Page
 */
function ProfilePage({ user, photographer, setPhotographer, setError }) {
  const [bankDetails, setBankDetails] = useState(photographer.bankDetails || { accountName: '', accountNumber: '', ifsc: '' });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const handleBankSave = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    setBankMessage('');
    setError('');
    
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      await updateDoc(userDocRef, { bankDetails });
      setPhotographer(prev => ({ ...prev, bankDetails }));
      setBankMessage('Bank details updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to update bank details. Please try again.');
    }
    setBankLoading(false);
  };

  const handleBankChange = (e) => {
    const { id, value } = e.target;
    setBankDetails(prev => ({ ...prev, [id]: value }));
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage('');
    setPassError('');
    
    if (newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      setPassLoading(false);
      return;
    }
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Re-auth successful, now update password
      await updatePassword(currentUser, newPassword);
      
      setPassMessage('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      console.error(error);
      setPassError(`Failed to update password: ${error.message}`);
    }
    setPassLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Profile</h1>
        <div className="space-y-4">
          <Input
            id="photographerId"
            label="Photographer ID"
            value={photographer.photographerId}
            disabled
          />
          <Input
            id="displayName"
            label="Full Name"
            value={photographer.displayName}
            disabled
          />
          <Input
            id="email"
            label="Email"
            value={photographer.email}
            disabled
          />
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Bank Details (for Payouts)
        </h2>
        {bankMessage && <SuccessMessage message={bankMessage} onClose={() => setBankMessage('')} />}
        <form onSubmit={handleBankSave} className="space-y-6">
          <Input
            id="accountName"
            label="Bank Account Holder Name"
            value={bankDetails.accountName}
            onChange={handleBankChange}
            required
          />
          <Input
            id="accountNumber"
            label="Bank Account Number"
            value={bankDetails.accountNumber}
            onChange={handleBankChange}
            required
          />
          <Input
            id="ifsc"
            label="IFSC Code"
            value={bankDetails.ifsc}
            onChange={handleBankChange}
            required
          />
          
          <button
            type="submit"
            disabled={bankLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {bankLoading ? 'Saving...' : 'Save Bank Details'}
          </button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Change Password
        </h2>
        {passMessage && <SuccessMessage message={passMessage} onClose={() => setPassMessage('')} />}
        {passError && <ErrorMessage message={passError} onClose={() => setPassError('')} />}
        <form onSubmit={handleChangePassword} className="space-y-6">
          <Input
            id="oldPassword"
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={passLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Photographer Earning Statement Page (FIXED)
 */
function EarningStatementPage({ user, photographer }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const ordersQuery = query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid));
        const redeemQuery = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
        const adjustmentsQuery = query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid));

        const [ordersSnap, redeemSnap, adjustmentsSnap] = await Promise.all([
          getDocs(ordersQuery),
          getDocs(redeemQuery),
          getDocs(adjustmentsQuery)
        ]);

        let combinedLedger = [];

        // 1. Process Orders
        ordersSnap.docs.forEach(doc => {
          const order = doc.data();
          if (order.status === 'delivered') {
            combinedLedger.push({
              id: doc.id,
              date: order.createdAt,
              description: `Earning from Order ${order.orderId}`,
              type: 'Earning',
              amount: 300
            });
          } else if (order.status === 'unaccepted') {
            combinedLedger.push({
              id: doc.id,
              date: order.createdAt,
              description: `Penalty for Order ${order.orderId}`,
              type: 'Penalty',
              amount: -100
            });
          }
        });

        // 2. Process Redeem Requests
        redeemSnap.docs.forEach(doc => {
          const req = doc.data();
          if (req.status === 'paid' && req.amountPaid) {
            combinedLedger.push({
              id: doc.id,
              date: req.processedAt || req.requestedAt,
              description: `Redeem Payout (Ref: ${doc.id.substring(0, 5)})`,
              type: 'Payout',
              amount: -req.amountPaid
            });
          }
        });
        
        // 3. Process Manual Adjustments
        adjustmentsSnap.docs.forEach(doc => {
           const adj = doc.data();
           combinedLedger.push({
             id: doc.id,
             date: adj.createdAt,
             description: `Manual Adjustment: ${adj.remarks}`,
             type: 'Adjustment',
             amount: adj.amount
           });
        });

        // Sort by date
        combinedLedger.sort((a, b) => b.date.seconds - a.date.seconds);
        setLedger(combinedLedger);

      } catch (err) {
        console.error("Error building ledger:", err);
      }
      setLoading(false);
    };

    // Use onSnapshot to rebuild ledger on data change
    const unsubOrders = onSnapshot(query(collection(db, getOrdersCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    const unsubRedeem = onSnapshot(query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    const unsubAdjustments = onSnapshot(query(collection(db, getManualAdjustmentsCollectionPath()), where("photographerId", "==", photographer.uid)), () => fetchData());
    
    fetchData(); // Initial fetch

    return () => {
      unsubOrders();
      unsubRedeem();
      unsubAdjustments();
    };
  }, [photographer?.uid]);

  const summary = useMemo(() => {
    const totalEarnings = ledger.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
    const totalDeductions = ledger.filter(i => i.amount < 0 && i.type !== 'Payout').reduce((sum, i) => sum + i.amount, 0);
    const totalPayouts = ledger.filter(i => i.type === 'Payout').reduce((sum, i) => sum + i.amount, 0);
    const netBalance = totalEarnings + totalDeductions + totalPayouts;
    
    return { totalEarnings, totalDeductions, totalPayouts, netBalance };
  }, [ledger]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Earning Statement</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Gross Earnings" value={`₹${summary.totalEarnings.toLocaleString('en-IN')}`} icon={<DollarSignIcon />} color="green" />
        <StatCard title="Total Deductions" value={`₹${summary.totalDeductions.toLocaleString('en-IN')}`} icon={<XCircleIcon />} color="red" />
        <StatCard title="Total Payouts" value={`₹${summary.totalPayouts.toLocaleString('en-IN')}`} icon={<CreditCardIcon />} color="blue" />
        <StatCard title="Current Balance" value={`₹${summary.netBalance.toLocaleString('en-IN')}`} icon={<BriefcaseIcon />} color="yellow" />
      </div>

      {ledger.length === 0 ? (
        <p className="text-slate-500">No transactions found yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {ledger.map(item => (
                <tr key={item.id}>
                  <Td>{new Date(item.date.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>{item.description}</Td>
                  <Td><StatusBadge status={item.type.toLowerCase()} /></Td>
                  <Td className={item.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {item.amount > 0 ? '+' : ''}₹{item.amount.toLocaleString('en-IN')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/**
 * Photographer Redeem History Page
 */
function RedeemHistoryPage({ user, photographer }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photographer?.uid) return;
    setLoading(true);
    const q = query(collection(db, getRedeemRequestsCollectionPath()), where("photographerId", "==", photographer.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedRequests.sort((a, b) => b.requestedAt.seconds - a.requestedAt.seconds);
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching redeem history: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [photographer?.uid]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Redeem History</h1>
      {requests.length === 0 ? (
        <p className="text-slate-500">You haven't made any redeem requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date Requested</Th>
                <Th>Amount Requested</Th>
                <Th>Status</Th>
                <Th>Amount Paid</Th>
                <Th>Admin Remarks</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {requests.map(req => (
                <tr key={req.id}>
                  <Td>{new Date(req.requestedAt.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>₹{req.amount.toLocaleString('en-IN')}</Td>
                  <Td><StatusBadge status={req.status} /></Td>
                  <Td>{req.amountPaid ? `₹${req.amountPaid.toLocaleString('en-IN')}` : '-'}</Td>
                  <Td>{req.remarks || '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * User Models Page (Grid View)
 */
function ModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getModelsCollectionPath()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedModels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching models: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Our 3D Models</h1>
      {models.length === 0 ? (
        <p className="text-slate-500">No models have been added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {models.map(model => (
            <div key={model.id} className="rounded-xl border border-slate-200 shadow-md overflow-hidden">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {model.imageUrl ? (
                  <img src={model.imageUrl} alt={model.modelName} className="w-full h-full object-cover" />
                ) : (
                  <CubeIcon className="w-24 h-24 text-slate-400" />
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-800">{model.modelName}</h3>
                <p className="text-sm text-slate-600 mt-1">{model.modelDescription || 'No description.'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// Export all user page components
export { Dashboard, PlaceOrderPage, PreviousOrdersPage, ProfilePage, EarningStatementPage, RedeemHistoryPage, ModelsPage, FileUploadWithPreview };