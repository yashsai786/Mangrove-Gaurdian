import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ViewReplyModal = ({ isOpen, onClose, inquiryId }) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState({});

  useEffect(() => {
    // Only fetch data if the modal is open and we have an inquiryId
    if (isOpen && inquiryId) {
      fetchReplies();
    }
  }, [isOpen, inquiryId]);

  const fetchReplies = async () => {
    if (!inquiryId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching replies for inquiry ID:", inquiryId);
      
      // First, verify the inquiry exists
      const inquiryRef = doc(db, 'inquiries', inquiryId);
      const inquirySnap = await getDoc(inquiryRef);
      
      if (!inquirySnap.exists()) {
        console.error("Inquiry not found!");
        setDebug(prev => ({ ...prev, inquiryExists: false }));
        throw new Error("Inquiry not found");
      }
      
      setDebug(prev => ({ ...prev, inquiryExists: true, inquiryData: inquirySnap.data() }));
      
      // SOLUTION 1: Try to directly get the document with ID that might match the inquiry ID
      // This assumes the document ID in inquiry_replies might be the same as inquiryId
      try {
        const directReplyRef = doc(db, 'inquiry_replies', inquiryId);
        const directReplySnap = await getDoc(directReplyRef);
        
        if (directReplySnap.exists()) {
          console.log("Found reply by direct ID match");
          const replyData = {
            id: directReplySnap.id,
            ...directReplySnap.data()
          };
          setReplies([replyData]);
          setLoading(false);
          return;
        }
      } catch (directError) {
        console.log("Direct document fetch attempt failed, continuing with query...");
      }
      
      // SOLUTION 2: Query with exact match (original approach)
      const repliesRef = collection(db, 'inquiry_replies');
      const repliesQuery = query(
        repliesRef, 
        where('inquiryId', '==', inquiryId),
        orderBy('timestamp', 'desc')
      );
      
      const repliesSnapshot = await getDocs(repliesQuery);
      
      // Store debug info
      setDebug(prev => ({ 
        ...prev, 
        repliesQuery: { 
          path: repliesRef.path,
          constraints: `where inquiryId == ${inquiryId}, orderBy timestamp desc`
        },
        repliesCount: repliesSnapshot.size,
        repliesEmpty: repliesSnapshot.empty
      }));

      // If no replies found with the exact match approach, try alternatives
      if (repliesSnapshot.empty) {
        console.log("No replies found with exact match. Trying alternative queries...");
        
        // SOLUTION 3: Try query with different field names that might contain the inquiry ID
        const alternativeFieldsQuery = query(
          repliesRef,
          where('inquiry_id', '==', inquiryId)
        );
        
        const alternativeFieldsSnapshot = await getDocs(alternativeFieldsQuery);
        
        if (!alternativeFieldsSnapshot.empty) {
          console.log(`Found ${alternativeFieldsSnapshot.size} replies with alternative field name`);
          const repliesData = alternativeFieldsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReplies(repliesData);
          setLoading(false);
          return;
        }
        
        // SOLUTION 4: Get all replies and filter manually (fallback)
        console.log("Trying fallback approach - retrieving all replies...");
        
        const allRepliesQuery = query(
          repliesRef,
          orderBy('timestamp', 'desc')
        );
        
        const allRepliesSnapshot = await getDocs(allRepliesQuery);
        console.log(`Found ${allRepliesSnapshot.size} total replies in the collection`);
        
        // Collect all document data for debugging
        const allRepliesData = allRepliesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDebug(prev => ({ 
          ...prev, 
          totalRepliesInCollection: allRepliesSnapshot.size,
          sampleReplies: allRepliesData.slice(0, 3) // Store first 3 for debugging
        }));
        
        // Filter with very loose matching to catch any potential matches
        const filteredReplies = allRepliesData.filter(reply => {
          // Check all properties for potential matches with inquiryId
          return Object.entries(reply).some(([key, value]) => {
            if (typeof value === 'string' && value === inquiryId) {
              console.log(`Found match in field: ${key}`);
              return true;
            }
            if (value && typeof value === 'object') {
              const stringified = JSON.stringify(value);
              if (stringified.includes(inquiryId)) {
                console.log(`Found match in object field: ${key}`);
                return true;
              }
            }
            return false;
          });
        });
        
        setDebug(prev => ({ 
          ...prev, 
          manuallyFilteredReplies: filteredReplies.length,
          filteredRepliesData: filteredReplies
        }));
        
        if (filteredReplies.length > 0) {
          console.log(`Found ${filteredReplies.length} replies through manual filtering`);
          setReplies(filteredReplies);
        } else {
          console.log("No replies found with any approach");
          setReplies([]);
        }
      } else {
        // Normal case - replies found with original query
        console.log(`Found ${repliesSnapshot.size} replies with exact match query`);
        
        const repliesData = repliesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setReplies(repliesData);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
      setError("Failed to load reply data. Please try again.");
      setDebug(prev => ({ 
        ...prev, 
        error: error.toString(), 
        stack: error.stack,
        inquiryIdType: typeof inquiryId,
        inquiryIdValue: inquiryId 
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return String(timestamp);
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Reply History</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Failed to load reply data. Please try again.</p>
              <p className="text-sm">If this issue persists, please contact support.</p>
              
              {/* Debug button for admin users */}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-semibold">Technical Details</summary>
                <div className="mt-2 p-2 bg-red-50 rounded overflow-auto max-h-40">
                  <pre>{JSON.stringify(debug, null, 2)}</pre>
                </div>
              </details>
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No replies found for this inquiry.
              
              {/* Debug info for dev/admin */}
              <details className="mt-4 text-sm border-t pt-4">
                <summary className="cursor-pointer font-semibold">Debug Information</summary>
                <div className="mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-40">
                  <p>Inquiry ID: {inquiryId}</p>
                  <pre>{JSON.stringify(debug, null, 2)}</pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {replies.map((reply) => (
                <div key={reply.id} className="mb-4 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="mb-2">
                    <span className="font-semibold">Sent to:</span> {reply.userName || reply.name || "User"} ({reply.userEmail || reply.email || "No email"})
                  </div>
                  
                  <div className="mb-2">
                    <span className="font-semibold">Original Message:</span>
                    <p className="mt-1 text-gray-600">{reply.originalMessage || "No original message available"}</p>
                  </div>
                  
                  <div className="mb-2">
                    <span className="font-semibold">Reply Sent:</span> {formatDate(reply.timestamp)}
                  </div>
                  
                  <div>
                    <span className="font-semibold">Reply Message:</span>
                    <p className="mt-1 text-gray-800 whitespace-pre-line">{reply.replyMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReplyModal;



// import { useState, useEffect } from 'react';
// import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
// import { db } from '../config/firebase';

// const ViewReplyModal = ({ isOpen, onClose, inquiryId }) => {
//   const [replies, setReplies] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [debug, setDebug] = useState({});

//   useEffect(() => {
//     // Only fetch data if the modal is open and we have an inquiryId
//     if (isOpen && inquiryId) {
//       fetchReplies();
//     }
//   }, [isOpen, inquiryId]);

//   const fetchReplies = async () => {
//     if (!inquiryId) return;
    
//     setLoading(true);
//     setError(null);
    
//     try {
//       console.log("Fetching replies for inquiry ID:", inquiryId);
      
//       // First, verify the inquiry exists
//       const inquiryRef = doc(db, 'inquiries', inquiryId);
//       const inquirySnap = await getDoc(inquiryRef);
      
//       if (!inquirySnap.exists()) {
//         console.error("Inquiry not found!");
//         setDebug(prev => ({ ...prev, inquiryExists: false }));
//         throw new Error("Inquiry not found");
//       }
      
//       setDebug(prev => ({ ...prev, inquiryExists: true, inquiryData: inquirySnap.data() }));
      
//       // Query the inquiry_replies collection - check for exact match with inquiryId
//       const repliesRef = collection(db, 'inquiry_replies');
//       const repliesQuery = query(
//         repliesRef, 
//         where('inquiryId', '==', inquiryId),
//         orderBy('timestamp', 'desc')
//       );
      
//       // Get replies 
//       const repliesSnapshot = await getDocs(repliesQuery);
      
//       setDebug(prev => ({ 
//         ...prev, 
//         repliesQuery: { 
//           path: repliesRef.path,
//           constraints: `where inquiryId == ${inquiryId}, orderBy timestamp desc`
//         },
//         repliesCount: repliesSnapshot.size,
//         repliesEmpty: repliesSnapshot.empty
//       }));

//       // If no replies found with '==' operator, try a fallback approach
//       if (repliesSnapshot.empty) {
//         console.log("No replies found with exact match. Trying alternative query...");
        
//         // Try secondary query with different approach - get all replies and filter client-side
//         const allRepliesQuery = query(
//           repliesRef,
//           orderBy('timestamp', 'desc')
//         );
        
//         const allRepliesSnapshot = await getDocs(allRepliesQuery);
//         console.log(`Found ${allRepliesSnapshot.size} total replies in the collection`);
        
//         // Filter manually to look for partial matches or string vs object inconsistencies
//         const filteredReplies = allRepliesSnapshot.docs
//           .filter(doc => {
//             const data = doc.data();
//             // Check for exact match or string representation match
//             return data.inquiryId === inquiryId || 
//                   data.inquiryId?.toString() === inquiryId.toString() ||
//                   data.inquiryId?.id === inquiryId;
//           })
//           .map(doc => ({
//             id: doc.id,
//             ...doc.data()
//           }));
        
//         setDebug(prev => ({ 
//           ...prev, 
//           totalRepliesInCollection: allRepliesSnapshot.size,
//           manuallyFilteredReplies: filteredReplies.length
//         }));
        
//         if (filteredReplies.length > 0) {
//           console.log(`Found ${filteredReplies.length} replies through manual filtering`);
//           setReplies(filteredReplies);
//         } else {
//           console.log("No replies found with alternative approach either");
//           setReplies([]);
//         }
//       } else {
//         // Normal case - replies found with original query
//         console.log(`Found ${repliesSnapshot.size} replies with exact match query`);
        
//         // Convert documents to data array
//         const repliesData = repliesSnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data()
//         }));
        
//         setReplies(repliesData);
//       }
//     } catch (error) {
//       console.error("Error fetching replies:", error);
//       setError("Failed to load reply data. Please try again.");
//       setDebug(prev => ({ ...prev, error: error.toString(), stack: error.stack }));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDate = (timestamp) => {
//     if (!timestamp) return "Unknown date";
    
//     try {
//       const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
//       return date.toLocaleString();
//     } catch (e) {
//       return String(timestamp);
//     }
//   };

//   // If modal is not open, don't render anything
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
//         <div className="p-6">
//           <h2 className="text-xl font-bold text-gray-800 mb-4">Reply History</h2>
          
//           {loading ? (
//             <div className="flex justify-center items-center h-32">
//               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
//             </div>
//           ) : error ? (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//               <p className="font-bold">Failed to load reply data. Please try again.</p>
//               <p className="text-sm">If this issue persists, please check the console for more details.</p>
              
//               {/* Debug button for admin users */}
//               <details className="mt-2 text-sm">
//                 <summary className="cursor-pointer font-semibold">Technical Details</summary>
//                 <div className="mt-2 p-2 bg-red-50 rounded overflow-auto max-h-40">
//                   <pre>{JSON.stringify(debug, null, 2)}</pre>
//                 </div>
//               </details>
//             </div>
//           ) : replies.length === 0 ? (
//             <div className="text-center py-6 text-gray-500">
//               No replies found for this inquiry.
//             </div>
//           ) : (
//             <div className="max-h-96 overflow-y-auto">
//               {replies.map((reply) => (
//                 <div key={reply.id} className="mb-4 bg-gray-50 p-4 rounded border border-gray-200">
//                   <div className="mb-2">
//                     <span className="font-semibold">Sent to:</span> {reply.userName || "User"} ({reply.userEmail || reply.email || "No email"})
//                   </div>
                  
//                   <div className="mb-2">
//                     <span className="font-semibold">Original Message:</span>
//                     <p className="mt-1 text-gray-600">{reply.originalMessage || "No original message available"}</p>
//                   </div>
                  
//                   <div className="mb-2">
//                     <span className="font-semibold">Reply Sent:</span> {formatDate(reply.timestamp)}
//                   </div>
                  
//                   <div>
//                     <span className="font-semibold">Reply Message:</span>
//                     <p className="mt-1 text-gray-800 whitespace-pre-line">{reply.replyMessage}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
          
//           <div className="flex justify-end mt-4">
//             <button
//               onClick={onClose}
//               className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ViewReplyModal;


// // import { useState, useEffect } from 'react';
// // import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
// // import { db } from '../config/firebase';

// // const ViewReplyModal = ({ isOpen, onClose, inquiryId }) => {
// //   const [replies, setReplies] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);

// //   useEffect(() => {
// //     // Only fetch data if the modal is open and we have an inquiryId
// //     if (isOpen && inquiryId) {
// //       fetchReplies();
// //     }
// //   }, [isOpen, inquiryId]);

// //   const fetchReplies = async () => {
// //     if (!inquiryId) return;
    
// //     setLoading(true);
// //     setError(null);
    
// //     try {
// //       console.log("Fetching replies for inquiry ID:", inquiryId);
      
// //       // Query the inquiry_replies collection
// //       const repliesRef = collection(db, 'inquiry_replies');
// //       const repliesQuery = query(
// //         repliesRef, 
// //         where('inquiryId', '==', inquiryId),
// //         orderBy('timestamp', 'desc')
// //       );
      
// //       const repliesSnapshot = await getDocs(repliesQuery);
// //       console.log(`Found ${repliesSnapshot.size} replies`);
      
// //       if (!repliesSnapshot.empty) {
// //         // Convert documents to data array
// //         const repliesData = repliesSnapshot.docs.map(doc => ({
// //           id: doc.id,
// //           ...doc.data()
// //         }));
        
// //         setReplies(repliesData);
// //       } else {
// //         console.log("No replies found with that inquiry ID");
// //         setReplies([]);
// //       }
// //     } catch (error) {
// //       console.error("Error fetching replies:", error);
// //       setError("Failed to load reply data. Please try again.");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const formatDate = (timestamp) => {
// //     if (!timestamp) return "Unknown date";
    
// //     try {
// //       const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
// //       return date.toLocaleString();
// //     } catch (e) {
// //       return String(timestamp);
// //     }
// //   };

// //   // If modal is not open, don't render anything
// //   if (!isOpen) return null;

// //   return (
// //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
// //       <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
// //         <div className="p-6">
// //           <h2 className="text-xl font-bold text-gray-800 mb-4">Reply History</h2>
          
// //           {loading ? (
// //             <div className="flex justify-center items-center h-32">
// //               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
// //             </div>
// //           ) : error ? (
// //             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
// //               {error}
// //             </div>
// //           ) : replies.length === 0 ? (
// //             <div className="text-center py-6 text-gray-500">
// //               No replies found for this inquiry.
// //             </div>
// //           ) : (
// //             <div className="max-h-96 overflow-y-auto">
// //               {replies.map((reply) => (
// //                 <div key={reply.id} className="mb-4 bg-gray-50 p-4 rounded border border-gray-200">
// //                   <div className="mb-2">
// //                     <span className="font-semibold">Sent to:</span> {reply.userName || "User"} ({reply.userEmail || "No email"})
// //                   </div>
                  
// //                   <div className="mb-2">
// //                     <span className="font-semibold">Original Message:</span>
// //                     <p className="mt-1 text-gray-600">{reply.originalMessage || "No original message available"}</p>
// //                   </div>
                  
// //                   <div className="mb-2">
// //                     <span className="font-semibold">Reply Sent:</span> {formatDate(reply.timestamp)}
// //                   </div>
                  
// //                   <div>
// //                     <span className="font-semibold">Reply Message:</span>
// //                     <p className="mt-1 text-gray-800 whitespace-pre-line">{reply.replyMessage}</p>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
          
// //           <div className="flex justify-end mt-4">
// //             <button
// //               onClick={onClose}
// //               className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
// //             >
// //               Close
// //             </button>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default ViewReplyModal;
