import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, documentId, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';

const PostsTable = () => {
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionType, setInteractionType] = useState(null);
  const [interactionUsers, setInteractionUsers] = useState([]);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    // Use a separate function to allow async/await
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // Create a worker thread for heavy operations
        if (window.Worker) {
          // Fetch posts data
          const postsCollection = collection(db, 'posts');
          const postSnapshot = await getDocs(postsCollection);
          const postsList = postSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Get unique user IDs from posts
          const userIds = [...new Set(postsList.filter(post => post.userId).map(post => post.userId))];
          
          // Batch fetch user data
          const usersData = {};
          if (userIds.length > 0) {
            // Process in chunks of 10 to avoid Firestore limitations
            const chunkSize = 10;
            for (let i = 0; i < userIds.length; i += chunkSize) {
              const chunk = userIds.slice(i, i + chunkSize);
              const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
              const userSnapshot = await getDocs(usersQuery);
              
              userSnapshot.forEach(doc => {
                usersData[doc.id] = { id: doc.id, ...doc.data() };
              });
            }
          }
          
          // Combine posts with user data
          const enhancedPosts = postsList.map(post => {
            const userData = post.userId ? usersData[post.userId] : null;
            return {
              ...post,
              username: userData?.username || post.username || "Anonymous",
              userEmail: userData?.email || "N/A",
              userProfilePic: userData?.profilePic || null,
              userName: userData?.name || "Anonymous"
            };
          });
          
          setPosts(enhancedPosts);
        } else {
          // Fallback for browsers without Worker support
          const postsCollection = collection(db, 'posts');
          const postSnapshot = await getDocs(postsCollection);
          const postsList = postSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setPosts(postsList);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posts: ', err);
        setError('Failed to load posts. Please try again.');
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Filter posts based on search term
  const filteredPosts = posts.filter(post => {
    const searchValue = searchTerm.toLowerCase();
    return (
      (post.username && post.username.toLowerCase().includes(searchValue)) ||
      (post.pincode && post.pincode.toString().includes(searchValue)) ||
      (post.id && post.id.toLowerCase().includes(searchValue)) ||
      (post.content && post.content.toLowerCase().includes(searchValue)) ||
      (post.userName && post.userName.toLowerCase().includes(searchValue))
    );
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const viewPostDetails = async (postId) => {
    try {
      setModalLoading(true);
      setShowModal(true);
      
      // Get post data
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = {
          id: postSnap.id,
          ...postSnap.data()
        };
        
        // Get user data if userId exists
        if (postData.userId) {
          try {
            const userRef = doc(db, 'users', postData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              postData.userData = userSnap.data();
              postData.userData.id = userSnap.id;
            }
          } catch (err) {
            console.error('Error fetching user data: ', err);
          }
        }
        
        setSelectedPost(postData);
      } else {
        setError("Post not found");
      }
      
      setModalLoading(false);
    } catch (err) {
      console.error('Error fetching post details: ', err);
      setError("Failed to load post details");
      setModalLoading(false);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      setDeleteSuccess(null);
      
      // Get the post data first
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error("Post not found");
      }
      
      const postData = postSnap.data();
      
      // Add post to deletedPosts collection with timestamp
      const deletedPostsCollection = collection(db, 'deletedPosts');
      await addDoc(deletedPostsCollection, {
        ...postData,
        originalId: postId,
        deletedAt: serverTimestamp(),
        deletedBy: "admin" // You might want to store the admin user ID here
      });
      
      // Delete the post from posts collection
      await deleteDoc(postRef);
      
      setDeleteSuccess("Post has been moved to deleted posts and removed successfully.");
      
      // Remove the post from state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      
      // Close modal if open
      if (showModal && selectedPost?.id === postId) {
        closeModal();
      }
      
      setDeleteLoading(false);
    } catch (err) {
      console.error('Error deleting post: ', err);
      setDeleteError(`Failed to delete post: ${err.message}`);
      setDeleteLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPost(null);
  };

  const closeInteractionModal = () => {
    setShowInteractionModal(false);
    setInteractionUsers([]);
    setInteractionType(null);
  };

  const showInteractions = async (type, postId) => {
    try {
      setInteractionLoading(true);
      setInteractionType(type);
      setShowInteractionModal(true);
      
      // Collection name based on interaction type
      const collectionName = type === 'upvotes' ? 'upvotes' : type === 'downvotes' ? 'downvotes' : 'reports';
      
      // Get all documents where the postId matches
      const interactionsCollection = collection(db, collectionName);
      const q = query(interactionsCollection, where("postId", "==", postId));
      const interactionSnapshot = await getDocs(q);
      
      // Extract user IDs and compile a list
      const userInteractions = interactionSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const userIds = userInteractions.map(interaction => interaction.userId).filter(Boolean);
      
      // Batch fetch user data
      const usersData = {};
      if (userIds.length > 0) {
        // Process in chunks to avoid Firestore limitations
        const chunkSize = 10;
        for (let i = 0; i < userIds.length; i += chunkSize) {
          const chunk = userIds.slice(i, i + chunkSize);
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const userSnapshot = await getDocs(usersQuery);
          
          userSnapshot.forEach(doc => {
            usersData[doc.id] = { id: doc.id, ...doc.data() };
          });
        }
      }
      
      // Combine interaction data with user data
      const enhancedInteractions = userInteractions.map(interaction => {
        const userData = interaction.userId ? usersData[interaction.userId] : null;
        return {
          ...interaction,
          userData: userData ? {
            id: userData.id,
            name: userData.name || "Anonymous",
            username: userData.username || "Anonymous",
            email: userData.email || "N/A",
            profilePic: userData.profilePic || null
          } : {
            username: "Unknown User",
            email: "N/A",
            name: "Unknown User",
            profilePic: null
          }
        };
      });
      
      setInteractionUsers(enhancedInteractions);
      setInteractionLoading(false);
    } catch (err) {
      console.error(`Error fetching ${type} data:`, err);
      setError(`Failed to load ${type} data`);
      setInteractionLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  if (loading) return (
    <div className="flex">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1 flex justify-center items-center h-screen">
        <div className="text-lg">Loading posts...</div>
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
          <h1 className="text-2xl font-bold mb-4">View Posts</h1>
          
          {deleteSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
              <span>{deleteSuccess}</span>
              <button onClick={() => setDeleteSuccess(null)} className="text-green-700 hover:text-green-900">×</button>
            </div>
          )}
          
          {deleteError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
              <span>{deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="text-red-700 hover:text-red-900">×</button>
            </div>
          )}
          
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by username, name, pincode, post ID or content..."
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

        {/* Posts Table */}
        {filteredPosts.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pincode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                          {post.userProfilePic ? (
                            <img 
                              src={post.userProfilePic} 
                              alt={post.username || "User"} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-500">
                              {getInitials(post.username)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{post.username || "Anonymous"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="line-clamp-2">{post.content || "N/A"}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{post.pincode || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          👍 {post.upvotes || 0}
                        </span>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          👎 {post.downvotes || 0}
                        </span>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          🚩 {post.reports || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.createdAt ? formatDate(post.createdAt) : "N/A"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => viewPostDetails(post.id)} 
                          className="text-indigo-600 hover:text-indigo-900 hover:underline"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => deletePost(post.id)} 
                          className="text-red-600 hover:text-red-900 hover:underline"
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            {searchTerm ? (
              <p>No posts found matching "{searchTerm}"</p>
            ) : (
              <p>No posts available in the system</p>
            )}
          </div>
        )}

        <div className="mt-4 text-gray-500 text-sm">
          {searchTerm ? 
            `Found ${filteredPosts.length} ${filteredPosts.length === 1 ? 'post' : 'posts'}` : 
            `Total: ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}
        </div>
      </div>

      {/* Post Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto z-50">
            <div className="sticky top-0 bg-red-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Post Details</h2>
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
                  <div className="text-gray-500">Loading post details...</div>
                </div>
              ) : selectedPost ? (
                <div className="space-y-6">
                  {/* Post Author */}
                  <div className="flex items-center space-x-4 border-b pb-4">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center overflow-hidden">
                      {selectedPost.userData && selectedPost.userData.profilePic ? (
                        <img 
                          src={selectedPost.userData.profilePic} 
                          alt={selectedPost.userData.username || "User"} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-medium text-red-700">
                          {selectedPost.userData ? getInitials(selectedPost.userData.username) : "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">
                        {selectedPost.userData ? selectedPost.userData.username || "Anonymous" : selectedPost.username || "Anonymous"}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {selectedPost.userData ? selectedPost.userData.email || "N/A" : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedPost.content || "No content"}</p>
                    
                    {/* Post Image */}
                    {selectedPost.mediaUrl && (
                      <div className="mt-4">
                        <img 
                          src={selectedPost.mediaUrl} 
                          alt="Post media" 
                          className="max-h-96 rounded-lg mx-auto"
                        />
                      </div>
                    )}
                    
                    <div className="mt-4 text-sm text-gray-500">
                      Posted on: {selectedPost.createdAt ? formatDate(selectedPost.createdAt) : "N/A"}
                    </div>
                  </div>

                  {/* Post Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => showInteractions('upvotes', selectedPost.id)}
                      className="text-center p-3 bg-green-50 rounded-lg shadow-sm hover:bg-green-100 transition duration-150"
                    >
                      <p className="text-gray-700 font-medium">Upvotes</p>
                      <p className="text-2xl font-bold text-green-600">{selectedPost.upvotes || 0}</p>
                    </button>
                    <button
                      onClick={() => showInteractions('downvotes', selectedPost.id)}
                      className="text-center p-3 bg-red-50 rounded-lg shadow-sm hover:bg-red-100 transition duration-150"
                    >
                      <p className="text-gray-700 font-medium">Downvotes</p>
                      <p className="text-2xl font-bold text-red-600">{selectedPost.downvotes || 0}</p>
                    </button>
                    <button
                      onClick={() => showInteractions('reports', selectedPost.id)}
                      className="text-center p-3 bg-yellow-50 rounded-lg shadow-sm hover:bg-yellow-100 transition duration-150"
                    >
                      <p className="text-gray-700 font-medium">Reports</p>
                      <p className="text-2xl font-bold text-yellow-600">{selectedPost.reports || 0}</p>
                    </button>
                  </div>

                  {/* Post Details */}
                  <div className="border rounded-lg overflow-hidden">
                    <h4 className="bg-gray-50 px-4 py-2 font-medium border-b">Post Information</h4>
                    <div className="divide-y">
                      <div className="px-4 py-3 flex justify-between">
                        <span className="text-gray-500">Post ID</span>
                        <span className="font-medium text-gray-800">{selectedPost.id}</span>
                      </div>
                      <div className="px-4 py-3 flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="font-medium">
                          {selectedPost.location ? selectedPost.location : "N/A"}
                          {selectedPost.pincode ? ` (${selectedPost.pincode})` : ""}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex justify-between">
                        <span className="text-gray-500">Shares</span>
                        <span className="font-medium">{selectedPost.shares || 0}</span>
                      </div>
                      <div className="px-4 py-3 flex justify-between">
                        <span className="text-gray-500">Comments</span>
                        <span className="font-medium">{selectedPost.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">
                  Post not found or error loading details
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-3 flex justify-between border-t">
              {selectedPost && (
                <button
                  onClick={() => deletePost(selectedPost.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Post'}
                </button>
              )}
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

      {/* Interaction Users Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closeInteractionModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full max-h-screen overflow-y-auto z-50">
            <div className="sticky top-0 bg-red-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {interactionType === 'upvotes' ? 'Users Who Upvoted' : 
                 interactionType === 'downvotes' ? 'Users Who Downvoted' : 
                 'Users Who Reported'}
              </h2>
              <button 
                onClick={closeInteractionModal}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {interactionLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading user data...</div>
                </div>
              ) : interactionUsers.length > 0 ? (
                <div className="space-y-4">
                  {interactionUsers.map((interaction) => (
                    <div key={interaction.id} className="flex items-center p-3 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mr-4 overflow-hidden">
                        {interaction.userData.profilePic ? (
                          <img 
                            src={interaction.userData.profilePic} 
                            alt={interaction.userData.username} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-medium text-gray-500">
                            {getInitials(interaction.userData.username)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{interaction.userData.username || "Anonymous"}</h4>
                        <p className="text-xs text-gray-400">{interaction.userData.email || "N/A"}</p>
                      </div>
                      {interactionType === 'reports' && interaction.reason && (
                        <div className="ml-4 px-3 py-1 bg-yellow-50 text-yellow-800 text-sm rounded-full">
                          {interaction.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-6 py-3 flex justify-end border-t">
              <button
                onClick={closeInteractionModal}
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

export default PostsTable;