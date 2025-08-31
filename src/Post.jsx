import React, { useEffect, useState } from "react";
import { db, auth } from "./config/firebase";
import Navbar from "./Navbar";
import { deleteDoc } from "firebase/firestore";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  UilAngleUp,
  UilAngleDown,
  UilSick,
  UilShare,
  UilThumbsUp,
  UilThumbsDown,
  UilMapMarker,
  UilTimes
} from "@iconscout/react-unicons";

import { AiFillLike } from "react-icons/ai";
import { AiFillDislike } from "react-icons/ai";
import ShareModal from "./ShareModal";
// Import map components
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker issue (default icons don't load correctly in React)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const Post = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [shareUrl, setShareUrl] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [userPincode, setUserPincode] = useState("");
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
  const [selectedPostId, setSelectedPostId] = useState(null);
  
  // Map dialog states
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapLat, setMapLat] = useState(19.076);
  const [mapLng, setMapLng] = useState(72.8777);
  
  // Step 1: Get the current user
  useEffect(() => {
    console.log("Starting auth state observer");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        console.log("User ID:", user.uid);
        
        // Fetch user's pincode and role
        const fetchUserData = async () => {
          try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              console.log("User data:", userData);
              // Check both possible field names for pincode
              const pincode = userData.pinCode || userData.pincode || "";
              const role = userData.role || "";
              setUserPincode(pincode);
              setCurrentUserRole(role);
              console.log("Set user pincode to:", pincode);
              console.log("Set user role to:", role);
            } else {
              console.log("No user document found");
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        };
        
        fetchUserData();
      } else {
        setCurrentUser(null);
        setUserPincode("");
        setCurrentUserRole("");
        console.log("No user is currently logged in");
      }
    });

    return () => unsubscribe();
  }, []);

  // Step 2: Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      console.log("Fetching posts");
      setLoading(true);
      try {
        // Get all posts ordered by creation date (newest first)
        const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(postsQuery);
        
        console.log("Got posts:", querySnapshot.size);
        
        const postsData = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            console.log("Post data:", doc.id, data);
            return {
              id: doc.id,
              ...data,
              // Ensure createdAt is processed properly
              createdAt: data.createdAt 
                ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
                : new Date(),
              // Ensure pincode is a string for consistent comparison
              pincode: data.pincode ? data.pincode.toString() : ""
            };
          })
          .filter((post) => (post.reports || 0) < 3);
        
        console.log("Filtered posts:", postsData.length);
        setPosts(postsData);

        // Fetch user details for each post
        const usersData = {};
        for (const post of postsData) {
          if (!usersData[post.userId] && post.userId) {
            try {
              const userRef = doc(db, "users", post.userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                usersData[post.userId] = userSnap.data();
              }
            } catch (error) {
              console.error(`Error fetching user details for ${post.userId}:`, error);
            }
          }
        }
        setUserDetails(usersData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Step 3: Filter posts by pincode
  useEffect(() => {
    console.log("Filtering posts. User pincode:", userPincode);
    console.log("Show all posts:", showAllPosts);
    console.log("Total posts:", posts.length);
    
    if (posts.length === 0) {
      setFilteredPosts([]);
      return;
    }
    
    if (!showAllPosts && userPincode) {
      console.log("Filtering by pincode:", userPincode);
      const pincodeFilteredPosts = posts.filter(post => {
        const postPincode = post.pincode ? post.pincode.toString() : "";
        const userPincodeStr = userPincode.toString();
        
        console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
                   "Match:", postPincode === userPincodeStr);
        
        return postPincode === userPincodeStr;
      });
      
      console.log("Filtered posts count:", pincodeFilteredPosts.length);
      setFilteredPosts(pincodeFilteredPosts);
    } else {
      console.log("Showing all posts");
      setFilteredPosts(posts);
    }
  }, [userPincode, posts, showAllPosts]);

  // Step 4: Fetch user votes
  useEffect(() => {
    const fetchVotes = async () => {
      console.log("Fetching votes");
      try {
        // Fetch user votes if user is logged in
        if (currentUser) {
          const userUpvotes = {};
          const userDownvotes = {};
          
          // Fetch upvotes
          const upvotesQuery = query(
            collection(db, "upvotes"), 
            where("userId", "==", currentUser.uid)
          );
          const upvotesSnapshot = await getDocs(upvotesQuery);
          upvotesSnapshot.forEach(doc => {
            const data = doc.data();
            userUpvotes[data.postId] = true;
          });
          
          // Fetch downvotes
          const downvotesQuery = query(
            collection(db, "downvotes"), 
            where("userId", "==", currentUser.uid)
          );
          const downvotesSnapshot = await getDocs(downvotesQuery);
          downvotesSnapshot.forEach(doc => {
            const data = doc.data();
            userDownvotes[data.postId] = true;
          });
          
          setUserVotes({
            upvotes: userUpvotes,
            downvotes: userDownvotes
          });
          
          console.log("User votes loaded:", {
            upvotes: Object.keys(userUpvotes).length,
            downvotes: Object.keys(userDownvotes).length
          });
        }
      } catch (error) {
        console.error("Error fetching votes:", error);
      }
    };
  
    fetchVotes();
  }, [currentUser]);
  
  const handleVote = async (postId, type) => {
    if (!currentUser) {
      console.log("User must be logged in to vote");
      return;
    }
    
    const currentUserId = currentUser.uid;
    const postRef = doc(db, "posts", postId);
    
    // Use different collections for upvotes and downvotes
    const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
    const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
    try {
      // Check if the user has already upvoted or downvoted
      const upvoteSnap = await getDoc(upvoteRef);
      const downvoteSnap = await getDoc(downvoteRef);
      const hasUpvoted = upvoteSnap.exists();
      const hasDownvoted = downvoteSnap.exists();
  
      // If clicking the same vote type they already did - do nothing
      if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
        console.log("User has already voted this way");
        return;
      }
  
      // If user is trying to upvote but has already downvoted
      if (type === "upvotes" && hasDownvoted) {
        // Remove downvote document
        await deleteDoc(downvoteRef);
        
        // Add upvote document
        await setDoc(upvoteRef, { 
          voted: true, 
          timestamp: new Date(),
          userId: currentUserId,
          postId: postId
        });
        
        // Update post counts: decrease downvotes by 1, increase upvotes by 1
        await updateDoc(postRef, { 
          downvotes: increment(-1),
          upvotes: increment(1)
        });
        
        // Update local state for votes
        setUserVotes(prev => ({
          upvotes: { ...prev.upvotes, [postId]: true },
          downvotes: { ...prev.downvotes, [postId]: false }
        }));
        
        // Update posts state
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { 
                  ...post, 
                  upvotes: (post.upvotes || 0) + 1,
                  downvotes: Math.max((post.downvotes || 0) - 1, 0)
                }
              : post
          )
        );
      } 
      // If user is trying to downvote but has already upvoted
      else if (type === "downvotes" && hasUpvoted) {
        // Remove upvote document
        await deleteDoc(upvoteRef);
        
        // Add downvote document
        await setDoc(downvoteRef, { 
          voted: true, 
          timestamp: new Date(),
          userId: currentUserId,
          postId: postId
        });
        
        // Update post counts: decrease upvotes by 1, increase downvotes by 1
        await updateDoc(postRef, { 
          upvotes: increment(-1),
          downvotes: increment(1)
        });
        
        // Update local state for votes
        setUserVotes(prev => ({
          upvotes: { ...prev.upvotes, [postId]: false },
          downvotes: { ...prev.downvotes, [postId]: true }
        }));
        
        // Update posts state
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { 
                  ...post, 
                  downvotes: (post.downvotes || 0) + 1,
                  upvotes: Math.max((post.upvotes || 0) - 1, 0)
                }
              : post
          )
        );
        
        // Also update filteredPosts state to reflect changes
        setFilteredPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { 
                  ...post, 
                  downvotes: (post.downvotes || 0) + 1,
                  upvotes: Math.max((post.upvotes || 0) - 1, 0)
                }
              : post
          )
        );
      }
      // New vote (user hasn't voted before)
      else {
        // Determine which collection to use based on vote type
        const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
        // Create new vote document in the appropriate collection
        await setDoc(voteRef, { 
          voted: true, 
          timestamp: new Date(),
          userId: currentUserId,
          postId: postId
        });
        
        // Update post count
        await updateDoc(postRef, { [type]: increment(1) });
        
        // Update local state for votes
        setUserVotes(prev => ({
          ...prev,
          [type]: { ...prev[type], [postId]: true }
        }));
        
        // Update both posts and filteredPosts states
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, [type]: (post[type] || 0) + 1 }
              : post
          )
        );
        
        setFilteredPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, [type]: (post[type] || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error handling vote:", error);
    }
  };

  const handleReport = async (postId) => {
    if (!currentUser) {
      console.log("User must be logged in to report");
      return;
    }
    
    const currentUserId = currentUser.uid;
    const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
    const postRef = doc(db, "posts", postId);

    try {
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) {
        await setDoc(reportRef, { 
          reported: true,
          timestamp: new Date(),
          userId: currentUserId,
          postId: postId
        });
        await updateDoc(postRef, { reports: increment(1) });
        
        // Update both posts and filteredPosts states
        setPosts((prev) => prev.filter((post) => post.id !== postId));
        setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
      }
    } catch (error) {
      console.error("Error reporting:", error);
    }
  };

  const handleShare = async (postId) => {
    const postRef = doc(db, "posts", postId);
    // Create the proper URL with the domain and route pattern
    const url = `https://saitransgression.netlify.app/post/${postId}`;
    setShareUrl(url);
    setSelectedPostId(postId);
    setShowShareDialog(true);

    try {
      await updateDoc(postRef, { shares: increment(1) });
      
      // Update both posts and filteredPosts states
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
        )
      );
      
      setFilteredPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
        )
      );
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Handle map location button click (only for NGO and FD roles)
  const handleShowMap = (post) => {
    // Set map coordinates based on post location or default
    if (post.location && post.location.latitude && post.location.longitude) {
      setMapLat(parseFloat(post.location.latitude));
      setMapLng(parseFloat(post.location.longitude));
    } else if (post.latitude && post.longitude) {
      setMapLat(parseFloat(post.latitude));
      setMapLng(parseFloat(post.longitude));
    } else {
      // Default coordinates if no location in post
      setMapLat(19.076);
      setMapLng(72.8777);
    }
    setSelectedPostId(post.id);
    setShowMapDialog(true);
  };

  // Check if current user has NGO or FD role
  const canViewMap = () => {
    return currentUserRole === "NGO" || currentUserRole === "FD";
  };
  
  const toggleViewAllPosts = () => {
    setShowAllPosts(!showAllPosts);
  };

  // Display formatted time
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // Convert Firebase timestamp to JS Date if needed
      const date = timestamp.toDate ? timestamp.toDate() : timestamp;
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return 'Invalid date';
    }
  };

  // Map Dialog Component
  const MapDialog = () => {
    const selectedPost = filteredPosts.find(post => post.id === selectedPostId);
    const postLocation = selectedPost?.location || {};
    const hasLocation = (postLocation.latitude && postLocation.longitude) || 
                       (selectedPost?.latitude && selectedPost?.longitude);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-700">Post Location</h2>
              <p className="text-gray-600">
                {hasLocation 
                  ? `Coordinates: ${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}`
                  : "No location data available for this post"
                }
              </p>
            </div>
            <button
              onClick={() => setShowMapDialog(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <UilTimes size="24" />
            </button>
          </div>
          
          {hasLocation ? (
            <div className="h-96 w-full">
              <MapContainer
                center={[mapLat, mapLng]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                key={`${mapLat}-${mapLng}`}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                />
                <Marker position={[mapLat, mapLng]}>
                  <Popup>
                    <div>
                      <b>Post Location</b>
                      <br />
                      <strong>User:</strong> {selectedPost?.username || userDetails[selectedPost?.userId]?.username || "Unknown"}
                      <br />
                      <strong>Area:</strong> {selectedPost?.location?.area || "Unknown"}
                      <br />
                      <strong>Coordinates:</strong> {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                      <br />
                      <strong>Posted:</strong> {formatDate(selectedPost?.createdAt)}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            <div className="h-96 w-full flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <UilMapMarker size="48" className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">No location data available for this post</p>
                <p className="text-gray-500 text-sm">The user did not share their location when posting</p>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowMapDialog(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 flex flex-col items-center min-h-screen">
      {/* Post View Options */}
      <div className="w-full max-w-2xl px-4 mt-4 mb-2">
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-lg font-bold mb-2">
            {loading ? "Loading posts..." : 
              showAllPosts ? "Viewing All Posts" : 
              userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={toggleViewAllPosts}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              {showAllPosts ? "View Local Posts" : "View All Posts"}
            </button>
            
            {/* Show current user role for debugging */}
            {currentUserRole && (
              <span className="bg-gray-200 px-3 py-2 rounded-md text-sm">
                Role: {currentUserRole}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="w-full max-w-2xl px-4">
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
            <p className="text-lg text-gray-700">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
            <p className="text-lg text-gray-700">
              {!userPincode && !showAllPosts 
                ? "No pincode set. Please update your profile." 
                : "No posts available."}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const user = userDetails[post.userId] || {};
            const hasUpvoted = userVotes.upvotes[post.id];
            const hasDownvoted = userVotes.downvotes[post.id];
            
            return (
              <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <img
                    src={user.profilePic || "https://via.placeholder.com/50"}
                    alt="Profile"
                    className="rounded-full w-12 h-12 mr-3"
                  />
                  <div className="flex-grow">
                    <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
                    <p className="text-sm text-gray-600">
                      Posted at {formatDate(post.createdAt)}
                    </p>
                  </div>
                  
                  {/* Map button for NGO/FD/admin users */}
                  {(canViewMap() || currentUserRole === "admin") && (
                    <button
                      onClick={() => handleShowMap(post)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
                      title="View Location"
                    >
                      <UilMapMarker size="20" className="mr-1" />
                      Location
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-lg mb-4">{post.content}</p>

                {/* Media */}
                {post.mediaUrl && (
                  <div className="mb-4">
                    <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
                  </div>
                )}

                {/* Engagement */}
                <div className="flex justify-between items-center mt-4">
                  <span className="text-gray-700">📍 Area: {post.location?.area || "Unknown"}</span>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    className="flex items-center text-gray-600"
                    onClick={() => handleVote(post.id, "upvotes")}
                  >
                    {hasUpvoted ? (
                      <AiFillLike size="24" className="mr-1 text-blue-500" />
                    ) : (
                      <UilThumbsUp size="24" className="mr-1" />
                    )}
                    <span>{post.upvotes || 0}</span>
                  </button>
                  <button
                    className="flex items-center text-gray-600"
                    onClick={() => handleVote(post.id, "downvotes")}
                  >
                    {hasDownvoted ? (
                      <AiFillDislike size="24" className="mr-1 text-red-500" />
                    ) : (
                      <UilThumbsDown size="24" className="mr-1" />
                    )}
                    <span>{post.downvotes || 0}</span>
                  </button>
                  <button
                    className="flex items-center text-gray-600"
                    onClick={() => handleReport(post.id)}
                  >
                    <UilSick size="24" className="mr-1" />
                    <span>{post.reports || 0}</span>
                  </button>
                  <button
                    className="flex items-center text-gray-600"
                    onClick={() => handleShare(post.id)}
                  >
                    <UilShare size="24" className="mr-1" />
                    <span>{post.shares || 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Map Dialog - Only render when showMapDialog is true */}
      {showMapDialog && <MapDialog />}

      {/* Share Modal Component - Only show when showShareDialog is true */}
      {showShareDialog && (
        <ShareModal 
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          url={shareUrl}
          title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
        />
      )}
    </div>
  );
};

export default Post;

// import React, { useEffect, useState } from "react";
// import { db, auth } from "./config/firebase";
// import Navbar from "./Navbar";
// import { deleteDoc } from "firebase/firestore";
// import {
//   collection,
//   getDocs,
//   doc,
//   updateDoc,
//   increment,
//   setDoc,
//   getDoc,
//   query,
//   orderBy,
//   where
// } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";
// import {
//   UilAngleUp,
//   UilAngleDown,
//   UilSick,
//   UilShare,
//   UilThumbsUp,
//   UilThumbsDown,
//   UilMapMarker,
//   UilTimes
// } from "@iconscout/react-unicons";

// import { AiFillLike } from "react-icons/ai";
// import { AiFillDislike } from "react-icons/ai";
// import ShareModal from "./ShareModal";
// import ToxicityAlert from "./ToxicityAlert";
// // Import map components
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// // Import TensorFlow properly - use dynamic import to handle potential loading issues
// import * as tf from '@tensorflow/tfjs';

// // Fix Leaflet marker issue (default icons don't load correctly in React)
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
//   iconUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
//   shadowUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
// });

// const Post = ({ userId }) => {
//   const [posts, setPosts] = useState([]);
//   const [userDetails, setUserDetails] = useState({});
//   const [shareUrl, setShareUrl] = useState("");
//   const [showShareDialog, setShowShareDialog] = useState(false);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [currentUserRole, setCurrentUserRole] = useState("");
//   const [comments, setComments] = useState({});
//   const [newComment, setNewComment] = useState("");
//   const [userPincode, setUserPincode] = useState("");
//   const [showAllPosts, setShowAllPosts] = useState(false);
//   const [filteredPosts, setFilteredPosts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
//   const [toxicityModel, setToxicityModel] = useState(null);
//   const [showToxicityAlert, setShowToxicityAlert] = useState(false);
//   const [toxicityResults, setToxicityResults] = useState(null);
//   const [selectedPostId, setSelectedPostId] = useState(null);
//   const [isToxicityModelLoading, setIsToxicityModelLoading] = useState(true);
  
//   // Map dialog states
//   const [showMapDialog, setShowMapDialog] = useState(false);
//   const [mapLat, setMapLat] = useState(19.076);
//   const [mapLng, setMapLng] = useState(72.8777);
  
//   // Step 1: Get the current user
//   useEffect(() => {
//     console.log("Starting auth state observer");
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         setCurrentUser(user);
//         console.log("User ID:", user.uid);
        
//         // Fetch user's pincode and role
//         const fetchUserData = async () => {
//           try {
//             const userRef = doc(db, "users", user.uid);
//             const userSnap = await getDoc(userRef);
//             if (userSnap.exists()) {
//               const userData = userSnap.data();
//               console.log("User data:", userData);
//               // Check both possible field names for pincode
//               const pincode = userData.pinCode || userData.pincode || "";
//               const role = userData.role || "";
//               setUserPincode(pincode);
//               setCurrentUserRole(role);
//               console.log("Set user pincode to:", pincode);
//               console.log("Set user role to:", role);
//             } else {
//               console.log("No user document found");
//             }
//           } catch (error) {
//             console.error("Error fetching user data:", error);
//           }
//         };
        
//         fetchUserData();
//       } else {
//         setCurrentUser(null);
//         setUserPincode("");
//         setCurrentUserRole("");
//         console.log("No user is currently logged in");
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   // Load TensorFlow Toxicity model with error handling
//   useEffect(() => {
//     const loadToxicityModel = async () => {
//       setIsToxicityModelLoading(true);
//       try {
//         // Dynamically import the toxicity module
//         const toxicity = await import('@tensorflow-models/toxicity');
        
//         // Set a threshold that matches the model's default threshold (0.9)
//         const threshold = 0.4;
//         const model = await toxicity.load(threshold);
//         setToxicityModel(model);
//         console.log("Toxicity model loaded successfully");
//       } catch (error) {
//         console.error("Error loading toxicity model:", error);
//         // Continue without the model - we'll handle this in checkToxicity
//       } finally {
//         setIsToxicityModelLoading(false);
//       }
//     };
    
//     loadToxicityModel();
//   }, []);

//   // Step 2: Fetch posts
//   useEffect(() => {
//     const fetchPosts = async () => {
//       console.log("Fetching posts");
//       setLoading(true);
//       try {
//         // Get all posts ordered by creation date (newest first)
//         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(postsQuery);
        
//         console.log("Got posts:", querySnapshot.size);
        
//         const postsData = querySnapshot.docs
//           .map((doc) => {
//             const data = doc.data();
//             console.log("Post data:", doc.id, data);
//             return {
//               id: doc.id,
//               ...data,
//               // Ensure createdAt is processed properly
//               createdAt: data.createdAt 
//                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
//                 : new Date(),
//               // Ensure pincode is a string for consistent comparison
//               pincode: data.pincode ? data.pincode.toString() : ""
//             };
//           })
//           .filter((post) => (post.reports || 0) < 3);
        
//         console.log("Filtered posts:", postsData.length);
//         setPosts(postsData);

//         // Fetch user details for each post
//         const usersData = {};
//         for (const post of postsData) {
//           if (!usersData[post.userId] && post.userId) {
//             try {
//               const userRef = doc(db, "users", post.userId);
//               const userSnap = await getDoc(userRef);
//               if (userSnap.exists()) {
//                 usersData[post.userId] = userSnap.data();
//               }
//             } catch (error) {
//               console.error(`Error fetching user details for ${post.userId}:`, error);
//             }
//           }
//         }
//         setUserDetails(usersData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching posts:", error);
//         setLoading(false);
//       }
//     };

//     fetchPosts();
//   }, []);

//   // Step 3: Filter posts by pincode
//   useEffect(() => {
//     console.log("Filtering posts. User pincode:", userPincode);
//     console.log("Show all posts:", showAllPosts);
//     console.log("Total posts:", posts.length);
    
//     if (posts.length === 0) {
//       setFilteredPosts([]);
//       return;
//     }
    
//     if (!showAllPosts && userPincode) {
//       console.log("Filtering by pincode:", userPincode);
//       const pincodeFilteredPosts = posts.filter(post => {
//         const postPincode = post.pincode ? post.pincode.toString() : "";
//         const userPincodeStr = userPincode.toString();
        
//         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
//                    "Match:", postPincode === userPincodeStr);
        
//         return postPincode === userPincodeStr;
//       });
      
//       console.log("Filtered posts count:", pincodeFilteredPosts.length);
//       setFilteredPosts(pincodeFilteredPosts);
//     } else {
//       console.log("Showing all posts");
//       setFilteredPosts(posts);
//     }
//   }, [userPincode, posts, showAllPosts]);

//   // Step 4: Fetch comments and user votes
//   useEffect(() => {
//     const fetchCommentsAndVotes = async () => {
//       console.log("Fetching comments and votes");
//       try {
//         // Fetch comments
//         const commentsData = {};
//         const querySnapshot = await getDocs(collection(db, "comments"));
//         querySnapshot.forEach((doc) => {
//           const data = doc.data();
//           if (!commentsData[data.postId]) {
//             commentsData[data.postId] = [];
//           }
          
//           // Convert timestamp to date object if needed
//           const timestamp = data.timestamp && data.timestamp.toDate 
//             ? data.timestamp.toDate() 
//             : data.timestamp || new Date();
            
//           commentsData[data.postId].push({ 
//             id: doc.id, 
//             ...data,
//             timestamp: timestamp
//           });
//         });
    
//         // Sort comments by timestamp
//         Object.keys(commentsData).forEach(postId => {
//           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
//         });
        
//         setComments(commentsData);
//         console.log("Comments loaded:", Object.keys(commentsData).length);
        
//         // Fetch user votes if user is logged in
//         if (currentUser) {
//           const userUpvotes = {};
//           const userDownvotes = {};
          
//           // Fetch upvotes
//           const upvotesQuery = query(
//             collection(db, "upvotes"), 
//             where("userId", "==", currentUser.uid)
//           );
//           const upvotesSnapshot = await getDocs(upvotesQuery);
//           upvotesSnapshot.forEach(doc => {
//             const data = doc.data();
//             userUpvotes[data.postId] = true;
//           });
          
//           // Fetch downvotes
//           const downvotesQuery = query(
//             collection(db, "downvotes"), 
//             where("userId", "==", currentUser.uid)
//           );
//           const downvotesSnapshot = await getDocs(downvotesQuery);
//           downvotesSnapshot.forEach(doc => {
//             const data = doc.data();
//             userDownvotes[data.postId] = true;
//           });
          
//           setUserVotes({
//             upvotes: userUpvotes,
//             downvotes: userDownvotes
//           });
          
//           console.log("User votes loaded:", {
//             upvotes: Object.keys(userUpvotes).length,
//             downvotes: Object.keys(userDownvotes).length
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching comments and votes:", error);
//       }
//     };
  
//     fetchCommentsAndVotes();
//   }, [currentUser]);
  
//   const handleVote = async (postId, type) => {
//     if (!currentUser) {
//       console.log("User must be logged in to vote");
//       return;
//     }
    
//     const currentUserId = currentUser.uid;
//     const postRef = doc(db, "posts", postId);
    
//     // Use different collections for upvotes and downvotes
//     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
//     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
//     try {
//       // Check if the user has already upvoted or downvoted
//       const upvoteSnap = await getDoc(upvoteRef);
//       const downvoteSnap = await getDoc(downvoteRef);
//       const hasUpvoted = upvoteSnap.exists();
//       const hasDownvoted = downvoteSnap.exists();
  
//       // If clicking the same vote type they already did - do nothing
//       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
//         console.log("User has already voted this way");
//         return;
//       }
  
//       // If user is trying to upvote but has already downvoted
//       if (type === "upvotes" && hasDownvoted) {
//         // Remove downvote document
//         await deleteDoc(downvoteRef);
        
//         // Add upvote document
//         await setDoc(upvoteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post counts: decrease downvotes by 1, increase upvotes by 1
//         await updateDoc(postRef, { 
//           downvotes: increment(-1),
//           upvotes: increment(1)
//         });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           upvotes: { ...prev.upvotes, [postId]: true },
//           downvotes: { ...prev.downvotes, [postId]: false }
//         }));
        
//         // Update posts state
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   upvotes: (post.upvotes || 0) + 1,
//                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
//       } 
//       // If user is trying to downvote but has already upvoted
//       else if (type === "downvotes" && hasUpvoted) {
//         // Remove upvote document
//         await deleteDoc(upvoteRef);
        
//         // Add downvote document
//         await setDoc(downvoteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post counts: decrease upvotes by 1, increase downvotes by 1
//         await updateDoc(postRef, { 
//           upvotes: increment(-1),
//           downvotes: increment(1)
//         });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           upvotes: { ...prev.upvotes, [postId]: false },
//           downvotes: { ...prev.downvotes, [postId]: true }
//         }));
        
//         // Update posts state
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   downvotes: (post.downvotes || 0) + 1,
//                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
        
//         // Also update filteredPosts state to reflect changes
//         setFilteredPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   downvotes: (post.downvotes || 0) + 1,
//                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
//       }
//       // New vote (user hasn't voted before)
//       else {
//         // Determine which collection to use based on vote type
//         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
//         // Create new vote document in the appropriate collection
//         await setDoc(voteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post count
//         await updateDoc(postRef, { [type]: increment(1) });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           ...prev,
//           [type]: { ...prev[type], [postId]: true }
//         }));
        
//         // Update both posts and filteredPosts states
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { ...post, [type]: (post[type] || 0) + 1 }
//               : post
//           )
//         );
        
//         setFilteredPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { ...post, [type]: (post[type] || 0) + 1 }
//               : post
//           )
//         );
//       }
//     } catch (error) {
//       console.error("Error handling vote:", error);
//     }
//   };

//   const handleReport = async (postId) => {
//     if (!currentUser) {
//       console.log("User must be logged in to report");
//       return;
//     }
    
//     const currentUserId = currentUser.uid;
//     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
//     const postRef = doc(db, "posts", postId);

//     try {
//       const reportSnap = await getDoc(reportRef);
//       if (!reportSnap.exists()) {
//         await setDoc(reportRef, { 
//           reported: true,
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
//         await updateDoc(postRef, { reports: increment(1) });
        
//         // Update both posts and filteredPosts states
//         setPosts((prev) => prev.filter((post) => post.id !== postId));
//         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
//       }
//     } catch (error) {
//       console.error("Error reporting:", error);
//     }
//   };

//   const handleShare = async (postId) => {
//     const postRef = doc(db, "posts", postId);
//     // Create the proper URL with the domain and route pattern
//     const url = `https://saitransgression.netlify.app/post/${postId}`;
//     setShareUrl(url);
//     setSelectedPostId(postId);
//     setShowShareDialog(true);

//     try {
//       await updateDoc(postRef, { shares: increment(1) });
      
//       // Update both posts and filteredPosts states
//       setPosts((prev) =>
//         prev.map((post) =>
//           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
//         )
//       );
      
//       setFilteredPosts((prev) =>
//         prev.map((post) =>
//           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
//         )
//       );
//     } catch (error) {
//       console.error("Error sharing:", error);
//     }
//   };

//   // Handle map location button click (only for NGO and FD roles)
//   const handleShowMap = (post) => {
//     // Set map coordinates based on post location or default
//     if (post.location && post.location.latitude && post.location.longitude) {
//       setMapLat(parseFloat(post.location.latitude));
//       setMapLng(parseFloat(post.location.longitude));
//     } else if (post.latitude && post.longitude) {
//       setMapLat(parseFloat(post.latitude));
//       setMapLng(parseFloat(post.longitude));
//     } else {
//       // Default coordinates if no location in post
//       setMapLat(19.076);
//       setMapLng(72.8777);
//     }
//     setSelectedPostId(post.id);
//     setShowMapDialog(true);
//   };

//   // Check if current user has NGO or FD role
//   const canViewMap = () => {
//     return currentUserRole === "NGO" || currentUserRole === "FD";
//   };

//   // Check comment for toxicity with fallback
//   const checkToxicity = async (text) => {
//     if (!toxicityModel) {
//       console.warn("Toxicity model not loaded yet");
//       return null;
//     }
    
//     try {
//       const predictions = await toxicityModel.classify(text);
//       // Find any toxic categories
//       const toxicLabels = predictions
//         .filter(prediction => prediction.results[0].match)
//         .map(prediction => ({
//           label: prediction.label,
//           probability: prediction.results[0].probabilities[1] // Probability of being toxic
//         }));
      
//       return toxicLabels.length > 0 ? toxicLabels : null;
//     } catch (error) {
//       console.error("Error checking toxicity:", error);
//       return null;
//     }
//   };

//   const handleAddComment = async (postId) => {
//   if (!currentUser || newComment.trim() === "") return;
  
//   // Only check toxicity if model is loaded
//   if (toxicityModel && !isToxicityModelLoading) {
//     const toxicContent = await checkToxicity(newComment);
//     if (toxicContent && toxicContent.length > 0) {
//       console.log("Toxic content detected:", toxicContent);
//       setToxicityResults(toxicContent);
//       setShowToxicityAlert(true);
//       return;
//     }
//   }

//   try {
//     // Fetch the user document from Firestore
//     const userRef = doc(db, "users", currentUser.uid);
//     const userSnap = await getDoc(userRef);

//     let username = "Anonymous"; // Default username
//     if (userSnap.exists()) {
//       username = userSnap.data().username || "Anonymous";
//     }

//     // Comment data including fetched username
//     const commentData = {
//       postId,
//       userId: currentUser.uid,
//       username, // Use the fetched username
//       content: newComment,
//       timestamp: new Date(),
//     };

//     // Store the comment in Firestore
//     const commentRef = doc(collection(db, "comments"));
//     await setDoc(commentRef, commentData);

//     // Update UI to reflect new comment
//     setComments((prev) => ({
//       ...prev,
//       [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
//     }));

//     setNewComment(""); // Clear the input field
//   } catch (error) {
//     console.error("Error adding comment:", error);
//   }
// };

  
//   const toggleViewAllPosts = () => {
//     setShowAllPosts(!showAllPosts);
//   };

//   // Display formatted time
//   const formatDate = (timestamp) => {
//     if (!timestamp) return 'Unknown time';
    
//     try {
//       // Convert Firebase timestamp to JS Date if needed
//       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
//       return date.toLocaleString();
//     } catch (error) {
//       console.error("Error formatting date:", error, timestamp);
//       return 'Invalid date';
//     }
//   };

//   // Map Dialog Component
//   const MapDialog = () => {
//     const selectedPost = filteredPosts.find(post => post.id === selectedPostId);
//     const postLocation = selectedPost?.location || {};
//     const hasLocation = (postLocation.latitude && postLocation.longitude) || 
//                        (selectedPost?.latitude && selectedPost?.longitude);

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-auto">
//           <div className="flex justify-between items-center mb-4">
//             <div>
//               <h2 className="text-2xl font-bold text-blue-700">Post Location</h2>
//               <p className="text-gray-600">
//                 {hasLocation 
//                   ? `Coordinates: ${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}`
//                   : "No location data available for this post"
//                 }
//               </p>
//             </div>
//             <button
//               onClick={() => setShowMapDialog(false)}
//               className="text-gray-500 hover:text-gray-700"
//             >
//               <UilTimes size="24" />
//             </button>
//           </div>
          
//           {hasLocation ? (
//             <div className="h-96 w-full">
//               <MapContainer
//                 center={[mapLat, mapLng]}
//                 zoom={15}
//                 style={{ height: "100%", width: "100%" }}
//                 key={`${mapLat}-${mapLng}`}
//               >
//                 <TileLayer
//                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
//                 />
//                 <Marker position={[mapLat, mapLng]}>
//                   <Popup>
//                     <div>
//                       <b>Post Location</b>
//                       <br />
//                       <strong>User:</strong> {selectedPost?.username || userDetails[selectedPost?.userId]?.username || "Unknown"}
//                       <br />
//                       <strong>Pincode:</strong> {selectedPost?.pincode || "Unknown"}
//                       <br />
//                       <strong>Coordinates:</strong> {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
//                       <br />
//                       <strong>Posted:</strong> {formatDate(selectedPost?.createdAt)}
//                     </div>
//                   </Popup>
//                 </Marker>
//               </MapContainer>
//             </div>
//           ) : (
//             <div className="h-96 w-full flex items-center justify-center bg-gray-100 rounded-lg">
//               <div className="text-center">
//                 <UilMapMarker size="48" className="mx-auto text-gray-400 mb-4" />
//                 <p className="text-gray-600 text-lg">No location data available for this post</p>
//                 <p className="text-gray-500 text-sm">The user did not share their location when posting</p>
//               </div>
//             </div>
//           )}
          
//           <div className="mt-4 flex justify-end">
//             <button
//               onClick={() => setShowMapDialog(false)}
//               className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
//       {/* Post View Options */}
//       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
//         <div className="bg-white p-4 rounded-lg shadow-lg">
//           <h2 className="text-lg font-bold mb-2">
//             {loading ? "Loading posts..." : 
//               showAllPosts ? "Viewing All Posts" : 
//               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
//           </h2>
//           <div className="flex space-x-2">
//             <button
//               onClick={toggleViewAllPosts}
//               className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
//             >
//               {showAllPosts ? "View Local Posts" : "View All Posts"}
//             </button>
            
//             {/* Show current user role for debugging */}
//             {currentUserRole && (
//               <span className="bg-gray-200 px-3 py-2 rounded-md text-sm">
//                 Role: {currentUserRole}
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Posts */}
//       <div className="w-full max-w-2xl px-4">
//         {loading ? (
//           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
//             <p className="text-lg text-gray-700">Loading posts...</p>
//           </div>
//         ) : filteredPosts.length === 0 ? (
//           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
//             <p className="text-lg text-gray-700">
//               {!userPincode && !showAllPosts 
//                 ? "No pincode set. Please update your profile." 
//                 : "No posts available."}
//             </p>
//           </div>
//         ) : (
//           filteredPosts.map((post) => {
//             const user = userDetails[post.userId] || {};
//             const hasUpvoted = userVotes.upvotes[post.id];
//             const hasDownvoted = userVotes.downvotes[post.id];
            
//             return (
//               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
//                 {/* Header */}
//                 <div className="flex items-center mb-4">
//                   <img
//                     src={user.profilePic || "https://via.placeholder.com/50"}
//                     alt="Profile"
//                     className="rounded-full w-12 h-12 mr-3"
//                   />
//                   <div className="flex-grow">
//                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
//                     <p className="text-sm text-gray-600">
//                       Posted at {formatDate(post.createdAt)}
//                     </p>
//                   </div>
                  
//                   {/* Map button for NGO/FD/admin users */}
//                   {(canViewMap() || currentUserRole === "admin") && (
//                     <button
//                       onClick={() => handleShowMap(post)}
//                       className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
//                       title="View Location"
//                     >
//                       <UilMapMarker size="20" className="mr-1" />
//                       Location
//                     </button>
//                   )}
//                 </div>

//                 {/* Content */}
//                 <p className="text-lg mb-4">{post.content}</p>

//                 {/* Media */}
//                 {post.mediaUrl && (
//                   <div className="mb-4">
//                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
//                   </div>
//                 )}

//                 {/* Engagement */}
//                 <div className="flex justify-between items-center mt-4">
//                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
//                 </div>

//                 {/* Actions */}
//                 <div className="flex justify-between items-center mt-4">
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleVote(post.id, "upvotes")}
//                   >
//                     {hasUpvoted ? (
//                       <AiFillLike size="24" className="mr-1 text-blue-500" />
//                     ) : (
//                       <UilThumbsUp size="24" className="mr-1" />
//                     )}
//                     <span>{post.upvotes || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleVote(post.id, "downvotes")}
//                   >
//                     {hasDownvoted ? (
//                       <AiFillDislike size="24" className="mr-1 text-red-500" />
//                     ) : (
//                       <UilThumbsDown size="24" className="mr-1" />
//                     )}
//                     <span>{post.downvotes || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleReport(post.id)}
//                   >
//                     <UilSick size="24" className="mr-1" />
//                     <span>{post.reports || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleShare(post.id)}
//                   >
//                     <UilShare size="24" className="mr-1" />
//                     <span>{post.shares || 0}</span>
//                   </button>
//                 </div>
                
//                 {/* Comments Section */}
//                 <div className="mt-4">
//                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
//                   {/* Show existing comments */}
//                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
//                     {comments[post.id] && comments[post.id].length > 0 ? (
//                       comments[post.id].map((comment) => (
//                         <div key={comment.id} className="border-b p-2">
//                           <p className="text-sm font-semibold">{comment.username}</p>
//                           <p className="text-sm">{comment.content}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
//                     )}
//                   </div>

//                   {/* Add a comment */}
//                   {currentUser && (
//                     <div className="mt-2 flex">
//                       <input
//                         type="text"
//                         placeholder="Write a comment..."
//                         value={newComment}
//                         onChange={(e) => setNewComment(e.target.value)}
//                         className="flex-grow p-2 border rounded-l-md"
//                       />
//                       <button
//                         onClick={() => handleAddComment(post.id)}
//                         className="bg-blue-500 text-white px-4 rounded-r-md"
//                       >
//                         Comment
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Map Dialog - Only render when showMapDialog is true */}
//       {showMapDialog && <MapDialog />}

//       {/* Share Modal Component - Only show when showShareDialog is true */}
//       {showShareDialog && (
//         <ShareModal 
//           isOpen={showShareDialog}
//           onClose={() => setShowShareDialog(false)}
//           url={shareUrl}
//           title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
//         />
//       )}
      
//       {/* Toxicity Alert Component */}
//       {showToxicityAlert && (
//         <ToxicityAlert
//           isOpen={showToxicityAlert}
//           result={toxicityResults}
//           onClose={() => setShowToxicityAlert(false)}
//         />
//       )}
//     </div>
//   );
// };

// export default Post;
// import React, { useEffect, useState } from "react";
// import { db, auth } from "./config/firebase";
// import Navbar from "./Navbar";
// import { deleteDoc } from "firebase/firestore";
// import {
//   collection,
//   getDocs,
//   doc,
//   updateDoc,
//   increment,
//   setDoc,
//   getDoc,
//   query,
//   orderBy,
//   where
// } from "firebase/firestore";
// import { onAuthStateChanged } from "firebase/auth";
// import {
//   UilAngleUp,
//   UilAngleDown,
//   UilSick,
//   UilShare,
//   UilThumbsUp,
//   UilThumbsDown,
//   UilMapMarker,
//   UilTimes
// } from "@iconscout/react-unicons";

// import { AiFillLike } from "react-icons/ai";
// import { AiFillDislike } from "react-icons/ai";
// import ShareModal from "./ShareModal";
// import ToxicityAlert from "./ToxicityAlert";
// // Import map components
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// // Import TensorFlow properly - use dynamic import to handle potential loading issues
// import * as tf from '@tensorflow/tfjs';

// // Fix Leaflet marker issue (default icons don't load correctly in React)
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
//   iconUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
//   shadowUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
// });

// const Post = ({ userId }) => {
//   const [posts, setPosts] = useState([]);
//   const [userDetails, setUserDetails] = useState({});
//   const [shareUrl, setShareUrl] = useState("");
//   const [showShareDialog, setShowShareDialog] = useState(false);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [currentUserRole, setCurrentUserRole] = useState("");
//   const [comments, setComments] = useState({});
//   const [newComment, setNewComment] = useState("");
//   const [userPincode, setUserPincode] = useState("");
//   const [showAllPosts, setShowAllPosts] = useState(false);
//   const [filteredPosts, setFilteredPosts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
//   const [toxicityModel, setToxicityModel] = useState(null);
//   const [showToxicityAlert, setShowToxicityAlert] = useState(false);
//   const [toxicityResults, setToxicityResults] = useState(null);
//   const [selectedPostId, setSelectedPostId] = useState(null);
//   const [isToxicityModelLoading, setIsToxicityModelLoading] = useState(true);
  
//   // Map dialog states
//   const [showMapDialog, setShowMapDialog] = useState(false);
//   const [mapLat, setMapLat] = useState(19.076);
//   const [mapLng, setMapLng] = useState(72.8777);
  
//   // Step 1: Get the current user
//   useEffect(() => {
//     console.log("Starting auth state observer");
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         setCurrentUser(user);
//         console.log("User ID:", user.uid);
        
//         // Fetch user's pincode and role
//         const fetchUserData = async () => {
//           try {
//             const userRef = doc(db, "users", user.uid);
//             const userSnap = await getDoc(userRef);
//             if (userSnap.exists()) {
//               const userData = userSnap.data();
//               console.log("User data:", userData);
//               // Check both possible field names for pincode
//               const pincode = userData.pinCode || userData.pincode || "";
//               const role = userData.role || "";
//               setUserPincode(pincode);
//               setCurrentUserRole(role);
//               console.log("Set user pincode to:", pincode);
//               console.log("Set user role to:", role);
//             } else {
//               console.log("No user document found");
//             }
//           } catch (error) {
//             console.error("Error fetching user data:", error);
//           }
//         };
        
//         fetchUserData();
//       } else {
//         setCurrentUser(null);
//         setUserPincode("");
//         setCurrentUserRole("");
//         console.log("No user is currently logged in");
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   // Load TensorFlow Toxicity model with error handling
//   useEffect(() => {
//     const loadToxicityModel = async () => {
//       setIsToxicityModelLoading(true);
//       try {
//         // Dynamically import the toxicity module
//         const toxicity = await import('@tensorflow-models/toxicity');
        
//         // Set a threshold that matches the model's default threshold (0.9)
//         const threshold = 0.4;
//         const model = await toxicity.load(threshold);
//         setToxicityModel(model);
//         console.log("Toxicity model loaded successfully");
//       } catch (error) {
//         console.error("Error loading toxicity model:", error);
//         // Continue without the model - we'll handle this in checkToxicity
//       } finally {
//         setIsToxicityModelLoading(false);
//       }
//     };
    
//     loadToxicityModel();
//   }, []);

//   // Step 2: Fetch posts
//   useEffect(() => {
//     const fetchPosts = async () => {
//       console.log("Fetching posts");
//       setLoading(true);
//       try {
//         // Get all posts ordered by creation date (newest first)
//         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(postsQuery);
        
//         console.log("Got posts:", querySnapshot.size);
        
//         const postsData = querySnapshot.docs
//           .map((doc) => {
//             const data = doc.data();
//             console.log("Post data:", doc.id, data);
//             return {
//               id: doc.id,
//               ...data,
//               // Ensure createdAt is processed properly
//               createdAt: data.createdAt 
//                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
//                 : new Date(),
//               // Ensure pincode is a string for consistent comparison
//               pincode: data.pincode ? data.pincode.toString() : ""
//             };
//           })
//           .filter((post) => (post.reports || 0) < 3);
        
//         console.log("Filtered posts:", postsData.length);
//         setPosts(postsData);

//         // Fetch user details for each post
//         const usersData = {};
//         for (const post of postsData) {
//           if (!usersData[post.userId] && post.userId) {
//             try {
//               const userRef = doc(db, "users", post.userId);
//               const userSnap = await getDoc(userRef);
//               if (userSnap.exists()) {
//                 usersData[post.userId] = userSnap.data();
//               }
//             } catch (error) {
//               console.error(`Error fetching user details for ${post.userId}:`, error);
//             }
//           }
//         }
//         setUserDetails(usersData);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching posts:", error);
//         setLoading(false);
//       }
//     };

//     fetchPosts();
//   }, []);

//   // Step 3: Filter posts by pincode
//   useEffect(() => {
//     console.log("Filtering posts. User pincode:", userPincode);
//     console.log("Show all posts:", showAllPosts);
//     console.log("Total posts:", posts.length);
    
//     if (posts.length === 0) {
//       setFilteredPosts([]);
//       return;
//     }
    
//     if (!showAllPosts && userPincode) {
//       console.log("Filtering by pincode:", userPincode);
//       const pincodeFilteredPosts = posts.filter(post => {
//         const postPincode = post.pincode ? post.pincode.toString() : "";
//         const userPincodeStr = userPincode.toString();
        
//         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
//                    "Match:", postPincode === userPincodeStr);
        
//         return postPincode === userPincodeStr;
//       });
      
//       console.log("Filtered posts count:", pincodeFilteredPosts.length);
//       setFilteredPosts(pincodeFilteredPosts);
//     } else {
//       console.log("Showing all posts");
//       setFilteredPosts(posts);
//     }
//   }, [userPincode, posts, showAllPosts]);

//   // Step 4: Fetch comments and user votes
//   useEffect(() => {
//     const fetchCommentsAndVotes = async () => {
//       console.log("Fetching comments and votes");
//       try {
//         // Fetch comments
//         const commentsData = {};
//         const querySnapshot = await getDocs(collection(db, "comments"));
//         querySnapshot.forEach((doc) => {
//           const data = doc.data();
//           if (!commentsData[data.postId]) {
//             commentsData[data.postId] = [];
//           }
          
//           // Convert timestamp to date object if needed
//           const timestamp = data.timestamp && data.timestamp.toDate 
//             ? data.timestamp.toDate() 
//             : data.timestamp || new Date();
            
//           commentsData[data.postId].push({ 
//             id: doc.id, 
//             ...data,
//             timestamp: timestamp
//           });
//         });
    
//         // Sort comments by timestamp
//         Object.keys(commentsData).forEach(postId => {
//           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
//         });
        
//         setComments(commentsData);
//         console.log("Comments loaded:", Object.keys(commentsData).length);
        
//         // Fetch user votes if user is logged in
//         if (currentUser) {
//           const userUpvotes = {};
//           const userDownvotes = {};
          
//           // Fetch upvotes
//           const upvotesQuery = query(
//             collection(db, "upvotes"), 
//             where("userId", "==", currentUser.uid)
//           );
//           const upvotesSnapshot = await getDocs(upvotesQuery);
//           upvotesSnapshot.forEach(doc => {
//             const data = doc.data();
//             userUpvotes[data.postId] = true;
//           });
          
//           // Fetch downvotes
//           const downvotesQuery = query(
//             collection(db, "downvotes"), 
//             where("userId", "==", currentUser.uid)
//           );
//           const downvotesSnapshot = await getDocs(downvotesQuery);
//           downvotesSnapshot.forEach(doc => {
//             const data = doc.data();
//             userDownvotes[data.postId] = true;
//           });
          
//           setUserVotes({
//             upvotes: userUpvotes,
//             downvotes: userDownvotes
//           });
          
//           console.log("User votes loaded:", {
//             upvotes: Object.keys(userUpvotes).length,
//             downvotes: Object.keys(userDownvotes).length
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching comments and votes:", error);
//       }
//     };
  
//     fetchCommentsAndVotes();
//   }, [currentUser]);
  
//   const handleVote = async (postId, type) => {
//     if (!currentUser) {
//       console.log("User must be logged in to vote");
//       return;
//     }
    
//     const currentUserId = currentUser.uid;
//     const postRef = doc(db, "posts", postId);
    
//     // Use different collections for upvotes and downvotes
//     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
//     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
//     try {
//       // Check if the user has already upvoted or downvoted
//       const upvoteSnap = await getDoc(upvoteRef);
//       const downvoteSnap = await getDoc(downvoteRef);
//       const hasUpvoted = upvoteSnap.exists();
//       const hasDownvoted = downvoteSnap.exists();
  
//       // If clicking the same vote type they already did - do nothing
//       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
//         console.log("User has already voted this way");
//         return;
//       }
  
//       // If user is trying to upvote but has already downvoted
//       if (type === "upvotes" && hasDownvoted) {
//         // Remove downvote document
//         await deleteDoc(downvoteRef);
        
//         // Add upvote document
//         await setDoc(upvoteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post counts: decrease downvotes by 1, increase upvotes by 1
//         await updateDoc(postRef, { 
//           downvotes: increment(-1),
//           upvotes: increment(1)
//         });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           upvotes: { ...prev.upvotes, [postId]: true },
//           downvotes: { ...prev.downvotes, [postId]: false }
//         }));
        
//         // Update posts state
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   upvotes: (post.upvotes || 0) + 1,
//                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
//       } 
//       // If user is trying to downvote but has already upvoted
//       else if (type === "downvotes" && hasUpvoted) {
//         // Remove upvote document
//         await deleteDoc(upvoteRef);
        
//         // Add downvote document
//         await setDoc(downvoteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post counts: decrease upvotes by 1, increase downvotes by 1
//         await updateDoc(postRef, { 
//           upvotes: increment(-1),
//           downvotes: increment(1)
//         });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           upvotes: { ...prev.upvotes, [postId]: false },
//           downvotes: { ...prev.downvotes, [postId]: true }
//         }));
        
//         // Update posts state
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   downvotes: (post.downvotes || 0) + 1,
//                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
        
//         // Also update filteredPosts state to reflect changes
//         setFilteredPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { 
//                   ...post, 
//                   downvotes: (post.downvotes || 0) + 1,
//                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
//                 }
//               : post
//           )
//         );
//       }
//       // New vote (user hasn't voted before)
//       else {
//         // Determine which collection to use based on vote type
//         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
//         // Create new vote document in the appropriate collection
//         await setDoc(voteRef, { 
//           voted: true, 
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
        
//         // Update post count
//         await updateDoc(postRef, { [type]: increment(1) });
        
//         // Update local state for votes
//         setUserVotes(prev => ({
//           ...prev,
//           [type]: { ...prev[type], [postId]: true }
//         }));
        
//         // Update both posts and filteredPosts states
//         setPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { ...post, [type]: (post[type] || 0) + 1 }
//               : post
//           )
//         );
        
//         setFilteredPosts((prev) =>
//           prev.map((post) =>
//             post.id === postId
//               ? { ...post, [type]: (post[type] || 0) + 1 }
//               : post
//           )
//         );
//       }
//     } catch (error) {
//       console.error("Error handling vote:", error);
//     }
//   };

//   const handleReport = async (postId) => {
//     if (!currentUser) {
//       console.log("User must be logged in to report");
//       return;
//     }
    
//     const currentUserId = currentUser.uid;
//     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
//     const postRef = doc(db, "posts", postId);

//     try {
//       const reportSnap = await getDoc(reportRef);
//       if (!reportSnap.exists()) {
//         await setDoc(reportRef, { 
//           reported: true,
//           timestamp: new Date(),
//           userId: currentUserId,
//           postId: postId
//         });
//         await updateDoc(postRef, { reports: increment(1) });
        
//         // Update both posts and filteredPosts states
//         setPosts((prev) => prev.filter((post) => post.id !== postId));
//         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
//       }
//     } catch (error) {
//       console.error("Error reporting:", error);
//     }
//   };

//   const handleShare = async (postId) => {
//     const postRef = doc(db, "posts", postId);
//     // Create the proper URL with the domain and route pattern
//     const url = `https://saitransgression.netlify.app/post/${postId}`;
//     setShareUrl(url);
//     setSelectedPostId(postId);
//     setShowShareDialog(true);

//     try {
//       await updateDoc(postRef, { shares: increment(1) });
      
//       // Update both posts and filteredPosts states
//       setPosts((prev) =>
//         prev.map((post) =>
//           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
//         )
//       );
      
//       setFilteredPosts((prev) =>
//         prev.map((post) =>
//           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
//         )
//       );
//     } catch (error) {
//       console.error("Error sharing:", error);
//     }
//   };

//   // Handle map location button click (only for NGO and FD roles)
//   const handleShowMap = (post) => {
//     // Set map coordinates based on post location or default
//     if (post.latitude && post.longitude) {
//       setMapLat(parseFloat(post.latitude));
//       setMapLng(parseFloat(post.longitude));
//     } else {
//       // Default coordinates if no location in post
//       setMapLat(19.076);
//       setMapLng(72.8777);
//     }
//     setShowMapDialog(true);
//   };

//   // Check if current user has NGO or FD role
//   const canViewMap = () => {
//     return currentUserRole === "NGO" || currentUserRole === "FD"|| currentUserRole === "admin";
//   };

//   // Check comment for toxicity with fallback
//   const checkToxicity = async (text) => {
//     if (!toxicityModel) {
//       console.warn("Toxicity model not loaded yet");
//       return null;
//     }
    
//     try {
//       const predictions = await toxicityModel.classify(text);
//       // Find any toxic categories
//       const toxicLabels = predictions
//         .filter(prediction => prediction.results[0].match)
//         .map(prediction => ({
//           label: prediction.label,
//           probability: prediction.results[0].probabilities[1] // Probability of being toxic
//         }));
      
//       return toxicLabels.length > 0 ? toxicLabels : null;
//     } catch (error) {
//       console.error("Error checking toxicity:", error);
//       return null;
//     }
//   };

//   const handleAddComment = async (postId) => {
//   if (!currentUser || newComment.trim() === "") return;
  
//   // Only check toxicity if model is loaded
//   if (toxicityModel && !isToxicityModelLoading) {
//     const toxicContent = await checkToxicity(newComment);
//     if (toxicContent && toxicContent.length > 0) {
//       console.log("Toxic content detected:", toxicContent);
//       setToxicityResults(toxicContent);
//       setShowToxicityAlert(true);
//       return;
//     }
//   }

//   try {
//     // Fetch the user document from Firestore
//     const userRef = doc(db, "users", currentUser.uid);
//     const userSnap = await getDoc(userRef);

//     let username = "Anonymous"; // Default username
//     if (userSnap.exists()) {
//       username = userSnap.data().username || "Anonymous";
//     }

//     // Comment data including fetched username
//     const commentData = {
//       postId,
//       userId: currentUser.uid,
//       username, // Use the fetched username
//       content: newComment,
//       timestamp: new Date(),
//     };

//     // Store the comment in Firestore
//     const commentRef = doc(collection(db, "comments"));
//     await setDoc(commentRef, commentData);

//     // Update UI to reflect new comment
//     setComments((prev) => ({
//       ...prev,
//       [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
//     }));

//     setNewComment(""); // Clear the input field
//   } catch (error) {
//     console.error("Error adding comment:", error);
//   }
// };

  
//   const toggleViewAllPosts = () => {
//     setShowAllPosts(!showAllPosts);
//   };

//   // Display formatted time
//   const formatDate = (timestamp) => {
//     if (!timestamp) return 'Unknown time';
    
//     try {
//       // Convert Firebase timestamp to JS Date if needed
//       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
//       return date.toLocaleString();
//     } catch (error) {
//       console.error("Error formatting date:", error, timestamp);
//       return 'Invalid date';
//     }
//   };

//   // Map Dialog Component
//   const MapDialog = () => {
//     const handleMapChange = (e, setter) => {
//       setter(parseFloat(e.target.value));
//     };

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-auto">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-2xl font-bold text-blue-700">Location Map</h2>
//             <button
//               onClick={() => setShowMapDialog(false)}
//               className="text-gray-500 hover:text-gray-700"
//             >
//               <UilTimes size="24" />
//             </button>
//           </div>
          
//           {/* Input fields to change coordinates */}
//           <div className="flex space-x-4 mb-4">
//             <div>
//               <label className="block text-gray-700 font-medium">Latitude</label>
//               <input
//                 type="number"
//                 value={mapLat}
//                 onChange={(e) => handleMapChange(e, setMapLat)}
//                 className="border px-3 py-2 rounded-md w-32"
//                 step="0.000001"
//               />
//             </div>
//             <div>
//               <label className="block text-gray-700 font-medium">Longitude</label>
//               <input
//                 type="number"
//                 value={mapLng}
//                 onChange={(e) => handleMapChange(e, setMapLng)}
//                 className="border px-3 py-2 rounded-md w-32"
//                 step="0.000001"
//               />
//             </div>
//           </div>
          
//           {/* Map Section */}
//           <div className="h-96 w-full">
//             <MapContainer
//               center={[mapLat, mapLng]}
//               zoom={13}
//               style={{ height: "100%", width: "100%" }}
//               key={`${mapLat}-${mapLng}`} // re-render map when coords change
//             >
//               {/* TileLayer from OpenStreetMap */}
//               <TileLayer
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
//               />
//               {/* Marker for current coordinates */}
//               <Marker position={[mapLat, mapLng]}>
//                 <Popup>
//                   <b>Current Location</b>
//                   <br />
//                   Lat: {mapLat}, Lng: {mapLng}
//                 </Popup>
//               </Marker>
//             </MapContainer>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
//       {/* Post View Options */}
//       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
//         <div className="bg-white p-4 rounded-lg shadow-lg">
//           <h2 className="text-lg font-bold mb-2">
//             {loading ? "Loading posts..." : 
//               showAllPosts ? "Viewing All Posts" : 
//               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
//           </h2>
//           <div className="flex space-x-2">
//             <button
//               onClick={toggleViewAllPosts}
//               className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
//             >
//               {showAllPosts ? "View Local Posts" : "View All Posts"}
//             </button>
            
//             {/* Show current user role for debugging */}
//             {currentUserRole && (
//               <span className="bg-gray-200 px-3 py-2 rounded-md text-sm">
//                 Role: {currentUserRole}
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Posts */}
//       <div className="w-full max-w-2xl px-4">
//         {loading ? (
//           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
//             <p className="text-lg text-gray-700">Loading posts...</p>
//           </div>
//         ) : filteredPosts.length === 0 ? (
//           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
//             <p className="text-lg text-gray-700">
//               {!userPincode && !showAllPosts 
//                 ? "No pincode set. Please update your profile." 
//                 : "No posts available."}
//             </p>
//           </div>
//         ) : (
//           filteredPosts.map((post) => {
//             const user = userDetails[post.userId] || {};
//             const hasUpvoted = userVotes.upvotes[post.id];
//             const hasDownvoted = userVotes.downvotes[post.id];
            
//             return (
//               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
//                 {/* Header */}
//                 <div className="flex items-center mb-4">
//                   <img
//                     src={user.profilePic || "https://via.placeholder.com/50"}
//                     alt="Profile"
//                     className="rounded-full w-12 h-12 mr-3"
//                   />
//                   <div className="flex-grow">
//                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
//                     <p className="text-sm text-gray-600">
//                       Posted at {formatDate(post.createdAt)}
//                     </p>
//                   </div>
                  
//                   {/* Map button for NGO/FD users */}
//                   {canViewMap() && (
//                     <button
//                       onClick={() => handleShowMap(post)}
//                       className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
//                       title="View Location"
//                     >
//                       <UilMapMarker size="20" className="mr-1" />
//                       Location
//                     </button>
//                   )}
//                 </div>

//                 {/* Content */}
//                 <p className="text-lg mb-4">{post.content}</p>

//                 {/* Media */}
//                 {post.mediaUrl && (
//                   <div className="mb-4">
//                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
//                   </div>
//                 )}

//                 {/* Engagement */}
//                 <div className="flex justify-between items-center mt-4">
//                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
//                 </div>

//                 {/* Actions */}
//                 <div className="flex justify-between items-center mt-4">
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleVote(post.id, "upvotes")}
//                   >
//                     {hasUpvoted ? (
//                       <AiFillLike size="24" className="mr-1 text-blue-500" />
//                     ) : (
//                       <UilThumbsUp size="24" className="mr-1" />
//                     )}
//                     <span>{post.upvotes || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleVote(post.id, "downvotes")}
//                   >
//                     {hasDownvoted ? (
//                       <AiFillDislike size="24" className="mr-1 text-red-500" />
//                     ) : (
//                       <UilThumbsDown size="24" className="mr-1" />
//                     )}
//                     <span>{post.downvotes || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleReport(post.id)}
//                   >
//                     <UilSick size="24" className="mr-1" />
//                     <span>{post.reports || 0}</span>
//                   </button>
//                   <button
//                     className="flex items-center text-gray-600"
//                     onClick={() => handleShare(post.id)}
//                   >
//                     <UilShare size="24" className="mr-1" />
//                     <span>{post.shares || 0}</span>
//                   </button>
//                 </div>
                
//                 {/* Comments Section */}
//                 <div className="mt-4">
//                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
//                   {/* Show existing comments */}
//                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
//                     {comments[post.id] && comments[post.id].length > 0 ? (
//                       comments[post.id].map((comment) => (
//                         <div key={comment.id} className="border-b p-2">
//                           <p className="text-sm font-semibold">{comment.username}</p>
//                           <p className="text-sm">{comment.content}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
//                     )}
//                   </div>

//                   {/* Add a comment */}
//                   {currentUser && (
//                     <div className="mt-2 flex">
//                       <input
//                         type="text"
//                         placeholder="Write a comment..."
//                         value={newComment}
//                         onChange={(e) => setNewComment(e.target.value)}
//                         className="flex-grow p-2 border rounded-l-md"
//                       />
//                       <button
//                         onClick={() => handleAddComment(post.id)}
//                         className="bg-blue-500 text-white px-4 rounded-r-md"
//                       >
//                         Comment
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Map Dialog - Only render when showMapDialog is true */}
//       {showMapDialog && <MapDialog />}

//       {/* Share Modal Component - Only show when showShareDialog is true */}
//       {showShareDialog && (
//         <ShareModal 
//           isOpen={showShareDialog}
//           onClose={() => setShowShareDialog(false)}
//           url={shareUrl}
//           title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
//         />
//       )}
      
//       {/* Toxicity Alert Component */}
//       {showToxicityAlert && (
//         <ToxicityAlert
//           isOpen={showToxicityAlert}
//           result={toxicityResults}
//           onClose={() => setShowToxicityAlert(false)}
//         />
//       )}
//     </div>
//   );
// };

// export default Post;
// // import React, { useEffect, useState } from "react";
// // import { db, auth } from "./config/firebase";
// // import Navbar from "./Navbar";
// // import { deleteDoc } from "firebase/firestore";
// // import {
// //   collection,
// //   getDocs,
// //   doc,
// //   updateDoc,
// //   increment,
// //   setDoc,
// //   getDoc,
// //   query,
// //   orderBy,
// //   where
// // } from "firebase/firestore";
// // import { onAuthStateChanged } from "firebase/auth";
// // import {
// //   UilAngleUp,
// //   UilAngleDown,
// //   UilSick,
// //   UilShare,
// //   UilThumbsUp,
// //   UilThumbsDown,
// // } from "@iconscout/react-unicons";

// // import { AiFillLike } from "react-icons/ai";
// // import { AiFillDislike } from "react-icons/ai";
// // import ShareModal from "./ShareModal";
// // import ToxicityAlert from "./ToxicityAlert";
// // // Import TensorFlow properly - use dynamic import to handle potential loading issues
// // import * as tf from '@tensorflow/tfjs';

// // const Post = ({ userId }) => {
// //   const [posts, setPosts] = useState([]);
// //   const [userDetails, setUserDetails] = useState({});
// //   const [shareUrl, setShareUrl] = useState("");
// //   const [showShareDialog, setShowShareDialog] = useState(false);
// //   const [currentUser, setCurrentUser] = useState(null);
// //   const [comments, setComments] = useState({});
// //   const [newComment, setNewComment] = useState("");
// //   const [userPincode, setUserPincode] = useState("");
// //   const [showAllPosts, setShowAllPosts] = useState(false);
// //   const [filteredPosts, setFilteredPosts] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
// //   const [toxicityModel, setToxicityModel] = useState(null);
// //   const [showToxicityAlert, setShowToxicityAlert] = useState(false);
// //   const [toxicityResults, setToxicityResults] = useState(null);
// //   const [selectedPostId, setSelectedPostId] = useState(null);
// //   const [isToxicityModelLoading, setIsToxicityModelLoading] = useState(true);
  
// //   // Step 1: Get the current user
// //   useEffect(() => {
// //     console.log("Starting auth state observer");
// //     const unsubscribe = onAuthStateChanged(auth, (user) => {
// //       if (user) {
// //         setCurrentUser(user);
// //         console.log("User ID:", user.uid);
        
// //         // Fetch user's pincode
// //         const fetchUserPincode = async () => {
// //           try {
// //             const userRef = doc(db, "users", user.uid);
// //             const userSnap = await getDoc(userRef);
// //             if (userSnap.exists()) {
// //               const userData = userSnap.data();
// //               console.log("User data:", userData);
// //               // Check both possible field names for pincode
// //               const pincode = userData.pinCode || userData.pincode || "";
// //               setUserPincode(pincode);
// //               console.log("Set user pincode to:", pincode);
// //             } else {
// //               console.log("No user document found");
// //             }
// //           } catch (error) {
// //             console.error("Error fetching user pincode:", error);
// //           }
// //         };
        
// //         fetchUserPincode();
// //       } else {
// //         setCurrentUser(null);
// //         setUserPincode("");
// //         console.log("No user is currently logged in");
// //       }
// //     });

// //     return () => unsubscribe();
// //   }, []);

// //   // Load TensorFlow Toxicity model with error handling
// //   useEffect(() => {
// //     const loadToxicityModel = async () => {
// //       setIsToxicityModelLoading(true);
// //       try {
// //         // Dynamically import the toxicity module
// //         const toxicity = await import('@tensorflow-models/toxicity');
        
// //         // Set a threshold that matches the model's default threshold (0.9)
// //         const threshold = 0.4;
// //         const model = await toxicity.load(threshold);
// //         setToxicityModel(model);
// //         console.log("Toxicity model loaded successfully");
// //       } catch (error) {
// //         console.error("Error loading toxicity model:", error);
// //         // Continue without the model - we'll handle this in checkToxicity
// //       } finally {
// //         setIsToxicityModelLoading(false);
// //       }
// //     };
    
// //     loadToxicityModel();
// //   }, []);

// //   // Step 2: Fetch posts
// //   useEffect(() => {
// //     const fetchPosts = async () => {
// //       console.log("Fetching posts");
// //       setLoading(true);
// //       try {
// //         // Get all posts ordered by creation date (newest first)
// //         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
// //         const querySnapshot = await getDocs(postsQuery);
        
// //         console.log("Got posts:", querySnapshot.size);
        
// //         const postsData = querySnapshot.docs
// //           .map((doc) => {
// //             const data = doc.data();
// //             console.log("Post data:", doc.id, data);
// //             return {
// //               id: doc.id,
// //               ...data,
// //               // Ensure createdAt is processed properly
// //               createdAt: data.createdAt 
// //                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
// //                 : new Date(),
// //               // Ensure pincode is a string for consistent comparison
// //               pincode: data.pincode ? data.pincode.toString() : ""
// //             };
// //           })
// //           .filter((post) => (post.reports || 0) < 3);
        
// //         console.log("Filtered posts:", postsData.length);
// //         setPosts(postsData);

// //         // Fetch user details for each post
// //         const usersData = {};
// //         for (const post of postsData) {
// //           if (!usersData[post.userId] && post.userId) {
// //             try {
// //               const userRef = doc(db, "users", post.userId);
// //               const userSnap = await getDoc(userRef);
// //               if (userSnap.exists()) {
// //                 usersData[post.userId] = userSnap.data();
// //               }
// //             } catch (error) {
// //               console.error(`Error fetching user details for ${post.userId}:`, error);
// //             }
// //           }
// //         }
// //         setUserDetails(usersData);
// //         setLoading(false);
// //       } catch (error) {
// //         console.error("Error fetching posts:", error);
// //         setLoading(false);
// //       }
// //     };

// //     fetchPosts();
// //   }, []);

// //   // Step 3: Filter posts by pincode
// //   useEffect(() => {
// //     console.log("Filtering posts. User pincode:", userPincode);
// //     console.log("Show all posts:", showAllPosts);
// //     console.log("Total posts:", posts.length);
    
// //     if (posts.length === 0) {
// //       setFilteredPosts([]);
// //       return;
// //     }
    
// //     if (!showAllPosts && userPincode) {
// //       console.log("Filtering by pincode:", userPincode);
// //       const pincodeFilteredPosts = posts.filter(post => {
// //         const postPincode = post.pincode ? post.pincode.toString() : "";
// //         const userPincodeStr = userPincode.toString();
        
// //         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
// //                    "Match:", postPincode === userPincodeStr);
        
// //         return postPincode === userPincodeStr;
// //       });
      
// //       console.log("Filtered posts count:", pincodeFilteredPosts.length);
// //       setFilteredPosts(pincodeFilteredPosts);
// //     } else {
// //       console.log("Showing all posts");
// //       setFilteredPosts(posts);
// //     }
// //   }, [userPincode, posts, showAllPosts]);

// //   // Step 4: Fetch comments and user votes
// //   useEffect(() => {
// //     const fetchCommentsAndVotes = async () => {
// //       console.log("Fetching comments and votes");
// //       try {
// //         // Fetch comments
// //         const commentsData = {};
// //         const querySnapshot = await getDocs(collection(db, "comments"));
// //         querySnapshot.forEach((doc) => {
// //           const data = doc.data();
// //           if (!commentsData[data.postId]) {
// //             commentsData[data.postId] = [];
// //           }
          
// //           // Convert timestamp to date object if needed
// //           const timestamp = data.timestamp && data.timestamp.toDate 
// //             ? data.timestamp.toDate() 
// //             : data.timestamp || new Date();
            
// //           commentsData[data.postId].push({ 
// //             id: doc.id, 
// //             ...data,
// //             timestamp: timestamp
// //           });
// //         });
    
// //         // Sort comments by timestamp
// //         Object.keys(commentsData).forEach(postId => {
// //           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
// //         });
        
// //         setComments(commentsData);
// //         console.log("Comments loaded:", Object.keys(commentsData).length);
        
// //         // Fetch user votes if user is logged in
// //         if (currentUser) {
// //           const userUpvotes = {};
// //           const userDownvotes = {};
          
// //           // Fetch upvotes
// //           const upvotesQuery = query(
// //             collection(db, "upvotes"), 
// //             where("userId", "==", currentUser.uid)
// //           );
// //           const upvotesSnapshot = await getDocs(upvotesQuery);
// //           upvotesSnapshot.forEach(doc => {
// //             const data = doc.data();
// //             userUpvotes[data.postId] = true;
// //           });
          
// //           // Fetch downvotes
// //           const downvotesQuery = query(
// //             collection(db, "downvotes"), 
// //             where("userId", "==", currentUser.uid)
// //           );
// //           const downvotesSnapshot = await getDocs(downvotesQuery);
// //           downvotesSnapshot.forEach(doc => {
// //             const data = doc.data();
// //             userDownvotes[data.postId] = true;
// //           });
          
// //           setUserVotes({
// //             upvotes: userUpvotes,
// //             downvotes: userDownvotes
// //           });
          
// //           console.log("User votes loaded:", {
// //             upvotes: Object.keys(userUpvotes).length,
// //             downvotes: Object.keys(userDownvotes).length
// //           });
// //         }
// //       } catch (error) {
// //         console.error("Error fetching comments and votes:", error);
// //       }
// //     };
  
// //     fetchCommentsAndVotes();
// //   }, [currentUser]);
  
// //   const handleVote = async (postId, type) => {
// //     if (!currentUser) {
// //       console.log("User must be logged in to vote");
// //       return;
// //     }
    
// //     const currentUserId = currentUser.uid;
// //     const postRef = doc(db, "posts", postId);
    
// //     // Use different collections for upvotes and downvotes
// //     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
// //     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
// //     try {
// //       // Check if the user has already upvoted or downvoted
// //       const upvoteSnap = await getDoc(upvoteRef);
// //       const downvoteSnap = await getDoc(downvoteRef);
// //       const hasUpvoted = upvoteSnap.exists();
// //       const hasDownvoted = downvoteSnap.exists();
  
// //       // If clicking the same vote type they already did - do nothing
// //       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
// //         console.log("User has already voted this way");
// //         return;
// //       }
  
// //       // If user is trying to upvote but has already downvoted
// //       if (type === "upvotes" && hasDownvoted) {
// //         // Remove downvote document
// //         await deleteDoc(downvoteRef);
        
// //         // Add upvote document
// //         await setDoc(upvoteRef, { 
// //           voted: true, 
// //           timestamp: new Date(),
// //           userId: currentUserId,
// //           postId: postId
// //         });
        
// //         // Update post counts: decrease downvotes by 1, increase upvotes by 1
// //         await updateDoc(postRef, { 
// //           downvotes: increment(-1),
// //           upvotes: increment(1)
// //         });
        
// //         // Update local state for votes
// //         setUserVotes(prev => ({
// //           upvotes: { ...prev.upvotes, [postId]: true },
// //           downvotes: { ...prev.downvotes, [postId]: false }
// //         }));
        
// //         // Update posts state
// //         setPosts((prev) =>
// //           prev.map((post) =>
// //             post.id === postId
// //               ? { 
// //                   ...post, 
// //                   upvotes: (post.upvotes || 0) + 1,
// //                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
// //                 }
// //               : post
// //           )
// //         );
// //       } 
// //       // If user is trying to downvote but has already upvoted
// //       else if (type === "downvotes" && hasUpvoted) {
// //         // Remove upvote document
// //         await deleteDoc(upvoteRef);
        
// //         // Add downvote document
// //         await setDoc(downvoteRef, { 
// //           voted: true, 
// //           timestamp: new Date(),
// //           userId: currentUserId,
// //           postId: postId
// //         });
        
// //         // Update post counts: decrease upvotes by 1, increase downvotes by 1
// //         await updateDoc(postRef, { 
// //           upvotes: increment(-1),
// //           downvotes: increment(1)
// //         });
        
// //         // Update local state for votes
// //         setUserVotes(prev => ({
// //           upvotes: { ...prev.upvotes, [postId]: false },
// //           downvotes: { ...prev.downvotes, [postId]: true }
// //         }));
        
// //         // Update posts state
// //         setPosts((prev) =>
// //           prev.map((post) =>
// //             post.id === postId
// //               ? { 
// //                   ...post, 
// //                   downvotes: (post.downvotes || 0) + 1,
// //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// //                 }
// //               : post
// //           )
// //         );
        
// //         // Also update filteredPosts state to reflect changes
// //         setFilteredPosts((prev) =>
// //           prev.map((post) =>
// //             post.id === postId
// //               ? { 
// //                   ...post, 
// //                   downvotes: (post.downvotes || 0) + 1,
// //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// //                 }
// //               : post
// //           )
// //         );
// //       }
// //       // New vote (user hasn't voted before)
// //       else {
// //         // Determine which collection to use based on vote type
// //         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
// //         // Create new vote document in the appropriate collection
// //         await setDoc(voteRef, { 
// //           voted: true, 
// //           timestamp: new Date(),
// //           userId: currentUserId,
// //           postId: postId
// //         });
        
// //         // Update post count
// //         await updateDoc(postRef, { [type]: increment(1) });
        
// //         // Update local state for votes
// //         setUserVotes(prev => ({
// //           ...prev,
// //           [type]: { ...prev[type], [postId]: true }
// //         }));
        
// //         // Update both posts and filteredPosts states
// //         setPosts((prev) =>
// //           prev.map((post) =>
// //             post.id === postId
// //               ? { ...post, [type]: (post[type] || 0) + 1 }
// //               : post
// //           )
// //         );
        
// //         setFilteredPosts((prev) =>
// //           prev.map((post) =>
// //             post.id === postId
// //               ? { ...post, [type]: (post[type] || 0) + 1 }
// //               : post
// //           )
// //         );
// //       }
// //     } catch (error) {
// //       console.error("Error handling vote:", error);
// //     }
// //   };

// //   const handleReport = async (postId) => {
// //     if (!currentUser) {
// //       console.log("User must be logged in to report");
// //       return;
// //     }
    
// //     const currentUserId = currentUser.uid;
// //     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
// //     const postRef = doc(db, "posts", postId);

// //     try {
// //       const reportSnap = await getDoc(reportRef);
// //       if (!reportSnap.exists()) {
// //         await setDoc(reportRef, { 
// //           reported: true,
// //           timestamp: new Date(),
// //           userId: currentUserId,
// //           postId: postId
// //         });
// //         await updateDoc(postRef, { reports: increment(1) });
        
// //         // Update both posts and filteredPosts states
// //         setPosts((prev) => prev.filter((post) => post.id !== postId));
// //         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
// //       }
// //     } catch (error) {
// //       console.error("Error reporting:", error);
// //     }
// //   };

// //   const handleShare = async (postId) => {
// //     const postRef = doc(db, "posts", postId);
// //     // Create the proper URL with the domain and route pattern
// //     const url = `https://saitransgression.netlify.app/post/${postId}`;
// //     setShareUrl(url);
// //     setSelectedPostId(postId);
// //     setShowShareDialog(true);

// //     try {
// //       await updateDoc(postRef, { shares: increment(1) });
      
// //       // Update both posts and filteredPosts states
// //       setPosts((prev) =>
// //         prev.map((post) =>
// //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// //         )
// //       );
      
// //       setFilteredPosts((prev) =>
// //         prev.map((post) =>
// //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// //         )
// //       );
// //     } catch (error) {
// //       console.error("Error sharing:", error);
// //     }
// //   };

// //   // Check comment for toxicity with fallback
// //   const checkToxicity = async (text) => {
// //     if (!toxicityModel) {
// //       console.warn("Toxicity model not loaded yet");
// //       return null;
// //     }
    
// //     try {
// //       const predictions = await toxicityModel.classify(text);
// //       // Find any toxic categories
// //       const toxicLabels = predictions
// //         .filter(prediction => prediction.results[0].match)
// //         .map(prediction => ({
// //           label: prediction.label,
// //           probability: prediction.results[0].probabilities[1] // Probability of being toxic
// //         }));
      
// //       return toxicLabels.length > 0 ? toxicLabels : null;
// //     } catch (error) {
// //       console.error("Error checking toxicity:", error);
// //       return null;
// //     }
// //   };

// //   const handleAddComment = async (postId) => {
// //   if (!currentUser || newComment.trim() === "") return;
  
// //   // Only check toxicity if model is loaded
// //   if (toxicityModel && !isToxicityModelLoading) {
// //     const toxicContent = await checkToxicity(newComment);
// //     if (toxicContent && toxicContent.length > 0) {
// //       console.log("Toxic content detected:", toxicContent);
// //       setToxicityResults(toxicContent);
// //       setShowToxicityAlert(true);
// //       return;
// //     }
// //   }

// //   try {
// //     // Fetch the user document from Firestore
// //     const userRef = doc(db, "users", currentUser.uid);
// //     const userSnap = await getDoc(userRef);

// //     let username = "Anonymous"; // Default username
// //     if (userSnap.exists()) {
// //       username = userSnap.data().username || "Anonymous";
// //     }

// //     // Comment data including fetched username
// //     const commentData = {
// //       postId,
// //       userId: currentUser.uid,
// //       username, // Use the fetched username
// //       content: newComment,
// //       timestamp: new Date(),
// //     };

// //     // Store the comment in Firestore
// //     const commentRef = doc(collection(db, "comments"));
// //     await setDoc(commentRef, commentData);

// //     // Update UI to reflect new comment
// //     setComments((prev) => ({
// //       ...prev,
// //       [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
// //     }));

// //     setNewComment(""); // Clear the input field
// //   } catch (error) {
// //     console.error("Error adding comment:", error);
// //   }
// // };

  
// //   const toggleViewAllPosts = () => {
// //     setShowAllPosts(!showAllPosts);
// //   };

// //   // Display formatted time
// //   const formatDate = (timestamp) => {
// //     if (!timestamp) return 'Unknown time';
    
// //     try {
// //       // Convert Firebase timestamp to JS Date if needed
// //       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
// //       return date.toLocaleString();
// //     } catch (error) {
// //       console.error("Error formatting date:", error, timestamp);
// //       return 'Invalid date';
// //     }
// //   };

// //   return (
// //     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
// //       {/* Post View Options */}
// //       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
// //         <div className="bg-white p-4 rounded-lg shadow-lg">
// //           <h2 className="text-lg font-bold mb-2">
// //             {loading ? "Loading posts..." : 
// //               showAllPosts ? "Viewing All Posts" : 
// //               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
// //           </h2>
// //           <button
// //             onClick={toggleViewAllPosts}
// //             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
// //           >
// //             {showAllPosts ? "View Local Posts" : "View All Posts"}
// //           </button>
// //         </div>
// //       </div>

// //       {/* Posts */}
// //       <div className="w-full max-w-2xl px-4">
// //         {loading ? (
// //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// //             <p className="text-lg text-gray-700">Loading posts...</p>
// //           </div>
// //         ) : filteredPosts.length === 0 ? (
// //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// //             <p className="text-lg text-gray-700">
// //               {!userPincode && !showAllPosts 
// //                 ? "No pincode set. Please update your profile." 
// //                 : "No posts available."}
// //             </p>
// //           </div>
// //         ) : (
// //           filteredPosts.map((post) => {
// //             const user = userDetails[post.userId] || {};
// //             const hasUpvoted = userVotes.upvotes[post.id];
// //             const hasDownvoted = userVotes.downvotes[post.id];
            
// //             return (
// //               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
// //                 {/* Header */}
// //                 <div className="flex items-center mb-4">
// //                   <img
// //                     src={user.profilePic || "https://via.placeholder.com/50"}
// //                     alt="Profile"
// //                     className="rounded-full w-12 h-12 mr-3"
// //                   />
// //                   <div>
// //                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
// //                     <p className="text-sm text-gray-600">
// //                       Posted at {formatDate(post.createdAt)}
// //                     </p>
// //                   </div>
// //                 </div>

// //                 {/* Content */}
// //                 <p className="text-lg mb-4">{post.content}</p>

// //                 {/* Media */}
// //                 {post.mediaUrl && (
// //                   <div className="mb-4">
// //                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
// //                   </div>
// //                 )}

// //                 {/* Engagement */}
// //                 <div className="flex justify-between items-center mt-4">
// //                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
// //                 </div>

// //                 {/* Actions */}
// //                 <div className="flex justify-between items-center mt-4">
// //                   <button
// //                     className="flex items-center text-gray-600"
// //                     onClick={() => handleVote(post.id, "upvotes")}
// //                   >
// //                     {hasUpvoted ? (
// //                       <AiFillLike size="24" className="mr-1 text-blue-500" />
// //                     ) : (
// //                       <UilThumbsUp size="24" className="mr-1" />
// //                     )}
// //                     <span>{post.upvotes || 0}</span>
// //                   </button>
// //                   <button
// //                     className="flex items-center text-gray-600"
// //                     onClick={() => handleVote(post.id, "downvotes")}
// //                   >
// //                     {hasDownvoted ? (
// //                       <AiFillDislike size="24" className="mr-1 text-red-500" />
// //                     ) : (
// //                       <UilThumbsDown size="24" className="mr-1" />
// //                     )}
// //                     <span>{post.downvotes || 0}</span>
// //                   </button>
// //                   <button
// //                     className="flex items-center text-gray-600"
// //                     onClick={() => handleReport(post.id)}
// //                   >
// //                     <UilSick size="24" className="mr-1" />
// //                     <span>{post.reports || 0}</span>
// //                   </button>
// //                   <button
// //                     className="flex items-center text-gray-600"
// //                     onClick={() => handleShare(post.id)}
// //                   >
// //                     <UilShare size="24" className="mr-1" />
// //                     <span>{post.shares || 0}</span>
// //                   </button>
// //                 </div>
                
// //                 {/* Comments Section */}
// //                 <div className="mt-4">
// //                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
// //                   {/* Show existing comments */}
// //                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
// //                     {comments[post.id] && comments[post.id].length > 0 ? (
// //                       comments[post.id].map((comment) => (
// //                         <div key={comment.id} className="border-b p-2">
// //                           <p className="text-sm font-semibold">{comment.username}</p>
// //                           <p className="text-sm">{comment.content}</p>
// //                         </div>
// //                       ))
// //                     ) : (
// //                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
// //                     )}
// //                   </div>

// //                   {/* Add a comment */}
// //                   {currentUser && (
// //                     <div className="mt-2 flex">
// //                       <input
// //                         type="text"
// //                         placeholder="Write a comment..."
// //                         value={newComment}
// //                         onChange={(e) => setNewComment(e.target.value)}
// //                         className="flex-grow p-2 border rounded-l-md"
// //                       />
// //                       <button
// //                         onClick={() => handleAddComment(post.id)}
// //                         className="bg-blue-500 text-white px-4 rounded-r-md"
// //                       >
// //                         Comment
// //                       </button>
// //                     </div>
// //                   )}
// //                 </div>
// //               </div>
// //             );
// //           })
// //         )}
// //       </div>

// //       {/* Share Modal Component - Only show when showShareDialog is true */}
// //       {showShareDialog && (
// //         <ShareModal 
// //           isOpen={showShareDialog}
// //           onClose={() => setShowShareDialog(false)}
// //           url={shareUrl}
// //           title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
// //         />
// //       )}
      
// //       {/* Toxicity Alert Component */}
// // {/*       {showToxicityAlert && (
// //         <ToxicityAlert
// //           results={toxicityResults}
// //           comment={newComment}
// //           onClose={() => setShowToxicityAlert(false)}
// //         />
// //       )} */}
// //         {showToxicityAlert && (
// //   <ToxicityAlert
// //     isOpen={showToxicityAlert}
// //     result={toxicityResults}
// //     onClose={() => setShowToxicityAlert(false)}
// //   />
// // )}
// //     </div>
// //   );
// // };

// // export default Post;

// // // import React, { useEffect, useState } from "react";
// // // import { db, auth } from "./config/firebase";
// // // import Navbar from "./Navbar";
// // // import { deleteDoc } from "firebase/firestore";
// // // import {
// // //   collection,
// // //   getDocs,
// // //   doc,
// // //   updateDoc,
// // //   increment,
// // //   setDoc,
// // //   getDoc,
// // //   query,
// // //   orderBy,
// // //   where
// // // } from "firebase/firestore";
// // // import { onAuthStateChanged } from "firebase/auth";
// // // import {
// // //   UilAngleUp,
// // //   UilAngleDown,
// // //   UilSick,
// // //   UilShare,
// // //   UilThumbsUp,
// // //   UilThumbsDown,
// // // } from "@iconscout/react-unicons";

// // // import { AiFillLike } from "react-icons/ai";
// // // import { AiFillDislike } from "react-icons/ai";
// // // import ShareModal from "./ShareModal";
// // // import ToxicityAlert from "./ToxicityAlert";
// // // // Import TensorFlow properly - use dynamic import to handle potential loading issues
// // // import * as tf from '@tensorflow/tfjs';

// // // const Post = ({ userId }) => {
// // //   const [posts, setPosts] = useState([]);
// // //   const [userDetails, setUserDetails] = useState({});
// // //   const [shareUrl, setShareUrl] = useState("");
// // //   const [showShareDialog, setShowShareDialog] = useState(false);
// // //   const [currentUser, setCurrentUser] = useState(null);
// // //   const [comments, setComments] = useState({});
// // //   const [newComment, setNewComment] = useState("");
// // //   const [userPincode, setUserPincode] = useState("");
// // //   const [showAllPosts, setShowAllPosts] = useState(false);
// // //   const [filteredPosts, setFilteredPosts] = useState([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
// // //   const [toxicityModel, setToxicityModel] = useState(null);
// // //   const [showToxicityAlert, setShowToxicityAlert] = useState(false);
// // //   const [toxicityResults, setToxicityResults] = useState(null);
// // //   const [selectedPostId, setSelectedPostId] = useState(null);
// // //   const [isToxicityModelLoading, setIsToxicityModelLoading] = useState(true);
  
// // //   // Step 1: Get the current user
// // //   useEffect(() => {
// // //     console.log("Starting auth state observer");
// // //     const unsubscribe = onAuthStateChanged(auth, (user) => {
// // //       if (user) {
// // //         setCurrentUser(user);
// // //         console.log("User ID:", user.uid);
        
// // //         // Fetch user's pincode
// // //         const fetchUserPincode = async () => {
// // //           try {
// // //             const userRef = doc(db, "users", user.uid);
// // //             const userSnap = await getDoc(userRef);
// // //             if (userSnap.exists()) {
// // //               const userData = userSnap.data();
// // //               console.log("User data:", userData);
// // //               // Check both possible field names for pincode
// // //               const pincode = userData.pinCode || userData.pincode || "";
// // //               setUserPincode(pincode);
// // //               console.log("Set user pincode to:", pincode);
// // //             } else {
// // //               console.log("No user document found");
// // //             }
// // //           } catch (error) {
// // //             console.error("Error fetching user pincode:", error);
// // //           }
// // //         };
        
// // //         fetchUserPincode();
// // //       } else {
// // //         setCurrentUser(null);
// // //         setUserPincode("");
// // //         console.log("No user is currently logged in");
// // //       }
// // //     });

// // //     return () => unsubscribe();
// // //   }, []);

// // //   // Load TensorFlow Toxicity model with error handling
// // //   useEffect(() => {
// // //     const loadToxicityModel = async () => {
// // //       setIsToxicityModelLoading(true);
// // //       try {
// // //         // Dynamically import the toxicity module
// // //         const toxicity = await import('@tensorflow-models/toxicity');
        
// // //         // Set a threshold that matches the model's default threshold (0.9)
// // //         const threshold = 0.4;
// // //         const model = await toxicity.load(threshold);
// // //         setToxicityModel(model);
// // //         console.log("Toxicity model loaded successfully");
// // //       } catch (error) {
// // //         console.error("Error loading toxicity model:", error);
// // //         // Continue without the model - we'll handle this in checkToxicity
// // //       } finally {
// // //         setIsToxicityModelLoading(false);
// // //       }
// // //     };
    
// // //     loadToxicityModel();
// // //   }, []);

// // //   // Step 2: Fetch posts
// // //   useEffect(() => {
// // //     const fetchPosts = async () => {
// // //       console.log("Fetching posts");
// // //       setLoading(true);
// // //       try {
// // //         // Get all posts ordered by creation date (newest first)
// // //         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
// // //         const querySnapshot = await getDocs(postsQuery);
        
// // //         console.log("Got posts:", querySnapshot.size);
        
// // //         const postsData = querySnapshot.docs
// // //           .map((doc) => {
// // //             const data = doc.data();
// // //             console.log("Post data:", doc.id, data);
// // //             return {
// // //               id: doc.id,
// // //               ...data,
// // //               // Ensure createdAt is processed properly
// // //               createdAt: data.createdAt 
// // //                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
// // //                 : new Date(),
// // //               // Ensure pincode is a string for consistent comparison
// // //               pincode: data.pincode ? data.pincode.toString() : ""
// // //             };
// // //           })
// // //           .filter((post) => (post.reports || 0) < 3);
        
// // //         console.log("Filtered posts:", postsData.length);
// // //         setPosts(postsData);

// // //         // Fetch user details for each post
// // //         const usersData = {};
// // //         for (const post of postsData) {
// // //           if (!usersData[post.userId] && post.userId) {
// // //             try {
// // //               const userRef = doc(db, "users", post.userId);
// // //               const userSnap = await getDoc(userRef);
// // //               if (userSnap.exists()) {
// // //                 usersData[post.userId] = userSnap.data();
// // //               }
// // //             } catch (error) {
// // //               console.error(`Error fetching user details for ${post.userId}:`, error);
// // //             }
// // //           }
// // //         }
// // //         setUserDetails(usersData);
// // //         setLoading(false);
// // //       } catch (error) {
// // //         console.error("Error fetching posts:", error);
// // //         setLoading(false);
// // //       }
// // //     };

// // //     fetchPosts();
// // //   }, []);

// // //   // Step 3: Filter posts by pincode
// // //   useEffect(() => {
// // //     console.log("Filtering posts. User pincode:", userPincode);
// // //     console.log("Show all posts:", showAllPosts);
// // //     console.log("Total posts:", posts.length);
    
// // //     if (posts.length === 0) {
// // //       setFilteredPosts([]);
// // //       return;
// // //     }
    
// // //     if (!showAllPosts && userPincode) {
// // //       console.log("Filtering by pincode:", userPincode);
// // //       const pincodeFilteredPosts = posts.filter(post => {
// // //         const postPincode = post.pincode ? post.pincode.toString() : "";
// // //         const userPincodeStr = userPincode.toString();
        
// // //         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
// // //                    "Match:", postPincode === userPincodeStr);
        
// // //         return postPincode === userPincodeStr;
// // //       });
      
// // //       console.log("Filtered posts count:", pincodeFilteredPosts.length);
// // //       setFilteredPosts(pincodeFilteredPosts);
// // //     } else {
// // //       console.log("Showing all posts");
// // //       setFilteredPosts(posts);
// // //     }
// // //   }, [userPincode, posts, showAllPosts]);

// // //   // Step 4: Fetch comments and user votes
// // //   useEffect(() => {
// // //     const fetchCommentsAndVotes = async () => {
// // //       console.log("Fetching comments and votes");
// // //       try {
// // //         // Fetch comments
// // //         const commentsData = {};
// // //         const querySnapshot = await getDocs(collection(db, "comments"));
// // //         querySnapshot.forEach((doc) => {
// // //           const data = doc.data();
// // //           if (!commentsData[data.postId]) {
// // //             commentsData[data.postId] = [];
// // //           }
          
// // //           // Convert timestamp to date object if needed
// // //           const timestamp = data.timestamp && data.timestamp.toDate 
// // //             ? data.timestamp.toDate() 
// // //             : data.timestamp || new Date();
            
// // //           commentsData[data.postId].push({ 
// // //             id: doc.id, 
// // //             ...data,
// // //             timestamp: timestamp
// // //           });
// // //         });
    
// // //         // Sort comments by timestamp
// // //         Object.keys(commentsData).forEach(postId => {
// // //           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
// // //         });
        
// // //         setComments(commentsData);
// // //         console.log("Comments loaded:", Object.keys(commentsData).length);
        
// // //         // Fetch user votes if user is logged in
// // //         if (currentUser) {
// // //           const userUpvotes = {};
// // //           const userDownvotes = {};
          
// // //           // Fetch upvotes
// // //           const upvotesQuery = query(
// // //             collection(db, "upvotes"), 
// // //             where("userId", "==", currentUser.uid)
// // //           );
// // //           const upvotesSnapshot = await getDocs(upvotesQuery);
// // //           upvotesSnapshot.forEach(doc => {
// // //             const data = doc.data();
// // //             userUpvotes[data.postId] = true;
// // //           });
          
// // //           // Fetch downvotes
// // //           const downvotesQuery = query(
// // //             collection(db, "downvotes"), 
// // //             where("userId", "==", currentUser.uid)
// // //           );
// // //           const downvotesSnapshot = await getDocs(downvotesQuery);
// // //           downvotesSnapshot.forEach(doc => {
// // //             const data = doc.data();
// // //             userDownvotes[data.postId] = true;
// // //           });
          
// // //           setUserVotes({
// // //             upvotes: userUpvotes,
// // //             downvotes: userDownvotes
// // //           });
          
// // //           console.log("User votes loaded:", {
// // //             upvotes: Object.keys(userUpvotes).length,
// // //             downvotes: Object.keys(userDownvotes).length
// // //           });
// // //         }
// // //       } catch (error) {
// // //         console.error("Error fetching comments and votes:", error);
// // //       }
// // //     };
  
// // //     fetchCommentsAndVotes();
// // //   }, [currentUser]);
  
// // //   const handleVote = async (postId, type) => {
// // //     if (!currentUser) {
// // //       console.log("User must be logged in to vote");
// // //       return;
// // //     }
    
// // //     const currentUserId = currentUser.uid;
// // //     const postRef = doc(db, "posts", postId);
    
// // //     // Use different collections for upvotes and downvotes
// // //     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
// // //     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
// // //     try {
// // //       // Check if the user has already upvoted or downvoted
// // //       const upvoteSnap = await getDoc(upvoteRef);
// // //       const downvoteSnap = await getDoc(downvoteRef);
// // //       const hasUpvoted = upvoteSnap.exists();
// // //       const hasDownvoted = downvoteSnap.exists();
  
// // //       // If clicking the same vote type they already did - do nothing
// // //       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
// // //         console.log("User has already voted this way");
// // //         return;
// // //       }
  
// // //       // If user is trying to upvote but has already downvoted
// // //       if (type === "upvotes" && hasDownvoted) {
// // //         // Remove downvote document
// // //         await deleteDoc(downvoteRef);
        
// // //         // Add upvote document
// // //         await setDoc(upvoteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post counts: decrease downvotes by 1, increase upvotes by 1
// // //         await updateDoc(postRef, { 
// // //           downvotes: increment(-1),
// // //           upvotes: increment(1)
// // //         });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           upvotes: { ...prev.upvotes, [postId]: true },
// // //           downvotes: { ...prev.downvotes, [postId]: false }
// // //         }));
        
// // //         // Update posts state
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   upvotes: (post.upvotes || 0) + 1,
// // //                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
// // //       } 
// // //       // If user is trying to downvote but has already upvoted
// // //       else if (type === "downvotes" && hasUpvoted) {
// // //         // Remove upvote document
// // //         await deleteDoc(upvoteRef);
        
// // //         // Add downvote document
// // //         await setDoc(downvoteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post counts: decrease upvotes by 1, increase downvotes by 1
// // //         await updateDoc(postRef, { 
// // //           upvotes: increment(-1),
// // //           downvotes: increment(1)
// // //         });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           upvotes: { ...prev.upvotes, [postId]: false },
// // //           downvotes: { ...prev.downvotes, [postId]: true }
// // //         }));
        
// // //         // Update posts state
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   downvotes: (post.downvotes || 0) + 1,
// // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
        
// // //         // Also update filteredPosts state to reflect changes
// // //         setFilteredPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   downvotes: (post.downvotes || 0) + 1,
// // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
// // //       }
// // //       // New vote (user hasn't voted before)
// // //       else {
// // //         // Determine which collection to use based on vote type
// // //         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
// // //         // Create new vote document in the appropriate collection
// // //         await setDoc(voteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post count
// // //         await updateDoc(postRef, { [type]: increment(1) });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           ...prev,
// // //           [type]: { ...prev[type], [postId]: true }
// // //         }));
        
// // //         // Update both posts and filteredPosts states
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // //               : post
// // //           )
// // //         );
        
// // //         setFilteredPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // //               : post
// // //           )
// // //         );
// // //       }
// // //     } catch (error) {
// // //       console.error("Error handling vote:", error);
// // //     }
// // //   };

// // //   const handleReport = async (postId) => {
// // //     if (!currentUser) {
// // //       console.log("User must be logged in to report");
// // //       return;
// // //     }
    
// // //     const currentUserId = currentUser.uid;
// // //     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
// // //     const postRef = doc(db, "posts", postId);

// // //     try {
// // //       const reportSnap = await getDoc(reportRef);
// // //       if (!reportSnap.exists()) {
// // //         await setDoc(reportRef, { 
// // //           reported: true,
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
// // //         await updateDoc(postRef, { reports: increment(1) });
        
// // //         // Update both posts and filteredPosts states
// // //         setPosts((prev) => prev.filter((post) => post.id !== postId));
// // //         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
// // //       }
// // //     } catch (error) {
// // //       console.error("Error reporting:", error);
// // //     }
// // //   };

// // //   const handleShare = async (postId) => {
// // //     const postRef = doc(db, "posts", postId);
// // //     const url = `${window.location.origin}/post/${postId}`;
// // //     setShareUrl(url);
// // //     setSelectedPostId(postId);
// // //     setShowShareDialog(true);

// // //     try {
// // //       await updateDoc(postRef, { shares: increment(1) });
      
// // //       // Update both posts and filteredPosts states
// // //       setPosts((prev) =>
// // //         prev.map((post) =>
// // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // //         )
// // //       );
      
// // //       setFilteredPosts((prev) =>
// // //         prev.map((post) =>
// // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // //         )
// // //       );
// // //     } catch (error) {
// // //       console.error("Error sharing:", error);
// // //     }
// // //   };

// // //   // Check comment for toxicity with fallback
// // //   const checkToxicity = async (text) => {
// // //     if (!toxicityModel) {
// // //       console.warn("Toxicity model not loaded yet");
// // //       return null;
// // //     }
    
// // //     try {
// // //       const predictions = await toxicityModel.classify(text);
// // //       // Find any toxic categories
// // //       const toxicLabels = predictions
// // //         .filter(prediction => prediction.results[0].match)
// // //         .map(prediction => ({
// // //           label: prediction.label,
// // //           probability: prediction.results[0].probabilities[1] // Probability of being toxic
// // //         }));
      
// // //       return toxicLabels.length > 0 ? toxicLabels : null;
// // //     } catch (error) {
// // //       console.error("Error checking toxicity:", error);
// // //       return null;
// // //     }
// // //   };

// // //   const handleAddComment = async (postId) => {
// // //     if (!currentUser || newComment.trim() === "") return;
    
// // //     // Only check toxicity if model is loaded
// // //     let toxicContent = null;
// // //     if (toxicityModel && !isToxicityModelLoading) {
// // //       toxicContent = await checkToxicity(newComment);
// // //       if (toxicContent) {
// // //         console.log("Toxic content detected:", toxicContent);
// // //         setToxicityResults(toxicContent);
// // //         setShowToxicityAlert(true);
// // //         return;
// // //       }
// // //     }
  
// // //     try {
// // //       // Fetch the user document from Firestore
// // //       const userRef = doc(db, "users", currentUser.uid);
// // //       const userSnap = await getDoc(userRef);
  
// // //       let username = "Anonymous"; // Default username
// // //       if (userSnap.exists()) {
// // //         username = userSnap.data().username || "Anonymous";
// // //       }
  
// // //       // Comment data including fetched username
// // //       const commentData = {
// // //         postId,
// // //         userId: currentUser.uid,
// // //         username, // Use the fetched username
// // //         content: newComment,
// // //         timestamp: new Date(),
// // //       };
  
// // //       // Store the comment in Firestore
// // //       const commentRef = doc(collection(db, "comments"));
// // //       await setDoc(commentRef, commentData);
  
// // //       // Update UI to reflect new comment
// // //       setComments((prev) => ({
// // //         ...prev,
// // //         [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
// // //       }));
  
// // //       setNewComment(""); // Clear the input field
// // //     } catch (error) {
// // //       console.error("Error adding comment:", error);
// // //     }
// // //   };
  
// // //   const toggleViewAllPosts = () => {
// // //     setShowAllPosts(!showAllPosts);
// // //   };

// // //   // Display formatted time
// // //   const formatDate = (timestamp) => {
// // //     if (!timestamp) return 'Unknown time';
    
// // //     try {
// // //       // Convert Firebase timestamp to JS Date if needed
// // //       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
// // //       return date.toLocaleString();
// // //     } catch (error) {
// // //       console.error("Error formatting date:", error, timestamp);
// // //       return 'Invalid date';
// // //     }
// // //   };

// // //   return (
// // //     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
// // //       {/* Post View Options */}
// // //       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
// // //         <div className="bg-white p-4 rounded-lg shadow-lg">
// // //           <h2 className="text-lg font-bold mb-2">
// // //             {loading ? "Loading posts..." : 
// // //               showAllPosts ? "Viewing All Posts" : 
// // //               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
// // //           </h2>
// // //           <button
// // //             onClick={toggleViewAllPosts}
// // //             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
// // //           >
// // //             {showAllPosts ? "View Local Posts" : "View All Posts"}
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Posts */}
// // //       <div className="w-full max-w-2xl px-4">
// // //         {loading ? (
// // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // //             <p className="text-lg text-gray-700">Loading posts...</p>
// // //           </div>
// // //         ) : filteredPosts.length === 0 ? (
// // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // //             <p className="text-lg text-gray-700">
// // //               {!userPincode && !showAllPosts 
// // //                 ? "No pincode set. Please update your profile." 
// // //                 : "No posts available."}
// // //             </p>
// // //           </div>
// // //         ) : (
// // //           filteredPosts.map((post) => {
// // //             const user = userDetails[post.userId] || {};
// // //             const hasUpvoted = userVotes.upvotes[post.id];
// // //             const hasDownvoted = userVotes.downvotes[post.id];
            
// // //             return (
// // //               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
// // //                 {/* Header */}
// // //                 <div className="flex items-center mb-4">
// // //                   <img
// // //                     src={user.profilePic || "https://via.placeholder.com/50"}
// // //                     alt="Profile"
// // //                     className="rounded-full w-12 h-12 mr-3"
// // //                   />
// // //                   <div>
// // //                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
// // //                     <p className="text-sm text-gray-600">
// // //                       Posted at {formatDate(post.createdAt)}
// // //                     </p>
// // //                   </div>
// // //                 </div>

// // //                 {/* Content */}
// // //                 <p className="text-lg mb-4">{post.content}</p>

// // //                 {/* Media */}
// // //                 {post.mediaUrl && (
// // //                   <div className="mb-4">
// // //                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
// // //                   </div>
// // //                 )}

// // //                 {/* Engagement */}
// // //                 <div className="flex justify-between items-center mt-4">
// // //                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
// // //                 </div>

// // //                 {/* Actions */}
// // //                 <div className="flex justify-between items-center mt-4">
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleVote(post.id, "upvotes")}
// // //                   >
// // //                     {hasUpvoted ? (
// // //                       <AiFillLike size="24" className="mr-1 text-blue-500" />
// // //                     ) : (
// // //                       <UilThumbsUp size="24" className="mr-1" />
// // //                     )}
// // //                     <span>{post.upvotes || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleVote(post.id, "downvotes")}
// // //                   >
// // //                     {hasDownvoted ? (
// // //                       <AiFillDislike size="24" className="mr-1 text-red-500" />
// // //                     ) : (
// // //                       <UilThumbsDown size="24" className="mr-1" />
// // //                     )}
// // //                     <span>{post.downvotes || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleReport(post.id)}
// // //                   >
// // //                     <UilSick size="24" className="mr-1" />
// // //                     <span>{post.reports || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleShare(post.id)}
// // //                   >
// // //                     <UilShare size="24" className="mr-1" />
// // //                     <span>{post.shares || 0}</span>
// // //                   </button>
// // //                 </div>
                
// // //                 {/* Comments Section */}
// // //                 <div className="mt-4">
// // //                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
// // //                   {/* Show existing comments */}
// // //                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
// // //                     {comments[post.id] && comments[post.id].length > 0 ? (
// // //                       comments[post.id].map((comment) => (
// // //                         <div key={comment.id} className="border-b p-2">
// // //                           <p className="text-sm font-semibold">{comment.username}</p>
// // //                           <p className="text-sm">{comment.content}</p>
// // //                         </div>
// // //                       ))
// // //                     ) : (
// // //                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
// // //                     )}
// // //                   </div>

// // //                   {/* Add a comment */}
// // //                   {currentUser && (
// // //                     <div className="mt-2 flex">
// // //                       <input
// // //                         type="text"
// // //                         placeholder="Write a comment..."
// // //                         value={newComment}
// // //                         onChange={(e) => setNewComment(e.target.value)}
// // //                         className="flex-grow p-2 border rounded-l-md"
// // //                       />
// // //                       <button
// // //                         onClick={() => handleAddComment(post.id)}
// // //                         className="bg-blue-500 text-white px-4 rounded-r-md"
// // //                       >
// // //                         Comment
// // //                       </button>
// // //                     </div>
// // //                   )}
// // //                 </div>
// // //               </div>
// // //             );
// // //           })
// // //         )}
// // //       </div>

// // //       {/* Share Modal Component - Only show when showShareDialog is true */}
// // //       {showShareDialog && (
// // //         <ShareModal 
// // //           isOpen={showShareDialog}
// // //           onClose={() => setShowShareDialog(false)}
// // //           url={shareUrl}
// // //           title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
// // //         />
// // //       )}
      
// // //       {/* Toxicity Alert Component */}
// // //       {showToxicityAlert && (
// // //         <ToxicityAlert
// // //           results={toxicityResults}
// // //           comment={newComment}
// // //           onClose={() => setShowToxicityAlert(false)}
// // //         />
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default Post;






// // // import React, { useEffect, useState } from "react";
// // // import { db, auth } from "./config/firebase";
// // // import Navbar from "./Navbar";
// // // import { deleteDoc } from "firebase/firestore";
// // // import {
// // //   collection,
// // //   getDocs,
// // //   doc,
// // //   updateDoc,
// // //   increment,
// // //   setDoc,
// // //   getDoc,
// // //   query,
// // //   orderBy,
// // //   where
// // // } from "firebase/firestore";
// // // import { onAuthStateChanged } from "firebase/auth";
// // // import {
// // //   UilAngleUp,
// // //   UilAngleDown,
// // //   UilSick,
// // //   UilShare,
// // //   UilThumbsUp,
// // //   UilThumbsDown,
// // // } from "@iconscout/react-unicons";
// // // // import { AiFillLike,AiFillDislike } from '@iconscout/react-unicons-monochrome'
// // // // import {
// // // //   AiFillLike,
// // // //   AiFillDislike
// // // // } from "@iconscout/react-unicons-solid";

// // // import { AiFillLike } from "react-icons/ai";
// // // import { AiFillDislike } from "react-icons/ai";
// // // import ShareModal from "./ShareModal";
// // // import ToxicityAlert from "./ToxicityAlert";
// // // // import * as tf from 'tensorflow';
// // // import * as tf from '@tensorflow/tfjs';
// // // import * as toxicity from '@tensorflow-models/toxicity';

// // // const Post = ({ userId }) => {
// // //   const [posts, setPosts] = useState([]);
// // //   const [userDetails, setUserDetails] = useState({});
// // //   const [shareUrl, setShareUrl] = useState("");
// // //   const [showShareDialog, setShowShareDialog] = useState(false);
// // //   const [currentUser, setCurrentUser] = useState(null);
// // //   const [comments, setComments] = useState({});
// // //   const [newComment, setNewComment] = useState("");
// // //   const [userPincode, setUserPincode] = useState("");
// // //   const [showAllPosts, setShowAllPosts] = useState(false);
// // //   const [filteredPosts, setFilteredPosts] = useState([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [userVotes, setUserVotes] = useState({ upvotes: {}, downvotes: {} });
// // //   const [toxicityModel, setToxicityModel] = useState(null);
// // //   const [showToxicityAlert, setShowToxicityAlert] = useState(false);
// // //   const [toxicityResults, setToxicityResults] = useState(null);
// // //   const [selectedPostId, setSelectedPostId] = useState(null);
  
// // //   // Step 1: Get the current user
// // //   useEffect(() => {
// // //     console.log("Starting auth state observer");
// // //     const unsubscribe = onAuthStateChanged(auth, (user) => {
// // //       if (user) {
// // //         setCurrentUser(user);
// // //         console.log("User ID:", user.uid);
        
// // //         // Fetch user's pincode
// // //         const fetchUserPincode = async () => {
// // //           try {
// // //             const userRef = doc(db, "users", user.uid);
// // //             const userSnap = await getDoc(userRef);
// // //             if (userSnap.exists()) {
// // //               const userData = userSnap.data();
// // //               console.log("User data:", userData);
// // //               // Check both possible field names for pincode
// // //               const pincode = userData.pinCode || userData.pincode || "";
// // //               setUserPincode(pincode);
// // //               console.log("Set user pincode to:", pincode);
// // //             } else {
// // //               console.log("No user document found");
// // //             }
// // //           } catch (error) {
// // //             console.error("Error fetching user pincode:", error);
// // //           }
// // //         };
        
// // //         fetchUserPincode();
// // //       } else {
// // //         setCurrentUser(null);
// // //         setUserPincode("");
// // //         console.log("No user is currently logged in");
// // //       }
// // //     });

// // //     return () => unsubscribe();
// // //   }, []);

// // //   // Load TensorFlow Toxicity model
// // //   useEffect(() => {
// // //     const loadToxicityModel = async () => {
// // //       try {
// // //         // Set a threshold that matches the model's default threshold (0.9)
// // //         const threshold = 0.4;
// // //         const model = await toxicity.load(threshold);
// // //         setToxicityModel(model);
// // //         console.log("Toxicity model loaded");
// // //       } catch (error) {
// // //         console.error("Error loading toxicity model:", error);
// // //       }
// // //     };
    
// // //     loadToxicityModel();
// // //   }, []);

// // //   // Step 2: Fetch posts
// // //   useEffect(() => {
// // //     const fetchPosts = async () => {
// // //       console.log("Fetching posts");
// // //       setLoading(true);
// // //       try {
// // //         // Get all posts ordered by creation date (newest first)
// // //         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
// // //         const querySnapshot = await getDocs(postsQuery);
        
// // //         console.log("Got posts:", querySnapshot.size);
        
// // //         const postsData = querySnapshot.docs
// // //           .map((doc) => {
// // //             const data = doc.data();
// // //             console.log("Post data:", doc.id, data);
// // //             return {
// // //               id: doc.id,
// // //               ...data,
// // //               // Ensure createdAt is processed properly
// // //               createdAt: data.createdAt 
// // //                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
// // //                 : new Date(),
// // //               // Ensure pincode is a string for consistent comparison
// // //               pincode: data.pincode ? data.pincode.toString() : ""
// // //             };
// // //           })
// // //           .filter((post) => (post.reports || 0) < 3);
        
// // //         console.log("Filtered posts:", postsData.length);
// // //         setPosts(postsData);

// // //         // Fetch user details for each post
// // //         const usersData = {};
// // //         for (const post of postsData) {
// // //           if (!usersData[post.userId] && post.userId) {
// // //             try {
// // //               const userRef = doc(db, "users", post.userId);
// // //               const userSnap = await getDoc(userRef);
// // //               if (userSnap.exists()) {
// // //                 usersData[post.userId] = userSnap.data();
// // //               }
// // //             } catch (error) {
// // //               console.error(`Error fetching user details for ${post.userId}:`, error);
// // //             }
// // //           }
// // //         }
// // //         setUserDetails(usersData);
// // //         setLoading(false);
// // //       } catch (error) {
// // //         console.error("Error fetching posts:", error);
// // //         setLoading(false);
// // //       }
// // //     };

// // //     fetchPosts();
// // //   }, []);

// // //   // Step 3: Filter posts by pincode
// // //   useEffect(() => {
// // //     console.log("Filtering posts. User pincode:", userPincode);
// // //     console.log("Show all posts:", showAllPosts);
// // //     console.log("Total posts:", posts.length);
    
// // //     if (posts.length === 0) {
// // //       setFilteredPosts([]);
// // //       return;
// // //     }
    
// // //     if (!showAllPosts && userPincode) {
// // //       console.log("Filtering by pincode:", userPincode);
// // //       const pincodeFilteredPosts = posts.filter(post => {
// // //         const postPincode = post.pincode ? post.pincode.toString() : "";
// // //         const userPincodeStr = userPincode.toString();
        
// // //         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
// // //                    "Match:", postPincode === userPincodeStr);
        
// // //         return postPincode === userPincodeStr;
// // //       });
      
// // //       console.log("Filtered posts count:", pincodeFilteredPosts.length);
// // //       setFilteredPosts(pincodeFilteredPosts);
// // //     } else {
// // //       console.log("Showing all posts");
// // //       setFilteredPosts(posts);
// // //     }
// // //   }, [userPincode, posts, showAllPosts]);

// // //   // Step 4: Fetch comments and user votes
// // //   useEffect(() => {
// // //     const fetchCommentsAndVotes = async () => {
// // //       console.log("Fetching comments and votes");
// // //       try {
// // //         // Fetch comments
// // //         const commentsData = {};
// // //         const querySnapshot = await getDocs(collection(db, "comments"));
// // //         querySnapshot.forEach((doc) => {
// // //           const data = doc.data();
// // //           if (!commentsData[data.postId]) {
// // //             commentsData[data.postId] = [];
// // //           }
          
// // //           // Convert timestamp to date object if needed
// // //           const timestamp = data.timestamp && data.timestamp.toDate 
// // //             ? data.timestamp.toDate() 
// // //             : data.timestamp || new Date();
            
// // //           commentsData[data.postId].push({ 
// // //             id: doc.id, 
// // //             ...data,
// // //             timestamp: timestamp
// // //           });
// // //         });
    
// // //         // Sort comments by timestamp
// // //         Object.keys(commentsData).forEach(postId => {
// // //           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
// // //         });
        
// // //         setComments(commentsData);
// // //         console.log("Comments loaded:", Object.keys(commentsData).length);
        
// // //         // Fetch user votes if user is logged in
// // //         if (currentUser) {
// // //           const userUpvotes = {};
// // //           const userDownvotes = {};
          
// // //           // Fetch upvotes
// // //           const upvotesQuery = query(
// // //             collection(db, "upvotes"), 
// // //             where("userId", "==", currentUser.uid)
// // //           );
// // //           const upvotesSnapshot = await getDocs(upvotesQuery);
// // //           upvotesSnapshot.forEach(doc => {
// // //             const data = doc.data();
// // //             userUpvotes[data.postId] = true;
// // //           });
          
// // //           // Fetch downvotes
// // //           const downvotesQuery = query(
// // //             collection(db, "downvotes"), 
// // //             where("userId", "==", currentUser.uid)
// // //           );
// // //           const downvotesSnapshot = await getDocs(downvotesQuery);
// // //           downvotesSnapshot.forEach(doc => {
// // //             const data = doc.data();
// // //             userDownvotes[data.postId] = true;
// // //           });
          
// // //           setUserVotes({
// // //             upvotes: userUpvotes,
// // //             downvotes: userDownvotes
// // //           });
          
// // //           console.log("User votes loaded:", {
// // //             upvotes: Object.keys(userUpvotes).length,
// // //             downvotes: Object.keys(userDownvotes).length
// // //           });
// // //         }
// // //       } catch (error) {
// // //         console.error("Error fetching comments and votes:", error);
// // //       }
// // //     };
  
// // //     fetchCommentsAndVotes();
// // //   }, [currentUser]);
  
// // //   const handleVote = async (postId, type) => {
// // //     if (!currentUser) {
// // //       console.log("User must be logged in to vote");
// // //       return;
// // //     }
    
// // //     const currentUserId = currentUser.uid;
// // //     const postRef = doc(db, "posts", postId);
    
// // //     // Use different collections for upvotes and downvotes
// // //     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
// // //     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
// // //     try {
// // //       // Check if the user has already upvoted or downvoted
// // //       const upvoteSnap = await getDoc(upvoteRef);
// // //       const downvoteSnap = await getDoc(downvoteRef);
// // //       const hasUpvoted = upvoteSnap.exists();
// // //       const hasDownvoted = downvoteSnap.exists();
  
// // //       // If clicking the same vote type they already did - do nothing
// // //       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
// // //         console.log("User has already voted this way");
// // //         return;
// // //       }
  
// // //       // If user is trying to upvote but has already downvoted
// // //       if (type === "upvotes" && hasDownvoted) {
// // //         // Remove downvote document
// // //         await deleteDoc(downvoteRef);
        
// // //         // Add upvote document
// // //         await setDoc(upvoteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post counts: decrease downvotes by 1, increase upvotes by 1
// // //         await updateDoc(postRef, { 
// // //           downvotes: increment(-1),
// // //           upvotes: increment(1)
// // //         });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           upvotes: { ...prev.upvotes, [postId]: true },
// // //           downvotes: { ...prev.downvotes, [postId]: false }
// // //         }));
        
// // //         // Update posts state
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   upvotes: (post.upvotes || 0) + 1,
// // //                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
// // //       } 
// // //       // If user is trying to downvote but has already upvoted
// // //       else if (type === "downvotes" && hasUpvoted) {
// // //         // Remove upvote document
// // //         await deleteDoc(upvoteRef);
        
// // //         // Add downvote document
// // //         await setDoc(downvoteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post counts: decrease upvotes by 1, increase downvotes by 1
// // //         await updateDoc(postRef, { 
// // //           upvotes: increment(-1),
// // //           downvotes: increment(1)
// // //         });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           upvotes: { ...prev.upvotes, [postId]: false },
// // //           downvotes: { ...prev.downvotes, [postId]: true }
// // //         }));
        
// // //         // Update posts state
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   downvotes: (post.downvotes || 0) + 1,
// // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
        
// // //         // Also update filteredPosts state to reflect changes
// // //         setFilteredPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { 
// // //                   ...post, 
// // //                   downvotes: (post.downvotes || 0) + 1,
// // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // //                 }
// // //               : post
// // //           )
// // //         );
// // //       }
// // //       // New vote (user hasn't voted before)
// // //       else {
// // //         // Determine which collection to use based on vote type
// // //         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
// // //         // Create new vote document in the appropriate collection
// // //         await setDoc(voteRef, { 
// // //           voted: true, 
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
        
// // //         // Update post count
// // //         await updateDoc(postRef, { [type]: increment(1) });
        
// // //         // Update local state for votes
// // //         setUserVotes(prev => ({
// // //           ...prev,
// // //           [type]: { ...prev[type], [postId]: true }
// // //         }));
        
// // //         // Update both posts and filteredPosts states
// // //         setPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // //               : post
// // //           )
// // //         );
        
// // //         setFilteredPosts((prev) =>
// // //           prev.map((post) =>
// // //             post.id === postId
// // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // //               : post
// // //           )
// // //         );
// // //       }
// // //     } catch (error) {
// // //       console.error("Error handling vote:", error);
// // //     }
// // //   };

// // //   const handleReport = async (postId) => {
// // //     if (!currentUser) {
// // //       console.log("User must be logged in to report");
// // //       return;
// // //     }
    
// // //     const currentUserId = currentUser.uid;
// // //     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
// // //     const postRef = doc(db, "posts", postId);

// // //     try {
// // //       const reportSnap = await getDoc(reportRef);
// // //       if (!reportSnap.exists()) {
// // //         await setDoc(reportRef, { 
// // //           reported: true,
// // //           timestamp: new Date(),
// // //           userId: currentUserId,
// // //           postId: postId
// // //         });
// // //         await updateDoc(postRef, { reports: increment(1) });
        
// // //         // Update both posts and filteredPosts states
// // //         setPosts((prev) => prev.filter((post) => post.id !== postId));
// // //         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
// // //       }
// // //     } catch (error) {
// // //       console.error("Error reporting:", error);
// // //     }
// // //   };

// // //   const handleShare = async (postId) => {
// // //     const postRef = doc(db, "posts", postId);
// // //     const url = `${window.location.origin}/post/${postId}`;
// // //     setShareUrl(url);
// // //     setSelectedPostId(postId);
// // //     setShowShareDialog(true);

// // //     try {
// // //       await updateDoc(postRef, { shares: increment(1) });
      
// // //       // Update both posts and filteredPosts states
// // //       setPosts((prev) =>
// // //         prev.map((post) =>
// // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // //         )
// // //       );
      
// // //       setFilteredPosts((prev) =>
// // //         prev.map((post) =>
// // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // //         )
// // //       );
// // //     } catch (error) {
// // //       console.error("Error sharing:", error);
// // //     }
// // //   };

// // //   // Check comment for toxicity
// // //   const checkToxicity = async (text) => {
// // //     if (!toxicityModel) {
// // //       console.warn("Toxicity model not loaded yet");
// // //       return null;
// // //     }
    
// // //     try {
// // //       const predictions = await toxicityModel.classify(text);
// // //       // Find any toxic categories
// // //       const toxicLabels = predictions
// // //         .filter(prediction => prediction.results[0].match)
// // //         .map(prediction => ({
// // //           label: prediction.label,
// // //           probability: prediction.results[0].probabilities[1] // Probability of being toxic
// // //         }));
      
// // //       return toxicLabels.length > 0 ? toxicLabels : null;
// // //     } catch (error) {
// // //       console.error("Error checking toxicity:", error);
// // //       return null;
// // //     }
// // //   };

// // //   const handleAddComment = async (postId) => {
// // //     if (!currentUser || newComment.trim() === "") return;
    
// // //     // Check for toxicity
// // //     const toxicContent = await checkToxicity(newComment);
// // //     if (toxicContent) {
// // //       console.log("Toxic content detected:", toxicContent);
// // //       setToxicityResults(toxicContent);
// // //       setShowToxicityAlert(true);
// // //       return;
// // //     }
  
// // //     try {
// // //       // Fetch the user document from Firestore
// // //       const userRef = doc(db, "users", currentUser.uid);
// // //       const userSnap = await getDoc(userRef);
  
// // //       let username = "Anonymous"; // Default username
// // //       if (userSnap.exists()) {
// // //         username = userSnap.data().username || "Anonymous";
// // //       }
  
// // //       // Comment data including fetched username
// // //       const commentData = {
// // //         postId,
// // //         userId: currentUser.uid,
// // //         username, // Use the fetched username
// // //         content: newComment,
// // //         timestamp: new Date(),
// // //       };
  
// // //       // Store the comment in Firestore
// // //       const commentRef = doc(collection(db, "comments"));
// // //       await setDoc(commentRef, commentData);
  
// // //       // Update UI to reflect new comment
// // //       setComments((prev) => ({
// // //         ...prev,
// // //         [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
// // //       }));
  
// // //       setNewComment(""); // Clear the input field
// // //     } catch (error) {
// // //       console.error("Error adding comment:", error);
// // //     }
// // //   };
  
// // //   const toggleViewAllPosts = () => {
// // //     setShowAllPosts(!showAllPosts);
// // //   };

// // //   // Display formatted time
// // //   const formatDate = (timestamp) => {
// // //     if (!timestamp) return 'Unknown time';
    
// // //     try {
// // //       // Convert Firebase timestamp to JS Date if needed
// // //       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
// // //       return date.toLocaleString();
// // //     } catch (error) {
// // //       console.error("Error formatting date:", error, timestamp);
// // //       return 'Invalid date';
// // //     }
// // //   };

// // //   return (
// // //     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
// // //       {/* Post View Options */}
// // //       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
// // //         <div className="bg-white p-4 rounded-lg shadow-lg">
// // //           <h2 className="text-lg font-bold mb-2">
// // //             {loading ? "Loading posts..." : 
// // //               showAllPosts ? "Viewing All Posts" : 
// // //               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
// // //           </h2>
// // //           <button
// // //             onClick={toggleViewAllPosts}
// // //             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
// // //           >
// // //             {showAllPosts ? "View Local Posts" : "View All Posts"}
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Posts */}
// // //       <div className="w-full max-w-2xl px-4">
// // //         {loading ? (
// // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // //             <p className="text-lg text-gray-700">Loading posts...</p>
// // //           </div>
// // //         ) : filteredPosts.length === 0 ? (
// // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // //             <p className="text-lg text-gray-700">
// // //               {!userPincode && !showAllPosts 
// // //                 ? "No pincode set. Please update your profile." 
// // //                 : "No posts available."}
// // //             </p>
// // //           </div>
// // //         ) : (
// // //           filteredPosts.map((post) => {
// // //             const user = userDetails[post.userId] || {};
// // //             const hasUpvoted = userVotes.upvotes[post.id];
// // //             const hasDownvoted = userVotes.downvotes[post.id];
            
// // //             return (
// // //               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
// // //                 {/* Header */}
// // //                 <div className="flex items-center mb-4">
// // //                   <img
// // //                     src={user.profilePic || "https://via.placeholder.com/50"}
// // //                     alt="Profile"
// // //                     className="rounded-full w-12 h-12 mr-3"
// // //                   />
// // //                   <div>
// // //                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
// // //                     <p className="text-sm text-gray-600">
// // //                       Posted at {formatDate(post.createdAt)}
// // //                     </p>
// // //                   </div>
// // //                 </div>

// // //                 {/* Content */}
// // //                 <p className="text-lg mb-4">{post.content}</p>

// // //                 {/* Media */}
// // //                 {post.mediaUrl && (
// // //                   <div className="mb-4">
// // //                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
// // //                   </div>
// // //                 )}

// // //                 {/* Engagement */}
// // //                 <div className="flex justify-between items-center mt-4">
// // //                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
// // //                 </div>

// // //                 {/* Actions */}
// // //                 <div className="flex justify-between items-center mt-4">
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleVote(post.id, "upvotes")}
// // //                   >
// // //                     {hasUpvoted ? (
// // //                       <AiFillLike size="24" className="mr-1 text-blue-500" />
// // //                     ) : (
// // //                       <UilThumbsUp size="24" className="mr-1" />
// // //                     )}
// // //                     <span>{post.upvotes || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleVote(post.id, "downvotes")}
// // //                   >
// // //                     {hasDownvoted ? (
// // //                       <AiFillDislike size="24" className="mr-1 text-red-500" />
// // //                     ) : (
// // //                       <UilThumbsDown size="24" className="mr-1" />
// // //                     )}
// // //                     <span>{post.downvotes || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleReport(post.id)}
// // //                   >
// // //                     <UilSick size="24" className="mr-1" />
// // //                     <span>{post.reports || 0}</span>
// // //                   </button>
// // //                   <button
// // //                     className="flex items-center text-gray-600"
// // //                     onClick={() => handleShare(post.id)}
// // //                   >
// // //                     <UilShare size="24" className="mr-1" />
// // //                     <span>{post.shares || 0}</span>
// // //                   </button>
// // //                 </div>
                
// // //                 {/* Comments Section */}
// // //                 <div className="mt-4">
// // //                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
// // //                   {/* Show existing comments */}
// // //                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
// // //                     {comments[post.id] && comments[post.id].length > 0 ? (
// // //                       comments[post.id].map((comment) => (
// // //                         <div key={comment.id} className="border-b p-2">
// // //                           <p className="text-sm font-semibold">{comment.username}</p>
// // //                           <p className="text-sm">{comment.content}</p>
// // //                         </div>
// // //                       ))
// // //                     ) : (
// // //                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
// // //                     )}
// // //                   </div>

// // //                   {/* Add a comment */}
// // //                   {currentUser && (
// // //                     <div className="mt-2 flex">
// // //                       <input
// // //                         type="text"
// // //                         placeholder="Write a comment..."
// // //                         value={newComment}
// // //                         onChange={(e) => setNewComment(e.target.value)}
// // //                         className="flex-grow p-2 border rounded-l-md"
// // //                       />
// // //                       <button
// // //                         onClick={() => handleAddComment(post.id)}
// // //                         className="bg-blue-500 text-white px-4 rounded-r-md"
// // //                       >
// // //                         Comment
// // //                       </button>
// // //                     </div>
// // //                   )}
// // //                 </div>
// // //               </div>
// // //             );
// // //           })
// // //         )}
// // //       </div>

// // //       {/* Share Modal Component */}
// // // {/*       {showShareDialog && (
// // //         <ShareModal 
// // //           shareUrl={shareUrl}
// // //           onClose={() => setShowShareDialog(false)}
// // //           postId={selectedPostId}
// // //         />
// // //       )} */}
// // //       <ShareModal 
// // //   isOpen={showShareDialog}
// // //   onClose={() => setShowShareDialog(false)}
// // //   url={shareUrl}
// // //   title={filteredPosts.find(post => post.id === selectedPostId)?.content || "Shared Post"}
// // // />
      
// // //       {/* Toxicity Alert Component */}
// // //       {showToxicityAlert && (
// // //         <ToxicityAlert
// // //           results={toxicityResults}
// // //           comment={newComment}
// // //           onClose={() => setShowToxicityAlert(false)}
// // //         />
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default Post;

// // // // import React, { useEffect, useState } from "react";
// // // // import { db, auth } from "./config/firebase";
// // // // import Navbar from "./Navbar";
// // // // import { deleteDoc } from "firebase/firestore";
// // // // import {
// // // //   collection,
// // // //   getDocs,
// // // //   doc,
// // // //   updateDoc,
// // // //   increment,
// // // //   setDoc,
// // // //   getDoc,
// // // //   query,
// // // //   orderBy,
// // // //   where
// // // // } from "firebase/firestore";
// // // // import { onAuthStateChanged } from "firebase/auth";
// // // // import {
// // // //   UilAngleUp,
// // // //   UilAngleDown,
// // // //   UilSick,
// // // //   UilShare,
// // // // } from "@iconscout/react-unicons";

// // // // const Post = ({ userId }) => {
// // // //   const [posts, setPosts] = useState([]);
// // // //   const [userDetails, setUserDetails] = useState({});
// // // //   const [shareUrl, setShareUrl] = useState("");
// // // //   const [showShareDialog, setShowShareDialog] = useState(false);
// // // //   const [currentUser, setCurrentUser] = useState(null);
// // // //   const [comments, setComments] = useState({});
// // // //   const [newComment, setNewComment] = useState("");
// // // //   const [userPincode, setUserPincode] = useState("");
// // // //   const [showAllPosts, setShowAllPosts] = useState(false);
// // // //   const [filteredPosts, setFilteredPosts] = useState([]);
// // // //   const [loading, setLoading] = useState(true);
  
// // // //   // Step 1: Get the current user
// // // //   useEffect(() => {
// // // //     console.log("Starting auth state observer");
// // // //     const unsubscribe = onAuthStateChanged(auth, (user) => {
// // // //       if (user) {
// // // //         setCurrentUser(user);
// // // //         console.log("User ID:", user.uid);
        
// // // //         // Fetch user's pincode
// // // //         const fetchUserPincode = async () => {
// // // //           try {
// // // //             const userRef = doc(db, "users", user.uid);
// // // //             const userSnap = await getDoc(userRef);
// // // //             if (userSnap.exists()) {
// // // //               const userData = userSnap.data();
// // // //               console.log("User data:", userData);
// // // //               // Check both possible field names for pincode
// // // //               const pincode = userData.pinCode || userData.pincode || "";
// // // //               setUserPincode(pincode);
// // // //               console.log("Set user pincode to:", pincode);
// // // //             } else {
// // // //               console.log("No user document found");
// // // //             }
// // // //           } catch (error) {
// // // //             console.error("Error fetching user pincode:", error);
// // // //           }
// // // //         };
        
// // // //         fetchUserPincode();
// // // //       } else {
// // // //         setCurrentUser(null);
// // // //         setUserPincode("");
// // // //         console.log("No user is currently logged in");
// // // //       }
// // // //     });

// // // //     return () => unsubscribe();
// // // //   }, []);

// // // //   // Step 2: Fetch posts
// // // //   useEffect(() => {
// // // //     const fetchPosts = async () => {
// // // //       console.log("Fetching posts");
// // // //       setLoading(true);
// // // //       try {
// // // //         // Get all posts ordered by creation date (newest first)
// // // //         const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
// // // //         const querySnapshot = await getDocs(postsQuery);
        
// // // //         console.log("Got posts:", querySnapshot.size);
        
// // // //         const postsData = querySnapshot.docs
// // // //           .map((doc) => {
// // // //             const data = doc.data();
// // // //             console.log("Post data:", doc.id, data);
// // // //             return {
// // // //               id: doc.id,
// // // //               ...data,
// // // //               // Ensure createdAt is processed properly
// // // //               createdAt: data.createdAt 
// // // //                 ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) 
// // // //                 : new Date(),
// // // //               // Ensure pincode is a string for consistent comparison
// // // //               pincode: data.pincode ? data.pincode.toString() : ""
// // // //             };
// // // //           })
// // // //           .filter((post) => (post.reports || 0) < 3);
        
// // // //         console.log("Filtered posts:", postsData.length);
// // // //         setPosts(postsData);

// // // //         // Fetch user details for each post
// // // //         const usersData = {};
// // // //         for (const post of postsData) {
// // // //           if (!usersData[post.userId] && post.userId) {
// // // //             try {
// // // //               const userRef = doc(db, "users", post.userId);
// // // //               const userSnap = await getDoc(userRef);
// // // //               if (userSnap.exists()) {
// // // //                 usersData[post.userId] = userSnap.data();
// // // //               }
// // // //             } catch (error) {
// // // //               console.error(`Error fetching user details for ${post.userId}:`, error);
// // // //             }
// // // //           }
// // // //         }
// // // //         setUserDetails(usersData);
// // // //         setLoading(false);
// // // //       } catch (error) {
// // // //         console.error("Error fetching posts:", error);
// // // //         setLoading(false);
// // // //       }
// // // //     };

// // // //     fetchPosts();
// // // //   }, []);

// // // //   // Step 3: Filter posts by pincode
// // // //   useEffect(() => {
// // // //     console.log("Filtering posts. User pincode:", userPincode);
// // // //     console.log("Show all posts:", showAllPosts);
// // // //     console.log("Total posts:", posts.length);
    
// // // //     if (posts.length === 0) {
// // // //       setFilteredPosts([]);
// // // //       return;
// // // //     }
    
// // // //     if (!showAllPosts && userPincode) {
// // // //       console.log("Filtering by pincode:", userPincode);
// // // //       const pincodeFilteredPosts = posts.filter(post => {
// // // //         const postPincode = post.pincode ? post.pincode.toString() : "";
// // // //         const userPincodeStr = userPincode.toString();
        
// // // //         console.log("Post pincode:", postPincode, "User pincode:", userPincodeStr, 
// // // //                    "Match:", postPincode === userPincodeStr);
        
// // // //         return postPincode === userPincodeStr;
// // // //       });
      
// // // //       console.log("Filtered posts count:", pincodeFilteredPosts.length);
// // // //       setFilteredPosts(pincodeFilteredPosts);
// // // //     } else {
// // // //       console.log("Showing all posts");
// // // //       setFilteredPosts(posts);
// // // //     }
// // // //   }, [userPincode, posts, showAllPosts]);

// // // //   // Step 4: Fetch comments
// // // //   useEffect(() => {
// // // //     const fetchComments = async () => {
// // // //       console.log("Fetching comments");
// // // //       try {
// // // //         const commentsData = {};
// // // //         const querySnapshot = await getDocs(collection(db, "comments"));
// // // //         querySnapshot.forEach((doc) => {
// // // //           const data = doc.data();
// // // //           if (!commentsData[data.postId]) {
// // // //             commentsData[data.postId] = [];
// // // //           }
          
// // // //           // Convert timestamp to date object if needed
// // // //           const timestamp = data.timestamp && data.timestamp.toDate 
// // // //             ? data.timestamp.toDate() 
// // // //             : data.timestamp || new Date();
            
// // // //           commentsData[data.postId].push({ 
// // // //             id: doc.id, 
// // // //             ...data,
// // // //             timestamp: timestamp
// // // //           });
// // // //         });
    
// // // //         // Sort comments by timestamp
// // // //         Object.keys(commentsData).forEach(postId => {
// // // //           commentsData[postId].sort((a, b) => a.timestamp - b.timestamp);
// // // //         });
        
// // // //         setComments(commentsData);
// // // //         console.log("Comments loaded:", Object.keys(commentsData).length);
// // // //       } catch (error) {
// // // //         console.error("Error fetching comments:", error);
// // // //       }
// // // //     };
  
// // // //     fetchComments();
// // // //   }, []);
  
// // // //   const handleVote = async (postId, type) => {
// // // //     if (!currentUser) {
// // // //       console.log("User must be logged in to vote");
// // // //       return;
// // // //     }
    
// // // //     const currentUserId = currentUser.uid;
// // // //     const postRef = doc(db, "posts", postId);
    
// // // //     // Use different collections for upvotes and downvotes
// // // //     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
// // // //     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
// // // //     try {
// // // //       // Check if the user has already upvoted or downvoted
// // // //       const upvoteSnap = await getDoc(upvoteRef);
// // // //       const downvoteSnap = await getDoc(downvoteRef);
// // // //       const hasUpvoted = upvoteSnap.exists();
// // // //       const hasDownvoted = downvoteSnap.exists();
  
// // // //       // If clicking the same vote type they already did - do nothing
// // // //       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
// // // //         console.log("User has already voted this way");
// // // //         return;
// // // //       }
  
// // // //       // If user is trying to upvote but has already downvoted
// // // //       if (type === "upvotes" && hasDownvoted) {
// // // //         // Remove downvote document
// // // //         await deleteDoc(downvoteRef);
        
// // // //         // Add upvote document
// // // //         await setDoc(upvoteRef, { 
// // // //           voted: true, 
// // // //           timestamp: new Date(),
// // // //           userId: currentUserId,
// // // //           postId: postId
// // // //         });
        
// // // //         // Update post counts: decrease downvotes by 1, increase upvotes by 1
// // // //         await updateDoc(postRef, { 
// // // //           downvotes: increment(-1),
// // // //           upvotes: increment(1)
// // // //         });
        
// // // //         // Update local state
// // // //         setPosts((prev) =>
// // // //           prev.map((post) =>
// // // //             post.id === postId
// // // //               ? { 
// // // //                   ...post, 
// // // //                   upvotes: (post.upvotes || 0) + 1,
// // // //                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
// // // //                 }
// // // //               : post
// // // //           )
// // // //         );
// // // //       } 
// // // //       // If user is trying to downvote but has already upvoted
// // // //       else if (type === "downvotes" && hasUpvoted) {
// // // //         // Remove upvote document
// // // //         await deleteDoc(upvoteRef);
        
// // // //         // Add downvote document
// // // //         await setDoc(downvoteRef, { 
// // // //           voted: true, 
// // // //           timestamp: new Date(),
// // // //           userId: currentUserId,
// // // //           postId: postId
// // // //         });
        
// // // //         // Update post counts: decrease upvotes by 1, increase downvotes by 1
// // // //         await updateDoc(postRef, { 
// // // //           upvotes: increment(-1),
// // // //           downvotes: increment(1)
// // // //         });
        
// // // //         // Update local state
// // // //         setPosts((prev) =>
// // // //           prev.map((post) =>
// // // //             post.id === postId
// // // //               ? { 
// // // //                   ...post, 
// // // //                   downvotes: (post.downvotes || 0) + 1,
// // // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // // //                 }
// // // //               : post
// // // //           )
// // // //         );
        
// // // //         // Also update filteredPosts state to reflect changes
// // // //         setFilteredPosts((prev) =>
// // // //           prev.map((post) =>
// // // //             post.id === postId
// // // //               ? { 
// // // //                   ...post, 
// // // //                   downvotes: (post.downvotes || 0) + 1,
// // // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // // //                 }
// // // //               : post
// // // //           )
// // // //         );
// // // //       }
// // // //       // New vote (user hasn't voted before)
// // // //       else {
// // // //         // Determine which collection to use based on vote type
// // // //         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
// // // //         // Create new vote document in the appropriate collection
// // // //         await setDoc(voteRef, { 
// // // //           voted: true, 
// // // //           timestamp: new Date(),
// // // //           userId: currentUserId,
// // // //           postId: postId
// // // //         });
        
// // // //         // Update post count
// // // //         await updateDoc(postRef, { [type]: increment(1) });
        
// // // //         // Update both posts and filteredPosts states
// // // //         setPosts((prev) =>
// // // //           prev.map((post) =>
// // // //             post.id === postId
// // // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // // //               : post
// // // //           )
// // // //         );
        
// // // //         setFilteredPosts((prev) =>
// // // //           prev.map((post) =>
// // // //             post.id === postId
// // // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // // //               : post
// // // //           )
// // // //         );
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error handling vote:", error);
// // // //     }
// // // //   };

// // // //   const handleReport = async (postId) => {
// // // //     if (!currentUser) {
// // // //       console.log("User must be logged in to report");
// // // //       return;
// // // //     }
    
// // // //     const currentUserId = currentUser.uid;
// // // //     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
// // // //     const postRef = doc(db, "posts", postId);

// // // //     try {
// // // //       const reportSnap = await getDoc(reportRef);
// // // //       if (!reportSnap.exists()) {
// // // //         await setDoc(reportRef, { 
// // // //           reported: true,
// // // //           timestamp: new Date(),
// // // //           userId: currentUserId,
// // // //           postId: postId
// // // //         });
// // // //         await updateDoc(postRef, { reports: increment(1) });
        
// // // //         // Update both posts and filteredPosts states
// // // //         setPosts((prev) => prev.filter((post) => post.id !== postId));
// // // //         setFilteredPosts((prev) => prev.filter((post) => post.id !== postId));
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Error reporting:", error);
// // // //     }
// // // //   };

// // // //   const handleShare = async (postId) => {
// // // //     const postRef = doc(db, "posts", postId);
// // // //     const url = `${window.location.origin}/post/${postId}`;
// // // //     setShareUrl(url);
// // // //     setShowShareDialog(true);

// // // //     try {
// // // //       await updateDoc(postRef, { shares: increment(1) });
      
// // // //       // Update both posts and filteredPosts states
// // // //       setPosts((prev) =>
// // // //         prev.map((post) =>
// // // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // // //         )
// // // //       );
      
// // // //       setFilteredPosts((prev) =>
// // // //         prev.map((post) =>
// // // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // // //         )
// // // //       );
// // // //     } catch (error) {
// // // //       console.error("Error sharing:", error);
// // // //     }
// // // //   };

// // // //   const handleAddComment = async (postId) => {
// // // //     if (!currentUser || newComment.trim() === "") return;
  
// // // //     try {
// // // //       // Fetch the user document from Firestore
// // // //       const userRef = doc(db, "users", currentUser.uid);
// // // //       const userSnap = await getDoc(userRef);
  
// // // //       let username = "Anonymous"; // Default username
// // // //       if (userSnap.exists()) {
// // // //         username = userSnap.data().username || "Anonymous";
// // // //       }
  
// // // //       // Comment data including fetched username
// // // //       const commentData = {
// // // //         postId,
// // // //         userId: currentUser.uid,
// // // //         username, // Use the fetched username
// // // //         content: newComment,
// // // //         timestamp: new Date(),
// // // //       };
  
// // // //       // Store the comment in Firestore
// // // //       const commentRef = doc(collection(db, "comments"));
// // // //       await setDoc(commentRef, commentData);
  
// // // //       // Update UI to reflect new comment
// // // //       setComments((prev) => ({
// // // //         ...prev,
// // // //         [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
// // // //       }));
  
// // // //       setNewComment(""); // Clear the input field
// // // //     } catch (error) {
// // // //       console.error("Error adding comment:", error);
// // // //     }
// // // //   };
  
// // // //   const toggleViewAllPosts = () => {
// // // //     setShowAllPosts(!showAllPosts);
// // // //   };

// // // //   // Display formatted time
// // // //   const formatDate = (timestamp) => {
// // // //     if (!timestamp) return 'Unknown time';
    
// // // //     try {
// // // //       // Convert Firebase timestamp to JS Date if needed
// // // //       const date = timestamp.toDate ? timestamp.toDate() : timestamp;
// // // //       return date.toLocaleString();
// // // //     } catch (error) {
// // // //       console.error("Error formatting date:", error, timestamp);
// // // //       return 'Invalid date';
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
// // // //       {/* Debug Info - Remove in production */}
// // // //       {/*
// // // //       <div className="w-full max-w-2xl px-4 mt-4 mb-2 bg-yellow-100 p-2 rounded">
// // // //         <p>User Pincode: {userPincode || "None"}</p>
// // // //         <p>Show All Posts: {showAllPosts ? "Yes" : "No"}</p>
// // // //         <p>Total Posts: {posts.length}</p>
// // // //         <p>Filtered Posts: {filteredPosts.length}</p>
// // // //       </div>
// // // //       */}
      
// // // //       {/* Post View Options */}
// // // //       <div className="w-full max-w-2xl px-4 mt-4 mb-2">
// // // //         <div className="bg-white p-4 rounded-lg shadow-lg">
// // // //           <h2 className="text-lg font-bold mb-2">
// // // //             {loading ? "Loading posts..." : 
// // // //               showAllPosts ? "Viewing All Posts" : 
// // // //               userPincode ? `Viewing Posts from Pincode: ${userPincode}` : "No Pincode Set"}
// // // //           </h2>
// // // //           <button
// // // //             onClick={toggleViewAllPosts}
// // // //             className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
// // // //           >
// // // //             {showAllPosts ? "View Local Posts" : "View All Posts"}
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Posts */}
// // // //       <div className="w-full max-w-2xl px-4">
// // // //         {loading ? (
// // // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // // //             <p className="text-lg text-gray-700">Loading posts...</p>
// // // //           </div>
// // // //         ) : filteredPosts.length === 0 ? (
// // // //           <div className="bg-white p-6 rounded-lg shadow-lg mb-6 text-center">
// // // //             <p className="text-lg text-gray-700">
// // // //               {!userPincode && !showAllPosts 
// // // //                 ? "No pincode set. Please update your profile." 
// // // //                 : "No posts available."}
// // // //             </p>
// // // //           </div>
// // // //         ) : (
// // // //           filteredPosts.map((post) => {
// // // //             const user = userDetails[post.userId] || {};
// // // //             return (
// // // //               <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
// // // //                 {/* Header */}
// // // //                 <div className="flex items-center mb-4">
// // // //                   <img
// // // //                     src={user.profilePic || "https://via.placeholder.com/50"}
// // // //                     alt="Profile"
// // // //                     className="rounded-full w-12 h-12 mr-3"
// // // //                   />
// // // //                   <div>
// // // //                     <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
// // // //                     <p className="text-sm text-gray-600">
// // // //                       Posted at {formatDate(post.createdAt)}
// // // //                     </p>
// // // //                   </div>
// // // //                 </div>

// // // //                 {/* Content */}
// // // //                 <p className="text-lg mb-4">{post.content}</p>

// // // //                 {/* Media */}
// // // //                 {post.mediaUrl && (
// // // //                   <div className="mb-4">
// // // //                     <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
// // // //                   </div>
// // // //                 )}

// // // //                 {/* Engagement */}
// // // //                 <div className="flex justify-between items-center mt-4">
// // // //                   <span className="text-gray-700">📍 Pincode: {post.pincode || "Unknown"}</span>
// // // //                 </div>

// // // //                 {/* Actions */}
// // // //                 <div className="flex justify-between items-center mt-4">
// // // //                   <button
// // // //                     className="flex items-center text-gray-600"
// // // //                     onClick={() => handleVote(post.id, "upvotes")}
// // // //                   >
// // // //                     <UilAngleUp size="30" className="mr-1" />
// // // //                     <span>{post.upvotes || 0}</span>
// // // //                   </button>
// // // //                   <button
// // // //                     className="flex items-center text-gray-600"
// // // //                     onClick={() => handleVote(post.id, "downvotes")}
// // // //                   >
// // // //                     <UilAngleDown size="30" className="mr-1" />
// // // //                     <span>{post.downvotes || 0}</span>
// // // //                   </button>
// // // //                   <button
// // // //                     className="flex items-center text-gray-600"
// // // //                     onClick={() => handleReport(post.id)}
// // // //                   >
// // // //                     <UilSick size="30" className="mr-1" />
// // // //                     <span>{post.reports || 0}</span>
// // // //                   </button>
// // // //                   <button
// // // //                     className="flex items-center text-gray-600"
// // // //                     onClick={() => handleShare(post.id)}
// // // //                   >
// // // //                     <UilShare size="30" className="mr-1" />
// // // //                     <span>{post.shares || 0}</span>
// // // //                   </button>
// // // //                 </div>
                
// // // //                 {/* Comments Section */}
// // // //                 <div className="mt-4">
// // // //                   <h3 className="text-lg font-semibold mb-2">Comments</h3>
// // // //                   {/* Show existing comments */}
// // // //                   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
// // // //                     {comments[post.id] && comments[post.id].length > 0 ? (
// // // //                       comments[post.id].map((comment) => (
// // // //                         <div key={comment.id} className="border-b p-2">
// // // //                           <p className="text-sm font-semibold">{comment.username}</p>
// // // //                           <p className="text-sm">{comment.content}</p>
// // // //                         </div>
// // // //                       ))
// // // //                     ) : (
// // // //                       <p className="text-sm text-gray-500 p-2">No comments yet</p>
// // // //                     )}
// // // //                   </div>

// // // //                   {/* Add a comment */}
// // // //                   {currentUser && (
// // // //                     <div className="mt-2 flex">
// // // //                       <input
// // // //                         type="text"
// // // //                         placeholder="Write a comment..."
// // // //                         value={newComment}
// // // //                         onChange={(e) => setNewComment(e.target.value)}
// // // //                         className="flex-grow p-2 border rounded-l-md"
// // // //                       />
// // // //                       <button
// // // //                         onClick={() => handleAddComment(post.id)}
// // // //                         className="bg-blue-500 text-white px-4 rounded-r-md"
// // // //                       >
// // // //                         Comment
// // // //                       </button>
// // // //                     </div>
// // // //                   )}
// // // //                 </div>
// // // //               </div>
// // // //             );
// // // //           })
// // // //         )}
// // // //       </div>

// // // //       {/* Share Modal */}
// // // //       {showShareDialog && (
// // // //         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
// // // //           <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
// // // //             <h2 className="text-lg font-bold mb-4">Share Post</h2>
// // // //             <input
// // // //               type="text"
// // // //               value={shareUrl}
// // // //               readOnly
// // // //               className="w-full p-2 border rounded"
// // // //             />
// // // //             <div className="flex justify-between mt-4">
// // // //               <a href={`https://api.whatsapp.com/send?text=${shareUrl}`} target="_blank" className="text-green-600">
// // // //                 WhatsApp
// // // //               </a>
// // // //               <a href={`https://twitter.com/intent/tweet?url=${shareUrl}`} target="_blank" className="text-blue-600">
// // // //                 Twitter
// // // //               </a>
// // // //               <button
// // // //                 onClick={() => {
// // // //                   navigator.clipboard.writeText(shareUrl);
// // // //                   alert("Copied!");
// // // //                 }}
// // // //                 className="text-gray-600"
// // // //               >
// // // //                 Copy Link
// // // //               </button>
// // // //             </div>
// // // //             <button onClick={() => setShowShareDialog(false)} className="mt-4 text-red-600">
// // // //               Close
// // // //             </button>
// // // //           </div>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Post;



// // // // // import React, { useEffect, useState } from "react";
// // // // // import { db, auth } from "./config/firebase";
// // // // // import Navbar from "./Navbar";
// // // // // import { deleteDoc } from "firebase/firestore";
// // // // // import {
// // // // //   collection,
// // // // //   getDocs,
// // // // //   doc,
// // // // //   updateDoc,
// // // // //   increment,
// // // // //   setDoc,
// // // // //   getDoc,
// // // // // } from "firebase/firestore";
// // // // // import { onAuthStateChanged } from "firebase/auth";
// // // // // import {
// // // // //   UilAngleUp,
// // // // //   UilAngleDown,
// // // // //   UilSick,
// // // // //   UilShare,
// // // // // } from "@iconscout/react-unicons";
// // // // // //  <Navbar/> 
// // // // // const Post = ({ userId }) => {
// // // // //   const [posts, setPosts] = useState([]);
// // // // //   const [userDetails, setUserDetails] = useState({});
// // // // //   const [shareUrl, setShareUrl] = useState("");
// // // // //   const [showShareDialog, setShowShareDialog] = useState(false);
// // // // //   const [currentUser, setCurrentUser] = useState(null);
// // // // //   const [comments, setComments] = useState({});
// // // // //   const [newComment, setNewComment] = useState("");
  
// // // // //   useEffect(() => {
// // // // //     // Listen for authentication state changes - only track the auth user ID
// // // // //     const unsubscribe = onAuthStateChanged(auth, (user) => {
// // // // //       if (user) {
// // // // //         setCurrentUser(user);
// // // // //         console.log("User ID:", user.uid);
// // // // //       } else {
// // // // //         setCurrentUser(null);
// // // // //         console.log("No user is currently logged in");
// // // // //       }
// // // // //     });

// // // // //     return () => unsubscribe();
// // // // //   }, []);

  
// // // // //   useEffect(() => {
// // // // //     const fetchPosts = async () => {
// // // // //       try {
// // // // //         const querySnapshot = await getDocs(collection(db, "posts"));
// // // // //         const postsData = querySnapshot.docs
// // // // //           .map((doc) => ({
// // // // //             id: doc.id,
// // // // //             ...doc.data(),
// // // // //           }))
// // // // //           .filter((post) => (post.reports || 0) < 3);
// // // // //         setPosts(postsData);

// // // // //         const usersData = {};
// // // // //         for (const post of postsData) {
// // // // //           if (!usersData[post.userId]) {
// // // // //             const userRef = doc(db, "users", post.userId);
// // // // //             const userSnap = await getDoc(userRef);
// // // // //             if (userSnap.exists()) {
// // // // //               usersData[post.userId] = userSnap.data();
// // // // //             }
// // // // //           }
// // // // //         }
// // // // //         setUserDetails(usersData);
// // // // //       } catch (error) {
// // // // //         console.error("Error fetching posts:", error);
// // // // //       }
// // // // //     };

// // // // //     fetchPosts();
// // // // //   }, []);
// // // // //   useEffect(() => {
// // // // //     const fetchComments = async () => {
// // // // //       const commentsData = {};
// // // // //       const querySnapshot = await getDocs(collection(db, "comments"));
// // // // //       querySnapshot.forEach((doc) => {
// // // // //         const data = doc.data();
// // // // //         if (!commentsData[data.postId]) {
// // // // //           commentsData[data.postId] = [];
// // // // //         }
// // // // //         commentsData[data.postId].push({ id: doc.id, ...data });
// // // // //       });
  
// // // // //       setComments(commentsData);
// // // // //     };
  
// // // // //     fetchComments();
// // // // //   }, []);
  
// // // // //   const handleVote = async (postId, type) => {
// // // // //     if (!currentUser) {
// // // // //       console.log("User must be logged in to vote");
// // // // //       return;
// // // // //     }
    
// // // // //     const currentUserId = currentUser.uid;
// // // // //     const postRef = doc(db, "posts", postId);
    
// // // // //     // Use different collections for upvotes and downvotes
// // // // //     const upvoteRef = doc(db, "upvotes", `${postId}_${currentUserId}`);
// // // // //     const downvoteRef = doc(db, "downvotes", `${postId}_${currentUserId}`);
  
// // // // //     try {
// // // // //       // Check if the user has already upvoted or downvoted
// // // // //       const upvoteSnap = await getDoc(upvoteRef);
// // // // //       const downvoteSnap = await getDoc(downvoteRef);
// // // // //       const hasUpvoted = upvoteSnap.exists();
// // // // //       const hasDownvoted = downvoteSnap.exists();
  
// // // // //       // If clicking the same vote type they already did - do nothing
// // // // //       if ((type === "upvotes" && hasUpvoted) || (type === "downvotes" && hasDownvoted)) {
// // // // //         console.log("User has already voted this way");
// // // // //         return;
// // // // //       }
  
// // // // //       // If user is trying to upvote but has already downvoted
// // // // //       if (type === "upvotes" && hasDownvoted) {
// // // // //         // Remove downvote document
// // // // //         await deleteDoc(downvoteRef);
        
// // // // //         // Add upvote document
// // // // //         await setDoc(upvoteRef, { 
// // // // //           voted: true, 
// // // // //           timestamp: new Date(),
// // // // //           userId: currentUserId,
// // // // //           postId: postId
// // // // //         });
        
// // // // //         // Update post counts: decrease downvotes by 1, increase upvotes by 1
// // // // //         await updateDoc(postRef, { 
// // // // //           downvotes: increment(-1),
// // // // //           upvotes: increment(1)
// // // // //         });
        
// // // // //         // Update local state
// // // // //         setPosts((prev) =>
// // // // //           prev.map((post) =>
// // // // //             post.id === postId
// // // // //               ? { 
// // // // //                   ...post, 
// // // // //                   upvotes: (post.upvotes || 0) + 1,
// // // // //                   downvotes: Math.max((post.downvotes || 0) - 1, 0)
// // // // //                 }
// // // // //               : post
// // // // //           )
// // // // //         );
// // // // //       } 
// // // // //       // If user is trying to downvote but has already upvoted
// // // // //       else if (type === "downvotes" && hasUpvoted) {
// // // // //         // Remove upvote document
// // // // //         await deleteDoc(upvoteRef);
        
// // // // //         // Add downvote document
// // // // //         await setDoc(downvoteRef, { 
// // // // //           voted: true, 
// // // // //           timestamp: new Date(),
// // // // //           userId: currentUserId,
// // // // //           postId: postId
// // // // //         });
        
// // // // //         // Update post counts: decrease upvotes by 1, increase downvotes by 1
// // // // //         await updateDoc(postRef, { 
// // // // //           upvotes: increment(-1),
// // // // //           downvotes: increment(1)
// // // // //         });
        
// // // // //         // Update local state
// // // // //         setPosts((prev) =>
// // // // //           prev.map((post) =>
// // // // //             post.id === postId
// // // // //               ? { 
// // // // //                   ...post, 
// // // // //                   downvotes: (post.downvotes || 0) + 1,
// // // // //                   upvotes: Math.max((post.upvotes || 0) - 1, 0)
// // // // //                 }
// // // // //               : post
// // // // //           )
// // // // //         );
// // // // //       }
// // // // //       // New vote (user hasn't voted before)
// // // // //       else {
// // // // //         // Determine which collection to use based on vote type
// // // // //         const voteRef = type === "upvotes" ? upvoteRef : downvoteRef;
        
// // // // //         // Create new vote document in the appropriate collection
// // // // //         await setDoc(voteRef, { 
// // // // //           voted: true, 
// // // // //           timestamp: new Date(),
// // // // //           userId: currentUserId,
// // // // //           postId: postId
// // // // //         });
        
// // // // //         // Update post count
// // // // //         await updateDoc(postRef, { [type]: increment(1) });
        
// // // // //         // Update local state
// // // // //         setPosts((prev) =>
// // // // //           prev.map((post) =>
// // // // //             post.id === postId
// // // // //               ? { ...post, [type]: (post[type] || 0) + 1 }
// // // // //               : post
// // // // //           )
// // // // //         );
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error handling vote:", error);
// // // // //     }
// // // // //   };

// // // // //   const handleReport = async (postId) => {
// // // // //     if (!currentUser) {
// // // // //       console.log("User must be logged in to report");
// // // // //       return;
// // // // //     }
    
// // // // //     const currentUserId = currentUser.uid;
// // // // //     const reportRef = doc(db, "reports", `${postId}_${currentUserId}`);
// // // // //     const postRef = doc(db, "posts", postId);

// // // // //     try {
// // // // //       const reportSnap = await getDoc(reportRef);
// // // // //       if (!reportSnap.exists()) {
// // // // //         await setDoc(reportRef, { reported: true });
// // // // //         await updateDoc(postRef, { reports: increment(1) });
// // // // //         setPosts((prev) => prev.filter((post) => post.id !== postId));
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Error reporting:", error);
// // // // //     }
// // // // //   };

// // // // //   const handleShare = async (postId) => {
// // // // //     const postRef = doc(db, "posts", postId);
// // // // //     const url = `${window.location.origin}/post/${postId}`;
// // // // //     setShareUrl(url);
// // // // //     setShowShareDialog(true);

// // // // //     try {
// // // // //       await updateDoc(postRef, { shares: increment(1) });
// // // // //       setPosts((prev) =>
// // // // //         prev.map((post) =>
// // // // //           post.id === postId ? { ...post, shares: (post.shares || 0) + 1 } : post
// // // // //         )
// // // // //       );
// // // // //     } catch (error) {
// // // // //       console.error("Error sharing:", error);
// // // // //     }
// // // // //   };
// // // // //   const handleAddComment = async (postId) => {
// // // // //     if (!currentUser || newComment.trim() === "") return;
  
// // // // //     try {
// // // // //       // Fetch the user document from Firestore
// // // // //       const userRef = doc(db, "users", currentUser.uid);
// // // // //       const userSnap = await getDoc(userRef);
  
// // // // //       let username = "Anonymous"; // Default username
// // // // //       if (userSnap.exists()) {
// // // // //         username = userSnap.data().username || "Anonymous";
// // // // //       }
  
// // // // //       // Comment data including fetched username
// // // // //       const commentData = {
// // // // //         postId,
// // // // //         userId: currentUser.uid,
// // // // //         username, // Use the fetched username
// // // // //         content: newComment,
// // // // //         timestamp: new Date(),
// // // // //       };
  
// // // // //       // Store the comment in Firestore
// // // // //       const commentRef = doc(collection(db, "comments"));
// // // // //       await setDoc(commentRef, commentData);
  
// // // // //       // Update UI to reflect new comment
// // // // //       setComments((prev) => ({
// // // // //         ...prev,
// // // // //         [postId]: [...(prev[postId] || []), { id: commentRef.id, ...commentData }],
// // // // //       }));
  
// // // // //       setNewComment(""); // Clear the input field
// // // // //     } catch (error) {
// // // // //       console.error("Error adding comment:", error);
// // // // //     }
// // // // //   };
  
// // // // //   return (
// // // // //     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
// // // // //       {/* Posts */}
// // // // //       <div className="w-full max-w-2xl px-4">
// // // // //         {posts.map((post) => {
// // // // //           const user = userDetails[post.userId] || {};
// // // // //           return (
// // // // //             <div key={post.id} className="bg-white p-6 rounded-lg shadow-lg mb-6">
// // // // //               {/* Header */}
// // // // //               <div className="flex items-center mb-4">
// // // // //                 <img
// // // // //                   src={user.profilePic || "https://via.placeholder.com/50"}
// // // // //                   alt="Profile"
// // // // //                   className="rounded-full w-12 h-12 mr-3"
// // // // //                 />
// // // // //                 <div>
// // // // //                   <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
// // // // //                   <p className="text-sm text-gray-600">
// // // // //                     Posted at {post.createdAt?.toDate?.() ? post.createdAt.toDate().toLocaleString() : 'Unknown time'}
// // // // //                   </p>
// // // // //                 </div>
// // // // //               </div>

// // // // //               {/* Content */}
// // // // //               <p className="text-lg mb-4">{post.content}</p>

// // // // //               {/* Media */}
// // // // //               {post.mediaUrl && (
// // // // //                 <div className="mb-4">
// // // // //                   <img src={post.mediaUrl} alt="Post media" className="w-full rounded-lg" />
// // // // //                 </div>
// // // // //               )}

// // // // //               {/* Engagement */}
// // // // //               <div className="flex justify-between items-center mt-4">
// // // // //                 <span className="text-gray-700">📍 Pincode: {post.pincode}</span>
// // // // //               </div>

// // // // //               {/* Actions */}
// // // // //               <div className="flex justify-between items-center mt-4">
// // // // //                 <button
// // // // //                   className="flex items-center text-gray-600"
// // // // //                   onClick={() => handleVote(post.id, "upvotes")}
// // // // //                 >
// // // // //                   <UilAngleUp size="30" className="mr-1" />
// // // // //                   <span>{post.upvotes || 0}</span>
// // // // //                 </button>
// // // // //                 <button
// // // // //                   className="flex items-center text-gray-600"
// // // // //                   onClick={() => handleVote(post.id, "downvotes")}
// // // // //                 >
// // // // //                   <UilAngleDown size="30" className="mr-1" />
// // // // //                   <span>{post.downvotes || 0}</span>
// // // // //                 </button>
// // // // //                 <button
// // // // //                   className="flex items-center text-gray-600"
// // // // //                   onClick={() => handleReport(post.id)}
// // // // //                 >
// // // // //                   <UilSick size="30" className="mr-1" />
// // // // //                   <span>{post.reports || 0}</span>
// // // // //                 </button>
// // // // //                 <button
// // // // //                   className="flex items-center text-gray-600"
// // // // //                   onClick={() => handleShare(post.id)}
// // // // //                 >
// // // // //                   <UilShare size="30" className="mr-1" />
// // // // //                   <span>{post.shares || 0}</span>
// // // // //                 </button>
// // // // //               </div>
// // // // //               {/* Comments Section */}
// // // // // <div className="mt-4">
// // // // //   <h3 className="text-lg font-semibold mb-2">Comments</h3>
// // // // //   {/* Show existing comments */}
// // // // //   <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
// // // // //                 {comments[post.id]?.map((comment) => (
// // // // //                   <div key={comment.id} className="border-b p-2">
// // // // //                     <p className="text-sm font-semibold">{comment.username}</p>
// // // // //                     <p className="text-sm">{comment.content}</p>
// // // // //                   </div>
// // // // //                 ))}
// // // // //               </div>

  
// // // // //   {/* Add a comment */}
// // // // //   {currentUser && (
// // // // //     <div className="mt-2 flex">
// // // // //       <input
// // // // //         type="text"
// // // // //         placeholder="Write a comment..."
// // // // //         value={newComment}
// // // // //         onChange={(e) => setNewComment(e.target.value)}
// // // // //         className="flex-grow p-2 border rounded-l-md"
// // // // //       />
// // // // //       <button
// // // // //         onClick={() => handleAddComment(post.id)}
// // // // //         className="bg-blue-500 text-white px-4 rounded-r-md"
// // // // //       >
// // // // //         Comment
// // // // //       </button>
// // // // //     </div>
// // // // //   )}
// // // // // </div>

// // // // //             </div>
// // // // //           );
// // // // //         })}
// // // // //       </div>

// // // // //       {/* Share Modal */}
// // // // //       {showShareDialog && (
// // // // //         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
// // // // //           <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
// // // // //             <h2 className="text-lg font-bold mb-4">Share Post</h2>
// // // // //             <input
// // // // //               type="text"
// // // // //               value={shareUrl}
// // // // //               readOnly
// // // // //               className="w-full p-2 border rounded"
// // // // //             />
// // // // //             <div className="flex justify-between mt-4">
// // // // //               <a href={`https://api.whatsapp.com/send?text=${shareUrl}`} target="_blank" className="text-green-600">
// // // // //                 WhatsApp
// // // // //               </a>
// // // // //               <a href={`https://twitter.com/intent/tweet?url=${shareUrl}`} target="_blank" className="text-blue-600">
// // // // //                 Twitter
// // // // //               </a>
// // // // //               <button
// // // // //                 onClick={() => {
// // // // //                   navigator.clipboard.writeText(shareUrl);
// // // // //                   alert("Copied!");
// // // // //                 }}
// // // // //                 className="text-gray-600"
// // // // //               >
// // // // //                 Copy Link
// // // // //               </button>
// // // // //             </div>
// // // // //             <button onClick={() => setShowShareDialog(false)} className="mt-4 text-red-600">
// // // // //               Close
// // // // //             </button>
// // // // //           </div>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // export default Post;
