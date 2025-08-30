import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from './Sidebar';
import ViewReplyModal from './ViewReplyModal'; // Import the new component

const InquiryTable = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State for reply functionality
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);
  
  // State for viewing replies - simplified to just pass inquiryId
  const [isViewReplyModalOpen, setIsViewReplyModalOpen] = useState(false);
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);

  // API URL - same as in your Register component
  const API_URL = process.env.REACT_APP_API_URL || "https://transgression-vigilance.vercel.app";

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        // Query inquiries collection ordered by timestamp
        const inquiryRef = collection(db, 'inquiries');
        const q = query(inquiryRef, orderBy('timestamp', sortOrder));
        const inquirySnapshot = await getDocs(q);
        
        // Process each inquiry document
        const inquiryPromises = inquirySnapshot.docs.map(async (inquiryDoc) => {
          const inquiryData = inquiryDoc.data();
          
          // Use name from the inquiry document if available
          let userName = inquiryData.name || "Anonymous User";
          
          // If userId is present, try to fetch additional user info
          if (inquiryData.userId) {
            try {
              const userDocRef = doc(db, 'users', inquiryData.userId);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                // Extract the userName from the user document, checking multiple possible field names
                const userData = userDoc.data();
                
                // Use name from inquiry first, then try user document fields
                userName = userData.username; 
                           
                console.log(`Found user document for ${inquiryData.userId}:`, userData);
              } else {
                console.log(`No user document found for ID: ${inquiryData.userId}`);
              }
            } catch (userError) {
              console.error(`Error fetching user with ID ${inquiryData.userId}:`, userError);
            }
          }
          
          // Check if there are any replies for this inquiry
          let replyStatus = inquiryData.replyStatus || "Pending";
          let hasReply = false;
          
          try {
            const repliesRef = collection(db, 'inquiry_replies');
            const repliesQuery = query(repliesRef, where('inquiryId', '==', inquiryDoc.id));
            const repliesSnapshot = await getDocs(repliesQuery);
            
            if (!repliesSnapshot.empty) {
              replyStatus = "Replied";
              hasReply = true;
            }
          } catch (replyError) {
            console.error(`Error checking replies for inquiry ${inquiryDoc.id}:`, replyError);
          }
          
          // Return combined data
          return {
            id: inquiryDoc.id,
            ...inquiryData,
            userName,
            replyStatus,
            hasReply
          };
        });
        
        // Resolve all promises
        const processedInquiries = await Promise.all(inquiryPromises);
        setInquiries(processedInquiries);
      } catch (err) {
        console.error("Error fetching inquiries:", err);
        setError("Failed to load inquiry data");
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
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

  const filteredInquiries = inquiries.filter(inquiry => 
    (inquiry.userName && inquiry.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inquiry.email && inquiry.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inquiry.message && inquiry.message.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Open reply modal for a specific inquiry
  const handleOpenReplyModal = (inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyMessage('');
    setReplyStatus(null);
    setIsReplyModalOpen(true);
  };

  // Close reply modal
  const handleCloseReplyModal = () => {
    setIsReplyModalOpen(false);
    setSelectedInquiry(null);
    setReplyMessage('');
    setReplyStatus(null);
  };
  
  // Open view reply modal with inquiry ID
  const handleViewReply = (inquiry) => {
    console.log("Opening view reply modal for inquiry:", inquiry.id);
    setSelectedInquiryId(inquiry.id);
    setIsViewReplyModalOpen(true);
  };

  // Close view reply modal
  const handleCloseViewReplyModal = () => {
    setIsViewReplyModalOpen(false);
    setSelectedInquiryId(null);
  };

  // Handle sending reply
  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedInquiry) {
      setReplyStatus({
        success: false,
        message: "Reply message cannot be empty"
      });
      return;
    }

    setSendingReply(true);
    setReplyStatus(null);

    try {
      // Create a record of the reply in Firestore
      const replyRef = await addDoc(collection(db, 'inquiry_replies'), {
        inquiryId: selectedInquiry.id,
        replyMessage: replyMessage,
        timestamp: new Date(),
        userId: selectedInquiry.userId || null,
        userEmail: selectedInquiry.email,
        userName: selectedInquiry.userName,
        originalMessage: selectedInquiry.message
      });

      // Update the status in the original inquiry document
      const inquiryRef = doc(db, 'inquiries', selectedInquiry.id);
      await updateDoc(inquiryRef, {
        replyStatus: 'Replied',
        lastReplyId: replyRef.id,
        lastReplyDate: new Date()
      });

      // Send email using your API
      const response = await fetch(`${API_URL}/api/send-inquiry-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedInquiry.email,
          name: selectedInquiry.userName,
          originalMessage: selectedInquiry.message,
          replyMessage: replyMessage
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setReplyStatus({
          success: true,
          message: "Reply sent successfully!"
        });
        
        // Update the local state to reflect the change
        setInquiries(prevInquiries => 
          prevInquiries.map(inquiry => 
            inquiry.id === selectedInquiry.id 
              ? { ...inquiry, replyStatus: 'Replied', hasReply: true }
              : inquiry
          )
        );
        
        // Reset form after successful submission
        setTimeout(() => {
          handleCloseReplyModal();
        }, 2000);
      } else {
        throw new Error(data.message || "Failed to send reply");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      setReplyStatus({
        success: false,
        message: error.message || "Error sending reply. Please try again."
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Force refresh all inquiries
  const refreshInquiries = () => {
    setLoading(true);
    // This will re-run the useEffect with the current sortOrder
    setSortOrder(prevOrder => prevOrder);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Component */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-red-600 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Inquiries Received</h1>
              <div className="flex space-x-4">
                <button 
                  onClick={refreshInquiries}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Refresh
                </button>
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
            ) : filteredInquiries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No matching inquiries found" : "No inquiries submitted yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Name</th>
                      <th className="py-3 px-4 text-left font-semibold">Email</th>
                      <th className="py-3 px-4 text-left font-semibold">Message</th>
                      <th className="py-3 px-4 text-left font-semibold">Date</th>
                      <th className="py-3 px-4 text-left font-semibold">Status</th>
                      <th className="py-3 px-4 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInquiries.map((inquiry) => (
                      <tr key={inquiry.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{inquiry.userName}</td>
                        <td className="py-3 px-4 text-gray-700">{inquiry.email}</td>
                        <td className="py-3 px-4 text-gray-700">{inquiry.message}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(inquiry.timestamp)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            inquiry.replyStatus === 'Replied' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {inquiry.replyStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 flex space-x-2">
                          <button
                            onClick={() => handleOpenReplyModal(inquiry)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                          >
                            Reply
                          </button>
                          {inquiry.hasReply && (
                            <button
                              onClick={() => handleViewReply(inquiry)}
                              className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
                            >
                              View Reply
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && !error && (
              <div className="mt-6 text-gray-500 text-sm">
                Showing {filteredInquiries.length} of {inquiries.length} inquiries
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {isReplyModalOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Reply to Inquiry</h2>
              
              {/* Original inquiry details */}
              <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                <div className="mb-2">
                  <span className="font-semibold">From:</span> {selectedInquiry.userName} ({selectedInquiry.email})
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Date:</span> {formatDate(selectedInquiry.timestamp)}
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Message:</span>
                  <p className="mt-1 text-gray-600">{selectedInquiry.message}</p>
                </div>
              </div>
              
              {/* Reply form */}
              <div className="mb-4">
                <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Reply
                </label>
                <textarea
                  id="replyMessage"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows="6"
                  className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
                  placeholder="Type your reply here..."
                ></textarea>
              </div>
              
              {/* Status message */}
              {replyStatus && (
                <div className={`mb-4 p-2 rounded ${replyStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {replyStatus.message}
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseReplyModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  disabled={sendingReply}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:bg-red-300"
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Use the new ViewReplyModal component */}
      <ViewReplyModal 
        isOpen={isViewReplyModalOpen}
        onClose={handleCloseViewReplyModal}
        inquiryId={selectedInquiryId}
      />
    </div>
  );
};

export default InquiryTable;


// import { useEffect, useState } from 'react';
// import { collection, query, orderBy, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
// import { db } from '../config/firebase';
// import Sidebar from './Sidebar';

// const InquiryTable = () => {
//   const [inquiries, setInquiries] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [sortOrder, setSortOrder] = useState('desc');
//   const [sidebarOpen, setSidebarOpen] = useState(true);
  
//   // State for reply functionality
//   const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
//   const [selectedInquiry, setSelectedInquiry] = useState(null);
//   const [replyMessage, setReplyMessage] = useState('');
//   const [sendingReply, setSendingReply] = useState(false);
//   const [replyStatus, setReplyStatus] = useState(null);

//   // API URL - same as in your Register component
//   const API_URL = process.env.REACT_APP_API_URL || "https://transgression-vigilance.vercel.app";

//   useEffect(() => {
//     const fetchInquiries = async () => {
//       try {
//         // Query inquiries collection ordered by timestamp
//         const inquiryRef = collection(db, 'inquiries');
//         const q = query(inquiryRef, orderBy('timestamp', sortOrder));
//         const inquirySnapshot = await getDocs(q);
        
//         // Process each inquiry document
//         const inquiryPromises = inquirySnapshot.docs.map(async (inquiryDoc) => {
//           const inquiryData = inquiryDoc.data();
          
//           // Use name from the inquiry document if available
//           let userName = inquiryData.name || "Anonymous User";
          
//           // If userId is present, try to fetch additional user info
//           if (inquiryData.userId) {
//             try {
//               const userDocRef = doc(db, 'users', inquiryData.userId);
//               const userDoc = await getDoc(userDocRef);
              
//               if (userDoc.exists()) {
//                 // Extract the userName from the user document, checking multiple possible field names
//                 const userData = userDoc.data();
                
//                 // Use name from inquiry first, then try user document fields
//                 userName = userData.username; 
                           
//                 console.log(`Found user document for ${inquiryData.userId}:`, userData);
//               } else {
//                 console.log(`No user document found for ID: ${inquiryData.userId}`);
//               }
//             } catch (userError) {
//               console.error(`Error fetching user with ID ${inquiryData.userId}:`, userError);
//             }
//           }
          
//           // Return combined data
//           return {
//             id: inquiryDoc.id,
//             ...inquiryData,
//             userName
//           };
//         });
        
//         // Resolve all promises
//         const processedInquiries = await Promise.all(inquiryPromises);
//         setInquiries(processedInquiries);
//       } catch (err) {
//         console.error("Error fetching inquiries:", err);
//         setError("Failed to load inquiry data");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInquiries();
//   }, [sortOrder]);

//   const formatDate = (timestamp) => {
//     if (!timestamp) return "Unknown date";
    
//     try {
//       const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
//       return date.toLocaleString();
//     } catch (e) {
//       return String(timestamp);
//     }
//   };

//   const toggleSortOrder = () => {
//     setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
//   };

//   const filteredInquiries = inquiries.filter(inquiry => 
//     (inquiry.userName && inquiry.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
//     (inquiry.email && inquiry.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
//     (inquiry.message && inquiry.message.toLowerCase().includes(searchTerm.toLowerCase()))
//   );

//   const toggleSidebar = () => {
//     setSidebarOpen(!sidebarOpen);
//   };

//   // Open reply modal for a specific inquiry
//   const handleOpenReplyModal = (inquiry) => {
//     setSelectedInquiry(inquiry);
//     setReplyMessage('');
//     setReplyStatus(null);
//     setIsReplyModalOpen(true);
//   };

//   // Close reply modal
//   const handleCloseReplyModal = () => {
//     setIsReplyModalOpen(false);
//     setSelectedInquiry(null);
//     setReplyMessage('');
//     setReplyStatus(null);
//   };

//   // Handle sending reply
//   const handleSendReply = async () => {
//     if (!replyMessage.trim() || !selectedInquiry) {
//       setReplyStatus({
//         success: false,
//         message: "Reply message cannot be empty"
//       });
//       return;
//     }

//     setSendingReply(true);
//     setReplyStatus(null);

//     try {
//       // Create a record of the reply in Firestore
//       await addDoc(collection(db, 'inquiry_replies'), {
//         inquiryId: selectedInquiry.id,
//         replyMessage: replyMessage,
//         timestamp: new Date(),
//         userId: selectedInquiry.userId || null,
//         userEmail: selectedInquiry.email,
//         userName: selectedInquiry.userName,
//         originalMessage: selectedInquiry.message
//       });

//       // Send email using your API
//       const response = await fetch(`${API_URL}/api/send-inquiry-reply`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email: selectedInquiry.email,
//           name: selectedInquiry.userName,
//           originalMessage: selectedInquiry.message,
//           replyMessage: replyMessage
//         }),
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         setReplyStatus({
//           success: true,
//           message: "Reply sent successfully!"
//         });
        
//         // Reset form after successful submission
//         setTimeout(() => {
//           handleCloseReplyModal();
//         }, 2000);
//       } else {
//         throw new Error(data.message || "Failed to send reply");
//       }
//     } catch (error) {
//       console.error("Error sending reply:", error);
//       setReplyStatus({
//         success: false,
//         message: error.message || "Error sending reply. Please try again."
//       });
//     } finally {
//       setSendingReply(false);
//     }
//   };

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Sidebar Component */}
//       <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-red-600 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
//         <Sidebar />
//       </div>
      
//       {/* Main Content */}
//       <div className="flex-1 overflow-auto">
//         <div className="p-6">
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <div className="flex justify-between items-center mb-6">
//               <h1 className="text-2xl font-bold text-gray-800">Inquiries Received</h1>
//               <div className="flex space-x-4">
//                 <div className="relative">
//                   <input
//                     type="text"
//                     placeholder="Search..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                   <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
//                     <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
//                   </svg>
//                 </div>
//                 <button 
//                   onClick={toggleSortOrder} 
//                   className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
//                 >
//                   {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
//                   <svg className={`ml-2 w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
//                   </svg>
//                 </button>
//               </div>
//             </div>
            
//             {loading ? (
//               <div className="flex justify-center items-center h-64">
//                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//               </div>
//             ) : error ? (
//               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//                 {error}
//               </div>
//             ) : filteredInquiries.length === 0 ? (
//               <div className="text-center py-8 text-gray-500">
//                 {searchTerm ? "No matching inquiries found" : "No inquiries submitted yet"}
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <table className="min-w-full bg-white rounded-lg overflow-hidden">
//                   <thead className="bg-gray-100 text-gray-700">
//                     <tr>
//                       <th className="py-3 px-4 text-left font-semibold">Name</th>
//                       <th className="py-3 px-4 text-left font-semibold">Email</th>
//                       <th className="py-3 px-4 text-left font-semibold">Message</th>
//                       <th className="py-3 px-4 text-left font-semibold">Date</th>
//                       <th className="py-3 px-4 text-left font-semibold">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200">
//                     {filteredInquiries.map((inquiry) => (
//                       <tr key={inquiry.id} className="hover:bg-gray-50">
//                         <td className="py-3 px-4 font-medium">{inquiry.userName}</td>
//                         <td className="py-3 px-4 text-gray-700">{inquiry.email}</td>
//                         <td className="py-3 px-4 text-gray-700">{inquiry.message}</td>
//                         <td className="py-3 px-4 text-gray-600">{formatDate(inquiry.timestamp)}</td>
//                         <td className="py-3 px-4">
//                           <button
//                             onClick={() => handleOpenReplyModal(inquiry)}
//                             className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
//                           >
//                             Reply
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
            
//             {!loading && !error && (
//               <div className="mt-6 text-gray-500 text-sm">
//                 Showing {filteredInquiries.length} of {inquiries.length} inquiries
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Reply Modal */}
//       {isReplyModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
//             <div className="p-6">
//               <h2 className="text-xl font-bold text-gray-800 mb-4">Reply to Inquiry</h2>
              
//               {/* Original inquiry details */}
//               <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
//                 <div className="mb-2">
//                   <span className="font-semibold">From:</span> {selectedInquiry.userName} ({selectedInquiry.email})
//                 </div>
//                 <div className="mb-2">
//                   <span className="font-semibold">Date:</span> {formatDate(selectedInquiry.timestamp)}
//                 </div>
//                 <div className="mb-2">
//                   <span className="font-semibold">Message:</span>
//                   <p className="mt-1 text-gray-600">{selectedInquiry.message}</p>
//                 </div>
//               </div>
              
//               {/* Reply form */}
//               <div className="mb-4">
//                 <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-1">
//                   Your Reply
//                 </label>
//                 <textarea
//                   id="replyMessage"
//                   value={replyMessage}
//                   onChange={(e) => setReplyMessage(e.target.value)}
//                   rows="6"
//                   className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
//                   placeholder="Type your reply here..."
//                 ></textarea>
//               </div>
              
//               {/* Status message */}
//               {replyStatus && (
//                 <div className={`mb-4 p-2 rounded ${replyStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
//                   {replyStatus.message}
//                 </div>
//               )}
              
//               {/* Action buttons */}
//               <div className="flex justify-end space-x-3">
//                 <button
//                   onClick={handleCloseReplyModal}
//                   className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
//                   disabled={sendingReply}
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleSendReply}
//                   disabled={sendingReply || !replyMessage.trim()}
//                   className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:bg-red-300"
//                 >
//                   {sendingReply ? 'Sending...' : 'Send Reply'}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InquiryTable;

// // import { useEffect, useState } from 'react';
// // import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
// // import { db } from '../config/firebase';
// // import Sidebar from './Sidebar';
// // // import Layout from './Layout';

// // const InquiryTable = () => {
// //   const [inquiries, setInquiries] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [searchTerm, setSearchTerm] = useState('');
// //   const [sortOrder, setSortOrder] = useState('desc');
// //   const [sidebarOpen, setSidebarOpen] = useState(true);

// //   useEffect(() => {
// //     const fetchInquiries = async () => {
// //       try {
// //         // Query inquiries collection ordered by timestamp
// //         const inquiryRef = collection(db, 'inquiries');
// //         const q = query(inquiryRef, orderBy('timestamp', sortOrder));
// //         const inquirySnapshot = await getDocs(q);
        
// //         // Process each inquiry document
// //         const inquiryPromises = inquirySnapshot.docs.map(async (inquiryDoc) => {
// //           const inquiryData = inquiryDoc.data();
          
// //           // Use name from the inquiry document if available
// //           let userName = inquiryData.name || "Anonymous User";
          
// //           // If userId is present, try to fetch additional user info
// //           if (inquiryData.userId) {
// //             try {
// //               const userDocRef = doc(db, 'users', inquiryData.userId);
// //               const userDoc = await getDoc(userDocRef);
              
// //               if (userDoc.exists()) {
// //                 // Extract the userName from the user document, checking multiple possible field names
// //                 const userData = userDoc.data();
                
// //                 // Use name from inquiry first, then try user document fields
// //                 userName =  userData.username; 
                           
// //                 console.log(`Found user document for ${inquiryData.userId}:`, userData);
// //               } else {
// //                 console.log(`No user document found for ID: ${inquiryData.userId}`);
// //               }
// //             } catch (userError) {
// //               console.error(`Error fetching user with ID ${inquiryData.userId}:`, userError);
// //             }
// //           }
          
// //           // Return combined data
// //           return {
// //             id: inquiryDoc.id,
// //             ...inquiryData,
// //             userName
// //           };
// //         });
        
// //         // Resolve all promises
// //         const processedInquiries = await Promise.all(inquiryPromises);
// //         setInquiries(processedInquiries);
// //       } catch (err) {
// //         console.error("Error fetching inquiries:", err);
// //         setError("Failed to load inquiry data");
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchInquiries();
// //   }, [sortOrder]);

// //   const formatDate = (timestamp) => {
// //     if (!timestamp) return "Unknown date";
    
// //     try {
// //       const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
// //       return date.toLocaleString();
// //     } catch (e) {
// //       return String(timestamp);
// //     }
// //   };

// //   const toggleSortOrder = () => {
// //     setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
// //   };

// //   const filteredInquiries = inquiries.filter(inquiry => 
// //     (inquiry.userName && inquiry.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
// //     (inquiry.email && inquiry.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
// //     (inquiry.message && inquiry.message.toLowerCase().includes(searchTerm.toLowerCase()))
// //   );

// //   const toggleSidebar = () => {
// //     setSidebarOpen(!sidebarOpen);
// //   };

// //   return (
// //     <div className="flex h-screen bg-gray-100">
// //       {/* Sidebar Component */}
// //       {/* <Sidebar /> */}
// //       <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-red-600 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
// //         <Sidebar />
// //       </div>
      
// //       {/* Main Content */}
// //       <div className="flex-1 overflow-auto">
// //         <div className="p-6">
// //           <div className="bg-white rounded-lg shadow-md p-6">
// //             <div className="flex justify-between items-center mb-6">
// //               <h1 className="text-2xl font-bold text-gray-800">Inquiries Received</h1>
// //               <div className="flex space-x-4">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     placeholder="Search..."
// //                     value={searchTerm}
// //                     onChange={(e) => setSearchTerm(e.target.value)}
// //                     className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
// //                   />
// //                   <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
// //                     <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
// //                   </svg>
// //                 </div>
// //                 <button 
// //                   onClick={toggleSortOrder} 
// //                   className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
// //                 >
// //                   {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
// //                   <svg className={`ml-2 w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
// //                   </svg>
// //                 </button>
// //               </div>
// //             </div>
            
// //             {loading ? (
// //               <div className="flex justify-center items-center h-64">
// //                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
// //               </div>
// //             ) : error ? (
// //               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
// //                 {error}
// //               </div>
// //             ) : filteredInquiries.length === 0 ? (
// //               <div className="text-center py-8 text-gray-500">
// //                 {searchTerm ? "No matching inquiries found" : "No inquiries submitted yet"}
// //               </div>
// //             ) : (
// //               <div className="overflow-x-auto">
// //                 <table className="min-w-full bg-white rounded-lg overflow-hidden">
// //                   <thead className="bg-gray-100 text-gray-700">
// //                     <tr>
// //                       <th className="py-3 px-4 text-left font-semibold">Name</th>
// //                       <th className="py-3 px-4 text-left font-semibold">Email</th>
// //                       <th className="py-3 px-4 text-left font-semibold">Message</th>
// //                       <th className="py-3 px-4 text-left font-semibold">Date</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody className="divide-y divide-gray-200">
// //                     {filteredInquiries.map((inquiry) => (
// //                       <tr key={inquiry.id} className="hover:bg-gray-50">
// //                         <td className="py-3 px-4 font-medium">{inquiry.userName}</td>
// //                         <td className="py-3 px-4 text-gray-700">{inquiry.email}</td>
// //                         <td className="py-3 px-4 text-gray-700">{inquiry.message}</td>
// //                         <td className="py-3 px-4 text-gray-600">{formatDate(inquiry.timestamp)}</td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             )}
            
// //             {!loading && !error && (
// //               <div className="mt-6 text-gray-500 text-sm">
// //                 Showing {filteredInquiries.length} of {inquiries.length} inquiries
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default InquiryTable;
