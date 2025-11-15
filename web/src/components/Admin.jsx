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
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, storage, auth, ADMIN_EMAIL, getUsersCollectionPath, getOrdersCollectionPath, getRedeemRequestsCollectionPath, getManualAdjustmentsCollectionPath, getModelsCollectionPath } from '../firebase.config';
import { LoadingScreen, SuccessMessage, ErrorMessage, Input, TextArea, Select, StatCard, Th, Td, StatusBadge, AdminNavItem } from './UI';
import { BriefcaseIcon, ClockIcon, CheckCircleIcon, XCircleIcon, DollarSignIcon, UsersIcon, SearchIcon, CubeIcon, TrashIcon, XIcon, CreditCardIcon } from './Icons';
import { FileUploadWithPreview } from './User';

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    delivered: 0,
    unaccepted: 0,
    rejected: 0,
    inProgress: 0,
    redeemPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, getUsersCollectionPath()));
        const ordersSnap = await getDocs(collection(db, getOrdersCollectionPath()));
        const redeemSnap = await getDocs(query(collection(db, getRedeemRequestsCollectionPath()), where("status", "==", "pending")));

        const orders = ordersSnap.docs.map(d => d.data());
        
        setStats({
          users: usersSnap.size - 1, // -1 for admin
          orders: orders.length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          unaccepted: orders.filter(o => o.status === 'unaccepted').length,
          rejected: orders.filter(o => o.status === 'rejected').length,
          inProgress: orders.filter(o => ['pending', 'printing', 'shipped'].includes(o.status)).length,
          redeemPending: redeemSnap.size,
        });
      } catch (err) {
        console.error("Error fetching admin stats:", err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Photographers" value={stats.users} icon={<UsersIcon />} color="blue" />
        <StatCard title="Total Orders" value={stats.orders} icon={<BriefcaseIcon />} color="blue" />
        <StatCard title="Orders in Progress" value={stats.inProgress} icon={<ClockIcon />} color="yellow" />
        <StatCard title="Orders Delivered" value={stats.delivered} icon={<CheckCircleIcon />} color="green" />
        <StatCard title="Orders Unaccepted" value={stats.unaccepted} icon={<XCircleIcon />} color="red" />
        <StatCard title="Orders Rejected" value={stats.rejected} icon={<XCircleIcon />} color="gray" />
        <StatCard title="Pending Redeems" value={stats.redeemPending} icon={<CreditCardIcon />} color="yellow" />
      </div>
    </div>
  );
}

/**
 * Admin Page Component - All Orders
 */
