import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';

const FeedbackTable = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        // Query feedbacks collection ordered by timestamp
        const feedbackRef = collection(db, 'feedback');
        const q = query(feedbackRef, orderBy('timestamp', sortOrder));
        const feedbackSnapshot = await getDocs(q);
        
        // Process each feedback document
        const feedbackPromises = feedbackSnapshot.docs.map(async (feedbackDoc) => {
          const feedbackData = feedbackDoc.data();
          
          // Default username
          let userName = feedbackData.userName || "Anonymous User";
          
          if (feedbackData.userId) {
            try {
              // Fetch from the users collection
              const userDocRef = doc(db, 'users', feedbackData.userId);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                // Extract the userName from the user document, checking multiple possible field names
                const userData = userDoc.data();
                
                // Try all possible field names where username might be stored
                userName = userData.username
                console.log(`Found user document for ${feedbackData.userId}:`, userData);
              } else {
                console.log(`No user document found for ID: ${feedbackData.userId}`);
              }
            } catch (userError) {
              console.error(`Error fetching user with ID ${feedbackData.userId}:`, userError);
            }
          }
          
          // Return combined data
          return {
            id: feedbackDoc.id,
            ...feedbackData,
            userName
          };
        });
        
        // Resolve all promises
        const processedFeedbacks = await Promise.all(feedbackPromises);
        setFeedbacks(processedFeedbacks);
      } catch (err) {
        console.error("Error fetching feedback:", err);
        setError("Failed to load feedback data");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [sortOrder]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return String(timestamp);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
  };

  const filteredFeedbacks = feedbacks.filter(feedback => 
    feedback.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (feedback.message && feedback.message.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={`text-${i < rating ? 'yellow' : 'gray'}-400`}>
          ★
        </span>
      );
    }
    return stars;
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
              <h1 className="text-2xl font-bold text-gray-800">Feedbacks Received</h1>
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
                <button 
                  onClick={toggleSortOrder} 
                  className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                  <svg className={`ml-2 w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
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
            ) : filteredFeedbacks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No matching feedbacks found" : "No feedback submissions yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">User</th>
                      <th className="py-3 px-4 text-left font-semibold">Rating</th>
                      <th className="py-3 px-4 text-left font-semibold">Message</th>
                      <th className="py-3 px-4 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFeedbacks.map((feedback) => (
                      <tr key={feedback.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{feedback.userName}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="flex text-yellow-400 mr-2">
                              {renderStars(feedback.rating)}
                            </div>
                            {feedback.ratingText && (
                              <span className="text-gray-600">- {feedback.ratingText}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{feedback.message}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(feedback.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && !error && (
              <div className="mt-6 text-gray-500 text-sm">
                Showing {filteredFeedbacks.length} of {feedbacks.length} feedbacks
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackTable;