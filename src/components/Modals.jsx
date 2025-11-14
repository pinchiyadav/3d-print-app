import React, { useState } from 'react';
import {
  Timestamp,
  updateDoc,
  doc,
  addDoc,
  collection
} from 'firebase/firestore';
import {
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, getOrdersCollectionPath, getRedeemRequestsCollectionPath, getManualAdjustmentsCollectionPath } from '../firebase.config';
import { Modal, InfoGroup, InfoItem, SuccessMessage, ErrorMessage, Input, TextArea, Select } from './UI';
import { DownloadIcon } from './Icons';

function OrderModal({ order, onClose, isAdmin, setError }) {
  const [adminComments, setAdminComments] = useState(order.adminComments || '');
  const [saving, setSaving] = useState(false);
  const [zipState, setZipState] = useState('idle'); // 'idle', 'downloading', 'zipping'
  const [zipProgress, setZipProgress] = useState(0);

  const handleSaveComments = async () => {
    setSaving(true);
    try {
      const orderRef = doc(db, getOrdersCollectionPath(), order.id);
      await updateDoc(orderRef, { adminComments });
    } catch (err) {
      console.error(err);
      setError("Failed to save comments.");
    }
    setSaving(false);
  };
  
  const handleDownloadZip = async () => {
    if (typeof JSZip === 'undefined') {
      setError("File download library (JSZip) is not loaded yet. Please try again in a moment.");
      return;
    }
    
    setZipState('downloading');
    setZipProgress(0);
    setError('');
    
    try {
      const zip = new JSZip();
      
      const downloadPromises = order.photoUrls.map(async (url, index) => {
        let response;
        try {
           // IMPORTANT: This requires CORS to be set up on your Firebase Storage bucket!
           response = await fetch(url);
        } catch (e) {
           console.error("Fetch failed:", e);
           throw new Error(`Failed to fetch images. Please ensure Firebase Storage CORS is configured correctly. ${e.message}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch image ${index + 1} (status: ${response.status}). Check CORS settings.`);
        }
        const blob = await response.blob();
        const filename = url.split('?')[0].split('%2F').pop() || `image_${index + 1}.jpg`;
        zip.file(filename, blob);
      });
      
      await Promise.all(downloadPromises);
      
      setZipState('zipping'); // Move to zipping state
      setZipProgress(0);
      
      zip.generateAsync(
        { type: "blob" },
        (metadata) => { // This is the onUpdate callback for zipping
          setZipProgress(Math.round(metadata.percent));
        }
      ).then((content) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${order.orderId}_photos.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setZipState('idle');
      });
      
    } catch (err) {
      console.error(err);
      setError(`Failed to create zip file: ${err.message}.`);
      setZipState('idle');
    }
  };
  
  let zipButtonText = 'Download All as Zip';
  if (zipState === 'downloading') {
    zipButtonText = 'Downloading files...';
  } else if (zipState === 'zipping') {
    zipButtonText = `Zipping... (${zipProgress}%)`;
  }

  return (
    <Modal onClose={onClose} title={`Order Details: ${order.orderId}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoGroup title="Buyer Details">
          <InfoItem label="Name" value={order.buyerName} />
          <InfoItem label="Phone" value={order.buyerPhone} />
          <InfoItem label="Pincode" value={order.buyerPincode} />
          <InfoItem label="Address" value={order.buyerAddress} />
        </InfoGroup>
        
        <InfoGroup title="Order Info">
          <InfoItem label="Status"><StatusBadge status={order.status} /></InfoItem>
          <InfoItem label="3D Model" value={order.modelName || 'N/A'} />
          <InfoItem label="Photographer" value={`${order.photographerName} (${order.photographerPId})`} />
          <InfoItem label="Date" value={new Date(order.createdAt.seconds * 1000).toLocaleString()} />
          <InfoItem label="User Remarks" value={order.remarks || 'N/A'} />
        </InfoGroup>
      </div>

      <InfoGroup title="Uploaded Photos">
        <div className="flex flex-wrap gap-2 mt-2">
          {order.photoUrls.map((url, index) => (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
              Image {index + 1}
            </a>
          ))}
        </div>
        <button
          onClick={handleDownloadZip}
          disabled={zipState !== 'idle'}
          className="mt-4 flex items-center px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 shadow-sm disabled:opacity-50"
        >
          <DownloadIcon />
          <span className="ml-2">{zipButtonText}</span>
        </button>
      </InfoGroup>

      <InfoGroup title="Admin Comments">
        {isAdmin ? (
          <>
            <TextArea
              id="adminComments"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
            />
            <button
              onClick={handleSaveComments}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Comments'}
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-700 italic">
            {order.adminComments || "No comments from admin yet."}
          </p>
        )}
      </InfoGroup>
    </Modal>
  );
}

/**
 * Redeem Request Modal (Admin)
 */
function RedeemModal({ request, onClose, adminUser, setError }) {
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState(request.amount);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, getUsersCollectionPath(), request.photographerId));
        if (userDoc.exists()) {
          setPhotographer(userDoc.data());
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch photographer details.");
      }
      setLoading(false);
    };
    fetchUser();
  }, [request.photographerId, setError]);

  const handleAction = async (status) => {
    setActionLoading(true);
    setError('');
    
    if (status === 'paid' && (!amountPaid || amountPaid <= 0)) {
      setError("Amount paid must be greater than 0.");
      setActionLoading(false);
      return;
    }
    
    try {
      const requestRef = doc(db, getRedeemRequestsCollectionPath(), request.id);
      await updateDoc(requestRef, {
        status: status,
        remarks: remarks,
        amountPaid: status === 'paid' ? Number(amountPaid) : 0,
        processedAt: Timestamp.now(),
        adminId: adminUser.uid,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(`Failed to ${status} request.`);
    }
    setActionLoading(false);
  };

  return (
    <Modal onClose={onClose} title={`Redeem Request: ${request.photographerPId}`}>
      {loading ? (
        <LoadingScreen />
      ) : (
        <div className="space-y-6">
          <InfoGroup title="Request Details">
            <InfoItem label="Photographer" value={`${request.photographerName} (${request.photographerPId})`} />
            <InfoItem label="Date Requested" value={new Date(request.requestedAt.seconds * 1000).toLocaleString()} />
            <InfoItem label="Amount Requested" value={`₹${request.amount.toLocaleString('en-IN')}`} />
          </InfoGroup>
          
          {photographer?.bankDetails ? (
            <InfoGroup title="Bank Details">
              <InfoItem label="Account Name" value={photographer.bankDetails.accountName} />
              <InfoItem label="Account Number" value={photographer.bankDetails.accountNumber} />
              <InfoItem label="IFSC Code" value={photographer.bankDetails.ifsc} />
            </InfoGroup>
          ) : (
            <ErrorMessage message="No bank details found for this user." onClose={() => {}}/>
          )}

          <div className="space-y-4 pt-4 border-t">
            <Input
              id="amountPaid"
              label="Amount Paid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            <TextArea
              id="remarks"
              label="Remarks (for Paid or Rejected)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleAction('paid')}
                disabled={actionLoading || !photographer?.bankDetails}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark as Paid'}
              </button>
              <button
                onClick={() => handleAction('rejected')}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark as Rejected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Admin User Details Modal
 */
function AdminUserModal({ photographer, onClose, adminUser, setError }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjRemarks, setAdjRemarks] = useState('');
  
  const [userData, setUserData] = useState({
    displayName: photographer.displayName,
    email: photographer.email,
    bankDetails: photographer.bankDetails || { accountName: '', accountNumber: '', ifsc: '' }
  });
  
  const handleUserChange = (e) => {
    const { id, value } = e.target;
    setUserData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleBankChange = (e) => {
    const { id, value } = e.target;
    setUserData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [id]: value
      }
    }));
  };
  
  const handleSaveUserDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), photographer.uid);
      await updateDoc(userDocRef, {
        displayName: userData.displayName,
        email: userData.email, // Note: This only changes Firestore, not Firebase Auth
        bankDetails: userData.bankDetails
      });
      
      if (userData.email !== photographer.email) {
        setMessage('User details saved. Email in Firebase Auth was not changed. User must still log in with old email.');
      } else {
        setMessage('User details saved successfully.');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save user details.");
    }
    setLoading(false);
  };
  
  const handleResetPassword = async () => {
    if (!window.confirm(`Send password reset email to ${photographer.email}?`)) return;
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await sendPasswordResetEmail(auth, photographer.email);
      setMessage('Password reset email sent successfully.');
    } catch (err) {
      console.error(err);
      setError(`Failed to send email: ${err.message}`);
    }
    setLoading(false);
  };


  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(adjAmount);
    if (!amount) {
      setError("Please enter a valid amount (e.g., 50 or -50).");
      return;
    }
    if (!adjRemarks) {
      setError("Remarks are mandatory for all adjustments.");
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await addDoc(collection(db, getManualAdjustmentsCollectionPath()), {
        photographerId: photographer.uid,
        photographerPId: photographer.photographerId,
        amount: amount,
        remarks: adjRemarks,
        createdAt: Timestamp.now(),
        adminId: adminUser.uid,
        adminEmail: adminUser.email
      });
      
      setMessage(`Adjustment of ₹${amount} posted successfully.`);
      setAdjAmount('');
      setAdjRemarks('');
    } catch (err) {
      console.error(err);
      setError("Failed to post adjustment.");
    }
    setLoading(false);
  };
  
  return (
    <Modal onClose={onClose} title={`Edit User: ${photographer.photographerPId}`}>
      <div className="space-y-6">
        {message && <SuccessMessage message={message} onClose={() => setMessage('')} />}
        
        <form onSubmit={handleSaveUserDetails} className="space-y-4">
          <InfoGroup title="Edit User Info">
            <Input 
              id="displayName"
              label="Full Name"
              value={userData.displayName}
              onChange={handleUserChange}
            />
            <Input 
              id="email"
              label="Email (Auth login email won't change)"
              type="email"
              value={userData.email}
              onChange={handleUserChange}
            />
          </InfoGroup>
          
          <InfoGroup title="Edit Bank Details">
            <Input
              id="accountName"
              label="Bank Account Holder Name"
              value={userData.bankDetails.accountName}
              onChange={handleBankChange}
            />
            <Input
              id="accountNumber"
              label="Bank Account Number"
              value={userData.bankDetails.accountNumber}
              onChange={handleBankChange}
            />
            <Input
              id="ifsc"
              label="IFSC Code"
              value={userData.bankDetails.ifsc}
              onChange={handleBankChange}
            />
          </InfoGroup>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save User Details'}
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full py-3 px-4 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Send Password Reset'}
            </button>
          </div>
        </form>
        
        <InfoGroup title="Manual Earnings Adjustment">
          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            <Input 
              id="adjAmount"
              label="Amount (use - for deduction)"
              type="number"
              step="any"
              placeholder="-100"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              required
            />
            <TextArea 
              id="adjRemarks"
              label="Remarks (Mandatory)"
              placeholder="e.g., Bonus for excellent work"
              value={adjRemarks}
              onChange={(e) => setAdjRemarks(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Adjustment'}
            </button>
          </form>
        </InfoGroup>
      </div>
    </Modal>
  );
}

// Export all modal components
export { OrderModal, RedeemModal, AdminUserModal };
