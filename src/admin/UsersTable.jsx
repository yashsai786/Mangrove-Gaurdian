import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';

const UsersTable = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPosts, setUserPosts] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const usersList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status !== undefined ? doc.data().status : 'enabled'
        }));
        setUsers(usersList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users: ', err);
        setError('Failed to load users. Please try again.');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchValue = searchTerm.toLowerCase();
    
    // If searching for "admin", specifically check the role field
    if (searchValue === "admin") {
      return user.role === "admin";
    }
    
    // Otherwise, search across multiple fields
    return (
      (user.name && user.name.toLowerCase().includes(searchValue)) ||
      (user.email && user.email.toLowerCase().includes(searchValue)) ||
      (user.username && user.username.toLowerCase().includes(searchValue)) ||
      (user.id && user.id.toLowerCase().includes(searchValue)) ||
      (user.role && user.role.toLowerCase().includes(searchValue))
    );
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setUpdating(userId);
      const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: newStatus,
        lastUpdated: new Date()
      });
      
      setUsers(users.map(user => 
        user.id === userId ? {...user, status: newStatus} : user
      ));
      
      setUpdating(null);
    } catch (err) {
      console.error('Error updating user status: ', err);
      setError(`Failed to update user status. ${err.message}`);
      setUpdating(null);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      setModalLoading(true);
      setShowModal(true);
      
      // Get user data
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setSelectedUser({
          id: userSnap.id,
          ...userSnap.data()
        });
        
        // Get post count
        const postsCollection = collection(db, 'posts');
        const q = query(postsCollection, where("userId", "==", userId));
        const snapshot = await getCountFromServer(q);
        setUserPosts(snapshot.data().count);
      } else {
        setError("User not found");
      }
      
      setModalLoading(false);
    } catch (err) {
      console.error('Error fetching user details: ', err);
      setError("Failed to load user details");
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setUserPosts(0);
  };

  if (loading) return (
    <div className="flex">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1 flex justify-center items-center h-screen">
        <div className="text-lg">Loading users...</div>
      </div>
    </div>
  );

  if (error) return (
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

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">View Users</h1>
          
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, username, role or ID..."
              className="w-full p-3 pl-4 border rounded-lg text-sm shadow-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
              value={searchTerm}
              onChange={handleSearchChange}
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
        </div>

        {/* Users Table */}
        {filteredUsers.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-500">
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{user.name || "N/A"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.username || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status || "enabled"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => viewUserDetails(user.id)} 
                        className="text-indigo-600 hover:text-indigo-900 hover:underline mr-4"
                      >
                        View
                      </button>
{/*                       <a href="#" className="text-gray-600 hover:text-gray-900 hover:underline mr-4">Edit</a> */}
                      <button 
                        className={`${
                          user.status === 'enabled' 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        } hover:underline ${updating === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !updating && toggleUserStatus(user.id, user.status)}
                        disabled={updating === user.id}
                      >
                        {updating === user.id 
                          ? 'Updating...' 
                          : user.status === 'enabled' 
                            ? 'Disable' 
                            : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            {searchTerm ? (
              <p>No users found matching "{searchTerm}"</p>
            ) : (
              <p>No users registered in the system</p>
            )}
          </div>
        )}

        <div className="mt-4 text-gray-500 text-sm">
          {searchTerm ? 
            `Found ${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}` : 
            `Total: ${users.length} ${users.length === 1 ? 'user' : 'users'}`}
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto z-50">
            <div className="sticky top-0 bg-red-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">User Details</h2>
              <button 
                onClick={closeModal}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading user details...</div>
                </div>
              ) : selectedUser ? (
                <div className="space-y-6">
                  {/* User Summary */}
                  <div className="flex items-center space-x-4 border-b pb-4">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-2xl font-medium text-red-700">
                        {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">{selectedUser.name || "N/A"}</h3>
                      <p className="text-gray-500">{selectedUser.email || "N/A"}</p>
                      <div className="flex space-x-2 mt-2">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedUser.role || "user"}
                        </span>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedUser.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.status || "enabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-gray-500 text-sm">Total Posts</p>
                      <p className="text-2xl font-bold text-red-700">{userPosts}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-gray-500 text-sm">Account Age</p>
                      <p className="text-2xl font-bold text-red-700">
                        {selectedUser.createdAt ? 
                          Math.floor((new Date() - new Date(selectedUser.createdAt.seconds * 1000)) / (1000 * 60 * 60 * 24)) + " days" 
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="border rounded-lg overflow-hidden">
                    <h4 className="bg-gray-50 px-4 py-2 font-medium border-b">User Information</h4>
                    <div className="divide-y">
                      {Object.entries(selectedUser).map(([key, value]) => {
                        // Skip displaying certain fields or complex objects
                        if (
                          key === 'id' || 
                          typeof value === 'object' ||
                          typeof value === 'function' ||
                          key === 'password' ||
                          key === '_redirectEventId'
                        ) return null;
                        
                        return (
                          <div key={key} className="px-4 py-3 flex justify-between">
                            <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-medium">
                              {typeof value === 'boolean' ? String(value) : value || 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                      <div className="px-4 py-3 flex justify-between">
                        <span className="text-gray-500">User ID</span>
                        <span className="font-medium text-gray-800">{selectedUser.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp Information */}
                  {(selectedUser.createdAt || selectedUser.lastLogin || selectedUser.lastUpdated) && (
                    <div className="border rounded-lg overflow-hidden">
                      <h4 className="bg-gray-50 px-4 py-2 font-medium border-b">Timestamps</h4>
                      <div className="divide-y">
                        {selectedUser.createdAt && (
                          <div className="px-4 py-3 flex justify-between">
                            <span className="text-gray-500">Created At</span>
                            <span className="font-medium">
                              {new Date(selectedUser.createdAt.seconds * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedUser.lastLogin && (
                          <div className="px-4 py-3 flex justify-between">
                            <span className="text-gray-500">Last Login</span>
                            <span className="font-medium">
                              {new Date(selectedUser.lastLogin.seconds * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedUser.lastUpdated && (
                          <div className="px-4 py-3 flex justify-between">
                            <span className="text-gray-500">Last Updated</span>
                            <span className="font-medium">
                              {new Date(selectedUser.lastUpdated.seconds * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">
                  User not found or error loading details
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-3 flex justify-end border-t">
              <button
                onClick={closeModal}
                className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTable;

// import React, { useState, useEffect } from 'react';
// import { collection, getDocs, doc, updateDoc, getDoc, query, where, getCountFromServer } from 'firebase/firestore';
// import { db } from '../config/firebase';
// import Sidebar from './Sidebar';

// const UsersTable = () => {
//   const [users, setUsers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [updating, setUpdating] = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [userPosts, setUserPosts] = useState(0);
//   const [modalLoading, setModalLoading] = useState(false);
//   const [showModal, setShowModal] = useState(false);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         setLoading(true);
//         const usersCollection = collection(db, 'users');
//         const userSnapshot = await getDocs(usersCollection);
//         const usersList = userSnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data(),
//           status: doc.data().status !== undefined ? doc.data().status : 'enabled'
//         }));
//         setUsers(usersList);
//         setLoading(false);
//       } catch (err) {
//         console.error('Error fetching users: ', err);
//         setError('Failed to load users. Please try again.');
//         setLoading(false);
//       }
//     };

//     fetchUsers();
//   }, []);

//   // Filter users based on search term
//   const filteredUsers = users.filter(user => {
//     const searchValue = searchTerm.toLowerCase();
//     return (
//       (user.name && user.name.toLowerCase().includes(searchValue)) ||
//       (user.email && user.email.toLowerCase().includes(searchValue)) ||
//       (user.username && user.username.toLowerCase().includes(searchValue)) ||
//       (user.id && user.id.toLowerCase().includes(searchValue))
//     );
//   });

//   const handleSearchChange = (e) => {
//     setSearchTerm(e.target.value);
//   };

//   const toggleSidebar = () => {
//     setSidebarOpen(!sidebarOpen);
//   };

//   const toggleUserStatus = async (userId, currentStatus) => {
//     try {
//       setUpdating(userId);
//       const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
      
//       const userRef = doc(db, 'users', userId);
//       await updateDoc(userRef, {
//         status: newStatus,
//         lastUpdated: new Date()
//       });
      
//       setUsers(users.map(user => 
//         user.id === userId ? {...user, status: newStatus} : user
//       ));
      
//       setUpdating(null);
//     } catch (err) {
//       console.error('Error updating user status: ', err);
//       setError(`Failed to update user status. ${err.message}`);
//       setUpdating(null);
//     }
//   };

//   const viewUserDetails = async (userId) => {
//     try {
//       setModalLoading(true);
//       setShowModal(true);
      
//       // Get user data
//       const userRef = doc(db, 'users', userId);
//       const userSnap = await getDoc(userRef);
      
//       if (userSnap.exists()) {
//         setSelectedUser({
//           id: userSnap.id,
//           ...userSnap.data()
//         });
        
//         // Get post count
//         const postsCollection = collection(db, 'posts');
//         const q = query(postsCollection, where("userId", "==", userId));
//         const snapshot = await getCountFromServer(q);
//         setUserPosts(snapshot.data().count);
//       } else {
//         setError("User not found");
//       }
      
//       setModalLoading(false);
//     } catch (err) {
//       console.error('Error fetching user details: ', err);
//       setError("Failed to load user details");
//       setModalLoading(false);
//     }
//   };

//   const closeModal = () => {
//     setShowModal(false);
//     setSelectedUser(null);
//     setUserPosts(0);
//   };

//   if (loading) return (
//     <div className="flex">
//       <div className="w-64">
//         <Sidebar />
//       </div>
//       <div className="flex-1 flex justify-center items-center h-screen">
//         <div className="text-lg">Loading users...</div>
//       </div>
//     </div>
//   );

//   if (error) return (
//     <div className="flex">
//       <div className="w-64">
//         <Sidebar />
//       </div>
//       <div className="flex-1 p-8">
//         <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Sidebar */}
//       <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 h-screen bg-red-700 fixed`}>
//         <Sidebar />
//       </div>

//       {/* Main Content */}
//       <div className={`flex-1 ${sidebarOpen ? 'md:ml-64' : ''} p-8 overflow-auto`}>
//         {/* Mobile Menu Toggle */}
//         <div className="md:hidden mb-4">
//           <button
//             onClick={toggleSidebar}
//             className="p-2 rounded-md bg-red-700 text-white"
//           >
//             {sidebarOpen ? 'Close Menu' : 'Open Menu'}
//           </button>
//         </div>

//         {/* Page Header */}
//         <div className="mb-6">
//           <h1 className="text-2xl font-bold mb-4">View Users</h1>
          
//           {/* Search Input */}
//           <div className="relative">
//             <input
//               type="text"
//               placeholder="Search by name, email, username or ID..."
//               className="w-full p-3 pl-4 border rounded-lg text-sm shadow-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
//               value={searchTerm}
//               onChange={handleSearchChange}
//             />
//             {searchTerm && (
//               <button
//                 className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
//                 onClick={() => setSearchTerm('')}
//               >
//                 Clear
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Users Table */}
//         {filteredUsers.length > 0 ? (
//           <div className="bg-white rounded-lg shadow overflow-hidden">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead>
//                 <tr className="bg-gray-50">
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {filteredUsers.map((user) => (
//                   <tr key={user.id} className="hover:bg-gray-50">
//                     <td className="px-4 py-4 whitespace-nowrap">
//                       <div className="flex items-center">
//                         <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
//                           <span className="text-sm font-medium text-gray-500">
//                             {user.name ? user.name.charAt(0).toUpperCase() : "U"}
//                           </span>
//                         </div>
//                         <div className="text-sm font-medium text-gray-900">{user.name || "N/A"}</div>
//                       </div>
//                     </td>
//                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || "N/A"}</td>
//                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.username || "N/A"}</td>
//                     <td className="px-4 py-4 whitespace-nowrap">
//                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                         user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
//                       }`}>
//                         {user.role || "user"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-4 whitespace-nowrap">
//                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                         user.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                       }`}>
//                         {user.status || "enabled"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
//                     </td>
//                     <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
//                       <button 
//                         onClick={() => viewUserDetails(user.id)} 
//                         className="text-indigo-600 hover:text-indigo-900 hover:underline mr-4"
//                       >
//                         View
//                       </button>
//                       <a href="#" className="text-gray-600 hover:text-gray-900 hover:underline mr-4">Edit</a>
//                       <button 
//                         className={`${
//                           user.status === 'enabled' 
//                             ? 'text-red-600 hover:text-red-900' 
//                             : 'text-green-600 hover:text-green-900'
//                         } hover:underline ${updating === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
//                         onClick={() => !updating && toggleUserStatus(user.id, user.status)}
//                         disabled={updating === user.id}
//                       >
//                         {updating === user.id 
//                           ? 'Updating...' 
//                           : user.status === 'enabled' 
//                             ? 'Disable' 
//                             : 'Enable'}
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <div className="bg-white p-6 rounded-lg shadow text-center">
//             {searchTerm ? (
//               <p>No users found matching "{searchTerm}"</p>
//             ) : (
//               <p>No users registered in the system</p>
//             )}
//           </div>
//         )}

//         <div className="mt-4 text-gray-500 text-sm">
//           {searchTerm ? 
//             `Found ${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}` : 
//             `Total: ${users.length} ${users.length === 1 ? 'user' : 'users'}`}
//         </div>
//       </div>

//       {/* User Details Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div className="absolute inset-0 bg-black opacity-50" onClick={closeModal}></div>
//           <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto z-50">
//             <div className="sticky top-0 bg-red-700 text-white px-6 py-4 flex justify-between items-center">
//               <h2 className="text-xl font-bold">User Details</h2>
//               <button 
//                 onClick={closeModal}
//                 className="text-white hover:text-gray-200 focus:outline-none"
//               >
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
//                 </svg>
//               </button>
//             </div>
            
//             <div className="p-6">
//               {modalLoading ? (
//                 <div className="flex justify-center py-8">
//                   <div className="text-gray-500">Loading user details...</div>
//                 </div>
//               ) : selectedUser ? (
//                 <div className="space-y-6">
//                   {/* User Summary */}
//                   <div className="flex items-center space-x-4 border-b pb-4">
//                     <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
//                       <span className="text-2xl font-medium text-red-700">
//                         {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
//                       </span>
//                     </div>
//                     <div>
//                       <h3 className="text-xl font-medium">{selectedUser.name || "N/A"}</h3>
//                       <p className="text-gray-500">{selectedUser.email || "N/A"}</p>
//                       <div className="flex space-x-2 mt-2">
//                         <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                           selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
//                         }`}>
//                           {selectedUser.role || "user"}
//                         </span>
//                         <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                           selectedUser.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                         }`}>
//                           {selectedUser.status || "enabled"}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* User Stats */}
//                   <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
//                     <div className="text-center p-3 bg-white rounded-lg shadow-sm">
//                       <p className="text-gray-500 text-sm">Total Posts</p>
//                       <p className="text-2xl font-bold text-red-700">{userPosts}</p>
//                     </div>
//                     <div className="text-center p-3 bg-white rounded-lg shadow-sm">
//                       <p className="text-gray-500 text-sm">Account Age</p>
//                       <p className="text-2xl font-bold text-red-700">
//                         {selectedUser.createdAt ? 
//                           Math.floor((new Date() - new Date(selectedUser.createdAt.seconds * 1000)) / (1000 * 60 * 60 * 24)) + " days" 
//                           : "N/A"}
//                       </p>
//                     </div>
//                   </div>

//                   {/* User Details */}
//                   <div className="border rounded-lg overflow-hidden">
//                     <h4 className="bg-gray-50 px-4 py-2 font-medium border-b">User Information</h4>
//                     <div className="divide-y">
//                       {Object.entries(selectedUser).map(([key, value]) => {
//                         // Skip displaying certain fields or complex objects
//                         if (
//                           key === 'id' || 
//                           typeof value === 'object' ||
//                           typeof value === 'function' ||
//                           key === 'password' ||
//                           key === '_redirectEventId'
//                         ) return null;
                        
//                         return (
//                           <div key={key} className="px-4 py-3 flex justify-between">
//                             <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
//                             <span className="font-medium">
//                               {typeof value === 'boolean' ? String(value) : value || 'N/A'}
//                             </span>
//                           </div>
//                         );
//                       })}
//                       <div className="px-4 py-3 flex justify-between">
//                         <span className="text-gray-500">User ID</span>
//                         <span className="font-medium text-gray-800">{selectedUser.id}</span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Timestamp Information */}
//                   {(selectedUser.createdAt || selectedUser.lastLogin || selectedUser.lastUpdated) && (
//                     <div className="border rounded-lg overflow-hidden">
//                       <h4 className="bg-gray-50 px-4 py-2 font-medium border-b">Timestamps</h4>
//                       <div className="divide-y">
//                         {selectedUser.createdAt && (
//                           <div className="px-4 py-3 flex justify-between">
//                             <span className="text-gray-500">Created At</span>
//                             <span className="font-medium">
//                               {new Date(selectedUser.createdAt.seconds * 1000).toLocaleString()}
//                             </span>
//                           </div>
//                         )}
//                         {selectedUser.lastLogin && (
//                           <div className="px-4 py-3 flex justify-between">
//                             <span className="text-gray-500">Last Login</span>
//                             <span className="font-medium">
//                               {new Date(selectedUser.lastLogin.seconds * 1000).toLocaleString()}
//                             </span>
//                           </div>
//                         )}
//                         {selectedUser.lastUpdated && (
//                           <div className="px-4 py-3 flex justify-between">
//                             <span className="text-gray-500">Last Updated</span>
//                             <span className="font-medium">
//                               {new Date(selectedUser.lastUpdated.seconds * 1000).toLocaleString()}
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-red-500">
//                   User not found or error loading details
//                 </div>
//               )}
//             </div>
            
//             <div className="sticky bottom-0 bg-gray-50 px-6 py-3 flex justify-end border-t">
//               <button
//                 onClick={closeModal}
//                 className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UsersTable;