function AdminOrdersTab({ setModal, adminOrderFilter, setAdminOrderFilter, adminFilterOrdersByUser }) {
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [models, setModels] = useState([]);
  const [modelFilter, setModelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  
  const [photographerName, setPhotographerName] = useState('');


  useEffect(() => {
    setLoading(true);
    
    const fetchModels = async () => {
      const q = query(collection(db, getModelsCollectionPath()));
      const querySnapshot = await getDocs(q);
      setModels(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchModels();
    
    const q = query(collection(db, getOrdersCollectionPath()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setAllOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all orders: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let orders = [...allOrders];
    
    // Global filter from Users page
    if (adminOrderFilter.filterBy === 'photographerPId' && adminOrderFilter.value) {
      orders = orders.filter(o => o.photographerPId === adminOrderFilter.value);
      // Fetch and display the photographer's name
      const user = orders.length > 0 ? orders[0].photographerName : adminOrderFilter.value;
      setPhotographerName(user);
    } else {
      setPhotographerName('');
    }

    // Local Status Filter
    if (statusFilter !== 'all') {
      orders = orders.filter(o => o.status === statusFilter);
    }
    
    // Local Model Filter
    if (modelFilter !== 'all') {
      orders = orders.filter(o => o.modelId === modelFilter);
    }

    // Local Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      orders = orders.filter(o => 
        o.photographerPId?.toLowerCase().includes(lowerSearch) ||
        o.buyerName?.toLowerCase().includes(lowerSearch) ||
        o.buyerPhone?.toLowerCase().includes(lowerSearch) ||
        o.orderId?.toLowerCase().includes(lowerSearch)
      );
    }
    
    setFilteredOrders(orders);
    setCurrentPage(1); // Reset to first page on filter change
  }, [allOrders, searchTerm, statusFilter, modelFilter, adminOrderFilter]);

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, getOrdersCollectionPath(), orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">All Customer Orders</h1>
        {adminOrderFilter.value && (
          <div className="text-right">
            <p className="text-sm text-slate-500">Showing orders for:</p>
            <span className="text-lg font-semibold text-blue-600">{photographerName} ({adminOrderFilter.value})</span>
            <button
              onClick={() => setAdminOrderFilter({ filterBy: null, value: null })}
              className="ml-2 text-sm text-red-500 hover:underline"
            >
              (Clear)
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative md:col-span-1">
          <Input
            id="search"
            type="text"
            placeholder="Search by UserID, Buyer Name, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="printing">Printing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="unaccepted">Unaccepted</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
          <option value="all">All Models</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.modelName}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Order ID</Th>
              <Th>UserID</Th>
              <Th>Model</Th>
              <Th>Buyer Name</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Admin Comments</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentOrders.map(order => (
              <tr 
                key={order.id}
                onClick={() => setModal({ type: 'order', data: order })}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Td>{order.orderId}</Td>
                <Td>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      adminFilterOrdersByUser(order.photographerPId);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {order.photographerPId}
                  </button>
                </Td>
                <Td>{order.modelName || 'N/A'}</Td>
                <Td>{order.buyerName}</Td>
                <Td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="printing">Printing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered (Success)</option>
                    <option value="unaccepted">Unaccepted (Failed)</option>
                    <option value="rejected">Rejected (No Penalty)</option>
                  </Select>
                </Td>
                <Td>
                  <span className="truncate block w-48">{order.adminComments || '-'}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-slate-600">
            Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Admin Page Component - All Users
 */
function AdminUsersPage({ setModal, adminFilterOrdersByUser }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latestOrder');
  const [userStats, setUserStats] = useState({});

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getUsersCollectionPath()), where("email", "!=", ADMIN_EMAIL));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id, // This is the UID
        ...doc.data()
      }));
      setUsers(fetchedUsers);
      
      // Fetch stats for all users
      const stats = {};
      const ordersSnap = await getDocs(collection(db, getOrdersCollectionPath()));
      const adjustmentsSnap = await getDocs(collection(db, getManualAdjustmentsCollectionPath()));
      const redeemSnap = await getDocs(collection(db, getRedeemRequestsCollectionPath()));
      
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const adjustments = adjustmentsSnap.docs.map(d => d.data());
      const redeems = redeemSnap.docs.map(d => d.data());
      
      fetchedUsers.forEach(user => {
        const userOrders = orders.filter(o => o.photographerId === user.id);
        const delivered = userOrders.filter(o => o.status === 'delivered').length;
        const unaccepted = userOrders.filter(o => o.status === 'unaccepted').length;
        
        const orderEarnings = (delivered * 300) - (unaccepted * 100);
        const adjustmentEarnings = adjustments
          .filter(a => a.photographerId === user.id)
          .reduce((sum, adj) => sum + adj.amount, 0);
        const totalRedeemed = redeems
          .filter(r => r.photographerId === user.id && r.status === 'paid' && r.amountPaid)
          .reduce((sum, r) => sum + r.amountPaid, 0);
        
        const currentEarnings = orderEarnings + adjustmentEarnings - totalRedeemed;
        
        // Get latest order date
        const latestOrder = userOrders.length > 0 
          ? Math.max(...userOrders.map(o => o.createdAt.seconds))
          : 0;
        
        stats[user.id] = {
          totalOrders: userOrders.length,
          currentEarnings: currentEarnings,
          latestOrderDate: latestOrder
        };
      });
      
      setUserStats(stats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    let activeUsers = [...users];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      activeUsers = activeUsers.filter(u =>
        u.displayName?.toLowerCase().includes(lowerSearch) ||
        u.photographerId?.toLowerCase().includes(lowerSearch) ||
        u.email?.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Apply sorting
    activeUsers.sort((a, b) => {
      const statsA = userStats[a.id] || { totalOrders: 0, currentEarnings: 0, latestOrderDate: 0 };
      const statsB = userStats[b.id] || { totalOrders: 0, currentEarnings: 0, latestOrderDate: 0 };
      
      switch (sortBy) {
        case 'highestEarnings':
          return statsB.currentEarnings - statsA.currentEarnings;
        case 'highestOrders':
          return statsB.totalOrders - statsA.totalOrders;
        case 'latestOrder':
        default:
          return statsB.latestOrderDate - statsA.latestOrderDate;
      }
    });
    
    setFilteredUsers(activeUsers);
  }, [users, searchTerm, sortBy, userStats]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Users</h1>
        <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
          <div className="relative">
            <Input
              id="userSearch"
              type="text"
              placeholder="Search by UserID, Name, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-48">
            <option value="latestOrder">Sort: Latest Order</option>
            <option value="highestEarnings">Sort: Highest Earnings</option>
            <option value="highestOrders">Sort: Most Orders</option>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>UserID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Total Orders</Th>
              <Th>Current Earnings</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredUsers.map(user => {
              const stats = userStats[user.id] || { totalOrders: 0, currentEarnings: 0 };
              return (
                <tr key={user.id}>
                  <Td>
                    <button 
                      onClick={() => adminFilterOrdersByUser(user.photographerId)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {user.photographerId}
                    </button>
                  </Td>
                  <Td>{user.displayName}</Td>
                  <Td>{user.email}</Td>
                  <Td>{stats.totalOrders}</Td>
                  <Td className={stats.currentEarnings >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ₹{stats.currentEarnings.toLocaleString('en-IN')}
                  </Td>
                  <Td>{new Date(user.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                  <Td>
                    <button
                      onClick={() => setModal({ type: 'adminUser', data: user })}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Adjust
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/**
 * Admin Page Component - Redeem Requests
 */
function AdminRedeemTab({ setModal }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(20);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getRedeemRequestsCollectionPath()), where("status", "==", filter));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedRequests.sort((a, b) => a.requestedAt.seconds - b.requestedAt.seconds);
      setRequests(fetchedRequests);
      setCurrentPage(1);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching redeem requests: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);
  
  const stats = useMemo(() => {
    return {
      total: requests.length,
    }
  }, [requests]);

  // Pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(requests.length / requestsPerPage);

  if (loading) return <LoadingScreen />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Redeem Requests</h1>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b">
          <AdminNavItem title="Pending" active={filter==='pending'} onClick={() => setFilter('pending')} />
          <AdminNavItem title="Paid" active={filter==='paid'} onClick={() => setFilter('paid')} />
          <AdminNavItem title="Rejected" active={filter==='rejected'} onClick={() => setFilter('rejected')} />
        </div>
        <div className="text-right">
          <h4 className="text-sm font-medium text-slate-500">{filter.toUpperCase()} REQUESTS</h4>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="text-slate-500">No {filter} redeem requests.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Photographer</Th>
                  <Th>UserID</Th>
                  <Th>Date Requested</Th>
                  <Th>Amount</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {currentRequests.map(req => (
                  <tr key={req.id}>
                    <Td>{req.photographerName}</Td>
                    <Td>{req.photographerPId}</Td>
                    <Td>{new Date(req.requestedAt.seconds * 1000).toLocaleString()}</Td>
                    <Td>₹{req.amount.toLocaleString('en-IN')}</Td>
                    <Td>
                      <button
                        onClick={() => setModal({ type: 'redeem', data: req })}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 shadow-sm"
                      >
                        View Request
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-slate-600">
                Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, requests.length)} of {requests.length} requests
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Admin Page Component - Manage Models
 */
function AdminModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [files, setFiles] = useState([]); // From FileUploadWithPreview
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getModelsCollectionPath()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedModels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(fetchedModels);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to fetch models.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleAddModel = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setUploadProgress({});
    
    let imageUrl = '';
    
    try {
      // 1. Upload Image if it exists
      if (files.length > 0) {
        const file = files[0].file;
        const fileRef = ref(storage, `model_images/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        
        imageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress({ [file.name]: progress });
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
      }
      
      // 2. Add Model to Firestore
      await addDoc(collection(db, getModelsCollectionPath()), {
        modelName,
        modelDescription,
        imageUrl: imageUrl,
        createdAt: Timestamp.now()
      });
      
      // 3. Reset form
      setModelName('');
      setModelDescription('');
      setFiles([]);
      setUploadProgress({});
      
    } catch (err) {
      console.error("Error adding model:", err);
      setError(`Failed to add model: ${err.message}`);
    }
    setFormLoading(false);
  };
  
  const handleDeleteModel = async (model) => {
    if (!window.confirm(`Are you sure you want to delete the model "${model.modelName}"? This cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Delete image from Storage (if it exists)
      if (model.imageUrl) {
        try {
          const imageRef = ref(storage, model.imageUrl);
          await deleteObject(imageRef);
        } catch (storageError) {
          // Log error but continue deleting doc
          console.warn("Could not delete image from storage:", storageError.message);
        }
      }
      
      // 2. Delete model doc from Firestore
      await deleteDoc(doc(db, getModelsCollectionPath(), model.id));
      
    } catch (err) {
      console.error("Error deleting model:", err);
      setError(`Failed to delete model: ${err.message}`);
    }
    setLoading(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Manage 3D Models</h1>
        {models.length === 0 ? (
          <p className="text-slate-500">No models added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Image</Th>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {models.map(model => (
                  <tr key={model.id}>
                    <Td>
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                        {model.imageUrl ? (
                          <img src={model.imageUrl} alt={model.modelName} className="w-full h-full object-cover" />
                        ) : (
                          <CubeIcon className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                    </Td>
                    <Td>{model.modelName}</Td>
                    <Td><span className="truncate block w-64">{model.modelDescription || '-'}</span></Td>
                    <Td>
                      <button
                        onClick={() => handleDeleteModel(model)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="lg:col-span-1 bg-white p-8 rounded-xl shadow-lg h-fit">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Add New Model</h2>
        {error && <ErrorMessage message={error} onClose={() => setError('')} />}
        <form onSubmit={handleAddModel} className="space-y-6">
          <Input 
            id="modelName"
            label="Model Name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
          <TextArea 
            id="modelDescription"
            label="Model Description (optional)"
            value={modelDescription}
            onChange={(e) => setModelDescription(e.target.value)}
          />
          <FileUploadWithPreview
            title="Upload Image (optional)"
            files={files}
            setFiles={setFiles}
            uploadProgress={uploadProgress}
            maxFiles={1}
          />
          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {formLoading ? 'Adding Model...' : 'Add Model'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Admin Page Component - Manage Single User
 */
function AdminManageUserPage({ setError }) {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [userData, setUserData] = useState(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjRemarks, setAdjRemarks] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Fetch all users
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, getUsersCollectionPath()), where("email", "!=", ADMIN_EMAIL));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedUsers.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setAllUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter users based on search
  useEffect(() => {
    let filtered = [...allUsers];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName?.toLowerCase().includes(lowerSearch) ||
        u.photographerId?.toLowerCase().includes(lowerSearch) ||
        u.email?.toLowerCase().includes(lowerSearch) ||
        u.phoneNumber?.includes(searchTerm)
      );
    }
    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page on search
  }, [allUsers, searchTerm]);

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleSelectUser = (selectedUser) => {
    setUser(selectedUser);
    setUserData({
      displayName: selectedUser.displayName,
      email: selectedUser.email,
      phoneNumber: selectedUser.phoneNumber || '',
      bankDetails: selectedUser.bankDetails || { accountName: '', accountNumber: '', ifsc: '' }
    });
    setMessage('');
    setPasswordError('');
    setNewPassword('');
    setConfirmPassword('');
    setAdjAmount('');
    setAdjRemarks('');
  };

  const handleBackToList = () => {
    setUser(null);
    setUserData(null);
    setMessage('');
    setPasswordError('');
  };

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
    setActionLoading(true);
    setError('');
    setMessage('');
    
    try {
      const userDocRef = doc(db, getUsersCollectionPath(), user.id);
      await updateDoc(userDocRef, {
        displayName: userData.displayName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        bankDetails: userData.bankDetails
      });
      
      setMessage('User details saved successfully.');
      setUser(prev => ({
        ...prev,
        displayName: userData.displayName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        bankDetails: userData.bankDetails
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to save user details.");
    }
    setActionLoading(false);
  };
  
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setMessage('');
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to change the password for ${user.photographerId}?`)) {
      return;
    }
    
    setActionLoading(true);
    
    try {
      const response = await fetch('https://us-central1-model-3d-print.cloudfunctions.net/setUserPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.id,
          newPassword: newPassword,
          adminToken: await auth.currentUser.getIdToken()
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(result.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError(`Failed to update password: ${err.message}`);
    }
    setActionLoading(false);
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
    
    setActionLoading(true);
    setError('');
    setMessage('');
    
    try {
      await addDoc(collection(db, getManualAdjustmentsCollectionPath()), {
        photographerId: user.id,
        photographerPId: user.photographerId,
        amount: amount,
        remarks: adjRemarks,
        createdAt: Timestamp.now(),
        adminId: auth.currentUser.uid,
        adminEmail: auth.currentUser.email
      });
      
      setMessage(`Adjustment of ₹${amount} posted successfully.`);
      setAdjAmount('');
      setAdjRemarks('');
    } catch (err) {
      console.error(err);
      setError("Failed to post adjustment.");
    }
    setActionLoading(false);
  };

  if (loading) return <LoadingScreen />;

  // Show user details if a user is selected
  if (user && userData) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Manage User: {user.photographerId}</h1>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-slate-500 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
            >
              ← Back to List
            </button>
          </div>
        </div>
        
        {message && <SuccessMessage message={message} onClose={() => setMessage('')} />}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">User Information</h2>
            <form onSubmit={handleSaveUserDetails} className="space-y-4">
              <Input
                id="photographerId"
                label="UserID"
                value={user.photographerId}
                disabled
              />
              <Input
                id="displayName"
                label="Full Name"
                value={userData.displayName}
                onChange={handleUserChange}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                value={userData.email}
                onChange={handleUserChange}
              />
              <Input
                id="phoneNumber"
                label="Phone Number"
                type="tel"
                value={userData.phoneNumber}
                onChange={handleUserChange}
              />
              <Input
                id="joined"
                label="Joined Date"
                value={new Date(user.createdAt.seconds * 1000).toLocaleString()}
                disabled
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save User Details'}
              </button>
            </form>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Bank Details</h2>
            <form onSubmit={handleSaveUserDetails} className="space-y-4">
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
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Bank Details'}
              </button>
            </form>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Set New Password</h2>
            {passwordError && <ErrorMessage message={passwordError} onClose={() => setPasswordError('')} />}
            <form onSubmit={handleSetPassword} className="space-y-4">
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Earnings Adjustment</h2>
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
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit Adjustment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show user list
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Manage User</h1>
        <div className="relative mt-4 md:mt-0">
          <Input
            id="userSearch"
            type="text"
            placeholder="Search by UserID, Name, Email, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-72"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>UserID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Joined</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <Td>{u.photographerId}</Td>
                <Td>{u.displayName}</Td>
                <Td>{u.email}</Td>
                <Td>{u.phoneNumber || '-'}</Td>
                <Td>{new Date(u.createdAt.seconds * 1000).toLocaleDateString()}</Td>
                <Td>
                  <button
                    onClick={() => handleSelectUser(u)}
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 shadow-sm"
                  >
                    Manage
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-slate-600">
            Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export all admin page components
export { AdminDashboard, AdminOrdersTab, AdminUsersPage, AdminRedeemTab, AdminModelsPage, AdminManageUserPage };