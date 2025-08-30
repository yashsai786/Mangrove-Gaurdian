import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';

const ReportedPostsTable = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [moderationStatus, setModerationStatus] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchReportedPosts = async () => {
      try {
        // Query posts collection where reports >= threshold
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('reports', '>=', threshold));
        const postsSnapshot = await getDocs(q);
        
        // Process each post document
        const postPromises = postsSnapshot.docs.map(async (postDoc) => {
          const postData = postDoc.data();
          
          // Get user info if userId exists
          let userName = postData.username || "Anonymous";
          
          if (postData.userId) {
            try {
              const userDocRef = doc(db, 'users', postData.userId);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.userName || 
                           userData.displayName || 
                           userData.name || 
                           userData.username || 
                           postData.username || 
                           "Anonymous";
              }
            } catch (userError) {
              console.error(`Error fetching user with ID ${postData.userId}:`, userError);
            }
          }
          
          return {
            id: postDoc.id,
            ...postData,
            userName
          };
        });
        
        const processedPosts = await Promise.all(postPromises);
        setPosts(processedPosts);
        
        // Initialize moderation status
        const initialStatus = {};
        processedPosts.forEach(post => {
          initialStatus[post.id] = post.hidden || false;
        });
        setModerationStatus(initialStatus);
      } catch (err) {
        console.error("Error fetching reported posts:", err);
        setError("Failed to load reported posts");
      } finally {
        setLoading(false);
      }
    };

    fetchReportedPosts();
  }, [threshold]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return String(timestamp);
    }
  };

  const togglePostVisibility = async (postId, currentStatus) => {
    try {
      // Update moderation status locally first for responsive UI
      setModerationStatus({
        ...moderationStatus,
        [postId]: !currentStatus
      });
      
      // Update the post document in Firestore
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        hidden: !currentStatus
      });
      
      console.log(`Post ${postId} visibility updated to ${!currentStatus ? 'hidden' : 'visible'}`);
    } catch (error) {
      console.error("Error updating post visibility:", error);
      // Revert back if there's an error
      setModerationStatus({
        ...moderationStatus,
        [postId]: currentStatus
      });
      alert("Failed to update post status. Please try again.");
    }
  };

  const resetReportCount = async (postId) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        reports: 0
      });
      
      // Update the local state to reflect changes
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, reports: 0 } : post
      ));
      
      console.log(`Reports reset for post ${postId}`);
    } catch (error) {
      console.error("Error resetting report count:", error);
      alert("Failed to reset report count. Please try again.");
    }
  };

  const filteredPosts = posts.filter(post => 
    post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleThresholdChange = (e) => {
    const value = parseInt(e.target.value);
    setThreshold(value > 0 ? value : 1);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };


  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Component */}
      {/* <Sidebar /> */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-red-600 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Reported Posts</h1>
              <div className="flex space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <div className="flex items-center">
                  <label htmlFor="threshold" className="mr-2 text-gray-700">Report Threshold:</label>
                  <input
                    id="threshold"
                    type="number"
                    min="1"
                    value={threshold}
                    onChange={handleThresholdChange}
                    className="w-16 px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No matching reported posts found" : `No posts with ${threshold} or more reports`}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">User</th>
                      <th className="py-3 px-4 text-left font-semibold">Content</th>
                      <th className="py-3 px-4 text-left font-semibold">Media</th>
                      <th className="py-3 px-4 text-left font-semibold">Reports</th>
                      <th className="py-3 px-4 text-left font-semibold">Date</th>
                      <th className="py-3 px-4 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className={`hover:bg-gray-50 ${moderationStatus[post.id] ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4 font-medium">{post.userName}</td>
                        <td className="py-3 px-4 text-gray-700">
                          <div className="max-w-md truncate">{post.content}</div>
                        </td>
                        <td className="py-3 px-4">
                          {post.mediaUrl && (
                            <a 
                              href={post.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-500 hover:underline"
                            >
                              View Media
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                            {post.reports}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(post.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => togglePostVisibility(post.id, moderationStatus[post.id])}
                              className={`px-3 py-1 rounded font-medium ${
                                moderationStatus[post.id]
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                            >
                              {moderationStatus[post.id] ? "Unhide Post" : "Hide Post"}
                            </button>
                            <button
                              onClick={() => resetReportCount(post.id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200"
                            >
                              Dismiss Reports
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && !error && (
              <div className="mt-6 text-gray-500 text-sm">
                Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} with {threshold} or more reports
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportedPostsTable;