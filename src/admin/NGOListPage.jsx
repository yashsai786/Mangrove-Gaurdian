import React, { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Phone, Mail, Globe, Users, Eye, Trash2, X, Loader2 } from 'lucide-react';
import { collection, getDocs, doc, getDoc, query, where, documentId, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';

const NGOListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [newNgo, setNewNgo] = useState({
    name: '',
    city: '',
    state: '',
    email: '',
    phone: '',
    website: ''
  });

  // Fetch NGOs from Firebase
  const fetchNgos = async () => {
    try {
      setLoading(true);
      setError(null);

      const ngosCollection = collection(db, 'ngos');
      const snapshot = await getDocs(ngosCollection);
      const ngoData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      setNgos(ngoData);
    } catch (err) {
      setError('Failed to fetch NGO data. Please try again.');
      console.error('Error fetching NGOs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add NGO to Firebase
  const addNgoToFirebase = async (ngoData) => {
    try {
      setSubmitting(true);
      
      const ngosCollection = collection(db, 'ngos');
      const docRef = await addDoc(ngosCollection, {
        ...ngoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Add the new NGO to local state with the generated ID
      const newNgoWithId = {
        ...ngoData,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setNgos(prev => [...prev, newNgoWithId]);
      return newNgoWithId;
    } catch (err) {
      throw new Error('Failed to add NGO. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete NGO from Firebase
  const deleteNgoFromFirebase = async (ngoId) => {
    try {
      const ngoDoc = doc(db, 'ngos', ngoId);
      await deleteDoc(ngoDoc);
      
      setNgos(prev => prev.filter(ngo => ngo.id !== ngoId));
    } catch (err) {
      setError('Failed to delete NGO. Please try again.');
      console.error('Error deleting NGO:', err);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, []);

  const filteredNgos = ngos.filter(ngo =>
    ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNgo = async (e) => {
    e.preventDefault();
    try {
      await addNgoToFirebase(newNgo);
      setNewNgo({
        name: '',
        city: '',
        state: '',
        email: '',
        phone: '',
        website: ''
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNgo = async (ngoId) => {
    if (window.confirm('Are you sure you want to delete this NGO?')) {
      await deleteNgoFromFirebase(ngoId);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) return (
    <div className="flex">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1 flex justify-center items-center h-screen">
        <div className="text-lg">Loading NGOs...</div>
      </div>
    </div>
  );

  if (error && ngos.length === 0) return (
    <div className="flex">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1 p-8">
        <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 h-screen bg-red-700 fixed`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'md:ml-64' : ''} p-8 overflow-auto`}>
        {/* Mobile Menu Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md bg-red-700 text-white"
          >
            {sidebarOpen ? 'Close Menu' : 'Open Menu'}
          </button>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">NGO List</h2>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Add New NGO
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by NGO name, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">×</button>
            </div>
          )}

          {/* NGO Table */}
          {filteredNgos.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">NGO Details</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Location</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredNgos.map((ngo) => (
                      <tr key={ngo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">{ngo.name}</h3>
                            <p className="text-sm text-gray-600">NGO ID: {ngo.id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center text-gray-700">
                            <MapPin size={16} className="mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium">{ngo.city}</div>
                              <div className="text-sm text-gray-500">{ngo.state}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-2 text-gray-400" />
                              <span className="truncate">{ngo.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              <span>{ngo.phone}</span>
                            </div>
                            {ngo.website && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Globe size={14} className="mr-2 text-gray-400" />
                                <span className="truncate">{ngo.website}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteNgo(ngo.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              {searchTerm ? (
                <p>No NGOs found matching "{searchTerm}"</p>
              ) : (
                <div>
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No NGOs available in the system</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total NGOs</p>
                  <p className="text-2xl font-bold text-gray-900">{ngos.length}</p>
                </div>
                <Users className="text-green-600" size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cities Covered</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Set(ngos.map(ngo => ngo.city)).size}
                  </p>
                </div>
                <MapPin className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">States Covered</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(ngos.map(ngo => ngo.state)).size}
                  </p>
                </div>
                <div className="w-6 h-6 bg-purple-600 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-gray-500 text-sm">
            {searchTerm ? 
              `Found ${filteredNgos.length} ${filteredNgos.length === 1 ? 'NGO' : 'NGOs'}` : 
              `Total: ${ngos.length} ${ngos.length === 1 ? 'NGO' : 'NGOs'}`}
          </div>
        </div>
      </div>

      {/* Add NGO Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New NGO</h3>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddNgo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NGO Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNgo.name}
                    onChange={(e) => setNewNgo({...newNgo, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter NGO name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNgo.city}
                    onChange={(e) => setNewNgo({...newNgo, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter city"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNgo.state}
                    onChange={(e) => setNewNgo({...newNgo, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter state"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newNgo.email}
                    onChange={(e) => setNewNgo({...newNgo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="contact@ngo.org"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newNgo.phone}
                    onChange={(e) => setNewNgo({...newNgo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={newNgo.website}
                    onChange={(e) => setNewNgo({...newNgo, website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="www.ngo.org"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={submitting}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Adding...' : 'Add NGO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NGOListPage;

// import React, { useState, useEffect } from 'react';
// import { Search, Plus, MapPin, Phone, Mail, Globe, Users, Eye, Trash2, X, Loader2 } from 'lucide-react';
// import { collection, getDocs, doc, getDoc, query, where, documentId, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from '../config/firebase';
// import Sidebar from './Sidebar';

// const NGOListPage = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
//   const [ngos, setNgos] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [submitting, setSubmitting] = useState(false);

//   const [newNgo, setNewNgo] = useState({
//     name: '',
//     city: '',
//     state: '',
//     email: '',
//     phone: '',
//     website: ''
//   });

//   // Fetch NGOs from Firebase
//   const fetchNgos = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const ngosCollection = collection(db, 'ngos');
//       const snapshot = await getDocs(ngosCollection);
//       const ngoData = snapshot.docs.map(doc => ({ 
//         id: doc.id, 
//         ...doc.data() 
//       }));
      
//       setNgos(ngoData);
//     } catch (err) {
//       setError('Failed to fetch NGO data. Please try again.');
//       console.error('Error fetching NGOs:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Add NGO to Firebase
//   const addNgoToFirebase = async (ngoData) => {
//     try {
//       setSubmitting(true);
      
//       const ngosCollection = collection(db, 'ngos');
//       const docRef = await addDoc(ngosCollection, {
//         ...ngoData,
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp()
//       });
      
//       // Add the new NGO to local state with the generated ID
//       const newNgoWithId = {
//         ...ngoData,
//         id: docRef.id,
//         createdAt: new Date(),
//         updatedAt: new Date()
//       };
      
//       setNgos(prev => [...prev, newNgoWithId]);
//       return newNgoWithId;
//     } catch (err) {
//       throw new Error('Failed to add NGO. Please try again.');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // Delete NGO from Firebase
//   const deleteNgoFromFirebase = async (ngoId) => {
//     try {
//       const ngoDoc = doc(db, 'ngos', ngoId);
//       await deleteDoc(ngoDoc);
      
//       setNgos(prev => prev.filter(ngo => ngo.id !== ngoId));
//     } catch (err) {
//       setError('Failed to delete NGO. Please try again.');
//       console.error('Error deleting NGO:', err);
//     }
//   };

//   useEffect(() => {
//     fetchNgos();
//   }, []);

//   const filteredNgos = ngos.filter(ngo =>
//     ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     ngo.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     ngo.state.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const handleAddNgo = async (e) => {
//     e.preventDefault();
//     try {
//       await addNgoToFirebase(newNgo);
//       setNewNgo({
//         name: '',
//         city: '',
//         state: '',
//         email: '',
//         phone: '',
//         website: ''
//       });
//       setIsAddDialogOpen(false);
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleDeleteNgo = async (ngoId) => {
//     if (window.confirm('Are you sure you want to delete this NGO?')) {
//       await deleteNgoFromFirebase(ngoId);
//     }
//   };

//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   };

//   return (
//     <div className="flex bg-gray-50 min-h-screen">
//       {/* Sidebar */}
        
        

//       {/* Main Content */}
//       <div className="ml-72 flex-1 p-8">
//         <div className="max-w-7xl mx-auto">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-8">
//             <h2 className="text-3xl font-bold text-gray-900">NGO List</h2>
//             <button
//               onClick={() => setIsAddDialogOpen(true)}
//               className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
//             >
//               <Plus size={20} />
//               Add New NGO
//             </button>
//           </div>

//           {/* Search Bar */}
//           <div className="relative mb-6">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
//             <input
//               type="text"
//               placeholder="Search by NGO name, city, or state..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//             />
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
//               {error}
//             </div>
//           )}

//           {/* Loading State */}
//           {loading ? (
//             <div className="flex justify-center items-center py-12">
//               <Loader2 className="animate-spin text-green-600" size={32} />
//               <span className="ml-3 text-gray-600">Loading NGOs...</span>
//             </div>
//           ) : (
//             /* NGO Table */
//             <div className="bg-white rounded-lg shadow-sm overflow-hidden">
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead className="bg-gray-50 border-b border-gray-200">
//                     <tr>
//                       <th className="text-left py-4 px-6 font-semibold text-gray-900">NGO Details</th>
//                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Location</th>
//                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
//                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200">
//                     {filteredNgos.map((ngo) => (
//                       <tr key={ngo.id} className="hover:bg-gray-50 transition-colors">
//                         <td className="py-4 px-6">
//                           <div>
//                             <h3 className="font-semibold text-gray-900 mb-1">{ngo.name}</h3>
//                             <p className="text-sm text-gray-600">NGO ID: {ngo.id}</p>
//                           </div>
//                         </td>
//                         <td className="py-4 px-6">
//                           <div className="flex items-center text-gray-700">
//                             <MapPin size={16} className="mr-2 text-gray-400" />
//                             <div>
//                               <div className="font-medium">{ngo.city}</div>
//                               <div className="text-sm text-gray-500">{ngo.state}</div>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="py-4 px-6">
//                           <div className="space-y-1">
//                             <div className="flex items-center text-sm text-gray-600">
//                               <Mail size={14} className="mr-2 text-gray-400" />
//                               <span className="truncate">{ngo.email}</span>
//                             </div>
//                             <div className="flex items-center text-sm text-gray-600">
//                               <Phone size={14} className="mr-2 text-gray-400" />
//                               <span>{ngo.phone}</span>
//                             </div>
//                             {ngo.website && (
//                               <div className="flex items-center text-sm text-gray-600">
//                                 <Globe size={14} className="mr-2 text-gray-400" />
//                                 <span className="truncate">{ngo.website}</span>
//                               </div>
//                             )}
//                           </div>
//                         </td>
//                         <td className="py-4 px-6">
//                           <div className="flex items-center gap-2">
//                             <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors">
//                               <Eye size={16} />
//                             </button>
//                             <button 
//                               onClick={() => handleDeleteNgo(ngo.id)}
//                               className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
//                             >
//                               <Trash2 size={16} />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {filteredNgos.length === 0 && !loading && (
//                 <div className="text-center py-12 text-gray-500">
//                   <Users size={48} className="mx-auto mb-4 text-gray-300" />
//                   <p>No NGOs found matching your search criteria.</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Stats Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
//             <div className="bg-white p-6 rounded-lg shadow-sm">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total NGOs</p>
//                   <p className="text-2xl font-bold text-gray-900">{ngos.length}</p>
//                 </div>
//                 <Users className="text-green-600" size={24} />
//               </div>
//             </div>
//             <div className="bg-white p-6 rounded-lg shadow-sm">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Cities Covered</p>
//                   <p className="text-2xl font-bold text-blue-600">
//                     {new Set(ngos.map(ngo => ngo.city)).size}
//                   </p>
//                 </div>
//                 <MapPin className="text-blue-600" size={24} />
//               </div>
//             </div>
//             <div className="bg-white p-6 rounded-lg shadow-sm">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">States Covered</p>
//                   <p className="text-2xl font-bold text-purple-600">
//                     {new Set(ngos.map(ngo => ngo.state)).size}
//                   </p>
//                 </div>
//                 <div className="w-6 h-6 bg-purple-600 rounded-full"></div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Add NGO Dialog */}
//       {isAddDialogOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between items-center p-6 border-b border-gray-200">
//               <h3 className="text-xl font-semibold text-gray-900">Add New NGO</h3>
//               <button
//                 onClick={() => setIsAddDialogOpen(false)}
//                 className="text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <X size={24} />
//               </button>
//             </div>
            
//             <form onSubmit={handleAddNgo} className="p-6 space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     NGO Name *
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={newNgo.name}
//                     onChange={(e) => setNewNgo({...newNgo, name: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="Enter NGO name"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     City *
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={newNgo.city}
//                     onChange={(e) => setNewNgo({...newNgo, city: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="Enter city"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     State *
//                   </label>
//                   <input
//                     type="text"
//                     required
//                     value={newNgo.state}
//                     onChange={(e) => setNewNgo({...newNgo, state: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="Enter state"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Email *
//                   </label>
//                   <input
//                     type="email"
//                     required
//                     value={newNgo.email}
//                     onChange={(e) => setNewNgo({...newNgo, email: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="contact@ngo.org"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Phone Number *
//                   </label>
//                   <input
//                     type="tel"
//                     required
//                     value={newNgo.phone}
//                     onChange={(e) => setNewNgo({...newNgo, phone: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="+91 98765 43210"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Website (Optional)
//                   </label>
//                   <input
//                     type="url"
//                     value={newNgo.website}
//                     onChange={(e) => setNewNgo({...newNgo, website: e.target.value})}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
//                     placeholder="www.ngo.org"
//                   />
//                 </div>
//               </div>
              
//               <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
//                 <button
//                   type="button"
//                   onClick={() => setIsAddDialogOpen(false)}
//                   disabled={submitting}
//                   className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={submitting}
//                   className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
//                 >
//                   {submitting && <Loader2 size={16} className="animate-spin" />}
//                   {submitting ? 'Adding...' : 'Add NGO'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NGOListPage;

// // import React, { useState, useEffect } from 'react';
// // import { Search, Plus, MapPin, Phone, Mail, Globe, Users, Eye, Trash2, X, Loader2 } from 'lucide-react';
// // import { db } from '../firebase/config'; // Adjust path as needed
// // import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// // const NGOListPage = () => {
// //   const [searchTerm, setSearchTerm] = useState('');
// //   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
// //   const [ngos, setNgos] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [submitting, setSubmitting] = useState(false);

// //   const [newNgo, setNewNgo] = useState({
// //     name: '',
// //     city: '',
// //     state: '',
// //     email: '',
// //     phone: '',
// //     website: ''
// //   });

// //   // Fetch NGOs from Firebase
// //   const fetchNgos = async () => {
// //     try {
// //       setLoading(true);
// //       setError(null);

// //       const ngosCollection = collection(db, 'ngos');
// //       const snapshot = await getDocs(ngosCollection);
// //       const ngoData = snapshot.docs.map(doc => ({ 
// //         id: doc.id, 
// //         ...doc.data() 
// //       }));
      
// //       setNgos(ngoData);
// //     } catch (err) {
// //       setError('Failed to fetch NGO data. Please try again.');
// //       console.error('Error fetching NGOs:', err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Add NGO to Firebase
// //   const addNgoToFirebase = async (ngoData) => {
// //     try {
// //       setSubmitting(true);
      
// //       const ngosCollection = collection(db, 'ngos');
// //       const docRef = await addDoc(ngosCollection, {
// //         ...ngoData,
// //         createdAt: serverTimestamp(),
// //         updatedAt: serverTimestamp()
// //       });
      
// //       // Add the new NGO to local state with the generated ID
// //       const newNgoWithId = {
// //         ...ngoData,
// //         id: docRef.id,
// //         createdAt: new Date(),
// //         updatedAt: new Date()
// //       };
      
// //       setNgos(prev => [...prev, newNgoWithId]);
// //       return newNgoWithId;
// //     } catch (err) {
// //       throw new Error('Failed to add NGO. Please try again.');
// //     } finally {
// //       setSubmitting(false);
// //     }
// //   };

// //   // Delete NGO from Firebase
// //   const deleteNgoFromFirebase = async (ngoId) => {
// //     try {
// //       const ngoDoc = doc(db, 'ngos', ngoId);
// //       await deleteDoc(ngoDoc);
      
// //       setNgos(prev => prev.filter(ngo => ngo.id !== ngoId));
// //     } catch (err) {
// //       setError('Failed to delete NGO. Please try again.');
// //       console.error('Error deleting NGO:', err);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchNgos();
// //   }, []);

// //   const filteredNgos = ngos.filter(ngo =>
// //     ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //     ngo.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //     ngo.state.toLowerCase().includes(searchTerm.toLowerCase())
// //   );

// //   const handleAddNgo = async (e) => {
// //     e.preventDefault();
// //     try {
// //       await addNgoToFirebase(newNgo);
// //       setNewNgo({
// //         name: '',
// //         city: '',
// //         state: '',
// //         email: '',
// //         phone: '',
// //         website: ''
// //       });
// //       setIsAddDialogOpen(false);
// //     } catch (err) {
// //       setError(err.message);
// //     }
// //   };

// //   const handleDeleteNgo = async (ngoId) => {
// //     if (window.confirm('Are you sure you want to delete this NGO?')) {
// //       await deleteNgoFromFirebase(ngoId);
// //     }
// //   };

// //   const formatDate = (date) => {
// //     return new Date(date).toLocaleDateString('en-IN', {
// //       day: '2-digit',
// //       month: '2-digit',
// //       year: 'numeric'
// //     });
// //   };

// //   return (
// //     <div className="flex bg-gray-50 min-h-screen">
// //       {/* Sidebar */}
// //       <div className="w-72 bg-gradient-to-b from-green-700 to-green-500 text-white fixed left-0 top-0 h-full">
// //         <div className="p-6 border-b border-green-600">
// //           <h1 className="text-xl font-bold mb-1">Mangrove Guardian</h1>
// //           <p className="text-green-100 text-sm">Admin Dashboard</p>
// //         </div>
        
// //         <nav className="mt-6">
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             Dashboard
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             View Users
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             Approve New Users
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             View Reported Posts
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             Post Details
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             View Feedback
// //           </div>
// //           <div className="px-6 py-3 bg-green-600 border-l-4 border-white cursor-pointer">
// //             NGO List
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             Add Admin
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors">
// //             User Panel
// //           </div>
// //           <div className="px-6 py-3 hover:bg-green-600 cursor-pointer transition-colors mt-4 border-t border-green-600">
// //             Logout
// //           </div>
// //         </nav>
// //       </div>

// //       {/* Main Content */}
// //       <div className="ml-72 flex-1 p-8">
// //         <div className="max-w-7xl mx-auto">
// //           {/* Header */}
// //           <div className="flex justify-between items-center mb-8">
// //             <h2 className="text-3xl font-bold text-gray-900">NGO List</h2>
// //             <button
// //               onClick={() => setIsAddDialogOpen(true)}
// //               className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
// //             >
// //               <Plus size={20} />
// //               Add New NGO
// //             </button>
// //           </div>

// //           {/* Search Bar */}
// //           <div className="relative mb-6">
// //             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
// //             <input
// //               type="text"
// //               placeholder="Search by NGO name, city, or state..."
// //               value={searchTerm}
// //               onChange={(e) => setSearchTerm(e.target.value)}
// //               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //             />
// //           </div>

// //           {/* Error Message */}
// //           {error && (
// //             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
// //               {error}
// //             </div>
// //           )}

// //           {/* Loading State */}
// //           {loading ? (
// //             <div className="flex justify-center items-center py-12">
// //               <Loader2 className="animate-spin text-green-600" size={32} />
// //               <span className="ml-3 text-gray-600">Loading NGOs...</span>
// //             </div>
// //           ) : (
// //             /* NGO Table */
// //             <div className="bg-white rounded-lg shadow-sm overflow-hidden">
// //               <div className="overflow-x-auto">
// //                 <table className="w-full">
// //                   <thead className="bg-gray-50 border-b border-gray-200">
// //                     <tr>
// //                       <th className="text-left py-4 px-6 font-semibold text-gray-900">NGO Details</th>
// //                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Location</th>
// //                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
// //                       <th className="text-left py-4 px-6 font-semibold text-gray-900">Actions</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody className="divide-y divide-gray-200">
// //                     {filteredNgos.map((ngo) => (
// //                       <tr key={ngo.id} className="hover:bg-gray-50 transition-colors">
// //                         <td className="py-4 px-6">
// //                           <div>
// //                             <h3 className="font-semibold text-gray-900 mb-1">{ngo.name}</h3>
// //                             <p className="text-sm text-gray-600">NGO ID: {ngo.id}</p>
// //                           </div>
// //                         </td>
// //                         <td className="py-4 px-6">
// //                           <div className="flex items-center text-gray-700">
// //                             <MapPin size={16} className="mr-2 text-gray-400" />
// //                             <div>
// //                               <div className="font-medium">{ngo.city}</div>
// //                               <div className="text-sm text-gray-500">{ngo.state}</div>
// //                             </div>
// //                           </div>
// //                         </td>
// //                         <td className="py-4 px-6">
// //                           <div className="space-y-1">
// //                             <div className="flex items-center text-sm text-gray-600">
// //                               <Mail size={14} className="mr-2 text-gray-400" />
// //                               <span className="truncate">{ngo.email}</span>
// //                             </div>
// //                             <div className="flex items-center text-sm text-gray-600">
// //                               <Phone size={14} className="mr-2 text-gray-400" />
// //                               <span>{ngo.phone}</span>
// //                             </div>
// //                             {ngo.website && (
// //                               <div className="flex items-center text-sm text-gray-600">
// //                                 <Globe size={14} className="mr-2 text-gray-400" />
// //                                 <span className="truncate">{ngo.website}</span>
// //                               </div>
// //                             )}
// //                           </div>
// //                         </td>
// //                         <td className="py-4 px-6">
// //                           <div className="flex items-center gap-2">
// //                             <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors">
// //                               <Eye size={16} />
// //                             </button>
// //                             <button 
// //                               onClick={() => handleDeleteNgo(ngo.id)}
// //                               className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
// //                             >
// //                               <Trash2 size={16} />
// //                             </button>
// //                           </div>
// //                         </td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               </div>

// //               {filteredNgos.length === 0 && !loading && (
// //                 <div className="text-center py-12 text-gray-500">
// //                   <Users size={48} className="mx-auto mb-4 text-gray-300" />
// //                   <p>No NGOs found matching your search criteria.</p>
// //                 </div>
// //               )}
// //             </div>
// //           )}

// //           {/* Stats Cards */}
// //           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
// //             <div className="bg-white p-6 rounded-lg shadow-sm">
// //               <div className="flex items-center justify-between">
// //                 <div>
// //                   <p className="text-sm font-medium text-gray-600">Total NGOs</p>
// //                   <p className="text-2xl font-bold text-gray-900">{ngos.length}</p>
// //                 </div>
// //                 <Users className="text-green-600" size={24} />
// //               </div>
// //             </div>
// //             <div className="bg-white p-6 rounded-lg shadow-sm">
// //               <div className="flex items-center justify-between">
// //                 <div>
// //                   <p className="text-sm font-medium text-gray-600">Cities Covered</p>
// //                   <p className="text-2xl font-bold text-blue-600">
// //                     {new Set(ngos.map(ngo => ngo.city)).size}
// //                   </p>
// //                 </div>
// //                 <MapPin className="text-blue-600" size={24} />
// //               </div>
// //             </div>
// //             <div className="bg-white p-6 rounded-lg shadow-sm">
// //               <div className="flex items-center justify-between">
// //                 <div>
// //                   <p className="text-sm font-medium text-gray-600">States Covered</p>
// //                   <p className="text-2xl font-bold text-purple-600">
// //                     {new Set(ngos.map(ngo => ngo.state)).size}
// //                   </p>
// //                 </div>
// //                 <div className="w-6 h-6 bg-purple-600 rounded-full"></div>
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Add NGO Dialog */}
// //       {isAddDialogOpen && (
// //         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
// //           <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
// //             <div className="flex justify-between items-center p-6 border-b border-gray-200">
// //               <h3 className="text-xl font-semibold text-gray-900">Add New NGO</h3>
// //               <button
// //                 onClick={() => setIsAddDialogOpen(false)}
// //                 className="text-gray-400 hover:text-gray-600 transition-colors"
// //               >
// //                 <X size={24} />
// //               </button>
// //             </div>
            
// //             <form onSubmit={handleAddNgo} className="p-6 space-y-4">
// //               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     NGO Name *
// //                   </label>
// //                   <input
// //                     type="text"
// //                     required
// //                     value={newNgo.name}
// //                     onChange={(e) => setNewNgo({...newNgo, name: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="Enter NGO name"
// //                   />
// //                 </div>
                
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     City *
// //                   </label>
// //                   <input
// //                     type="text"
// //                     required
// //                     value={newNgo.city}
// //                     onChange={(e) => setNewNgo({...newNgo, city: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="Enter city"
// //                   />
// //                 </div>
                
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     State *
// //                   </label>
// //                   <input
// //                     type="text"
// //                     required
// //                     value={newNgo.state}
// //                     onChange={(e) => setNewNgo({...newNgo, state: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="Enter state"
// //                   />
// //                 </div>
                
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Email *
// //                   </label>
// //                   <input
// //                     type="email"
// //                     required
// //                     value={newNgo.email}
// //                     onChange={(e) => setNewNgo({...newNgo, email: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="contact@ngo.org"
// //                   />
// //                 </div>
                
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Phone Number *
// //                   </label>
// //                   <input
// //                     type="tel"
// //                     required
// //                     value={newNgo.phone}
// //                     onChange={(e) => setNewNgo({...newNgo, phone: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="+91 98765 43210"
// //                   />
// //                 </div>
                
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Website (Optional)
// //                   </label>
// //                   <input
// //                     type="url"
// //                     value={newNgo.website}
// //                     onChange={(e) => setNewNgo({...newNgo, website: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                     placeholder="www.ngo.org"
// //                   />
// //                 </div>
// //               </div>2">
// //                     Status
// //                   </label>
// //                   <select
// //                     value={newNgo.status}
// //                     onChange={(e) => setNewNgo({...newNgo, status: e.target.value})}
// //                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                   >
// //                     <option value="Pending">Pending</option>
// //                     <option value="Active">Active</option>
// //                     <option value="Inactive">Inactive</option>
// //                   </select>
// //                 </div>
// //               </div>
              
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Description *
// //                 </label>
// //                 <textarea
// //                   required
// //                   rows={4}
// //                   value={newNgo.description}
// //                   onChange={(e) => setNewNgo({...newNgo, description: e.target.value})}
// //                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
// //                   placeholder="Brief description of the NGO's mission and activities..."
// //                 />
// //               </div>
              
// //               <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
// //                 <button
// //                   type="button"
// //                   onClick={() => setIsAddDialogOpen(false)}
// //                   disabled={submitting}
// //                   className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   type="submit"
// //                   disabled={submitting}
// //                   className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
// //                 >
// //                   {submitting && <Loader2 size={16} className="animate-spin" />}
// //                   {submitting ? 'Adding...' : 'Add NGO'}
// //                 </button>
// //               </div>
// //             </form>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default NGOListPage;