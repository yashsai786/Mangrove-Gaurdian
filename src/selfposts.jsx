import React, { useEffect, useState } from "react";
import { db, auth } from "./config/firebase";
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
    where
  } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import PostCard from "./PostCard";
import {
  UilThumbsUp,
  UilThumbsDown,
  UilSick,
  UilShare,
  UilEdit,
  UilTrash,
  UilTimes 
} from "@iconscout/react-unicons";

// Use the production API URL directly to avoid connection issues
const API_URL = "https://transgression-vigilance.vercel.app";

const SelfPosts = () => {
  const [posts, setPosts] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [shareUrl, setShareUrl] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editFormData, setEditFormData] = useState({
    content: "",
    pincode: ""
  });
  const [editImage, setEditImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState({ checked: false, working: false });

  useEffect(() => {
    // Listen for authentication state changes - only track the auth user ID
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        console.log("User ID:", user.uid);
        // Fetch posts when user authentication state changes
        fetchUserPosts(user.uid);
        fetchUserDetails(user.uid);
      } else {
        setCurrentUser(null);
        console.log("No user is currently logged in");
        // Clear posts when user logs out
        setPosts([]);
      }
    });

    // Check API status
    checkApiStatus();

    return () => unsubscribe();
  }, []);

  // Check if the API is working
  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setApiStatus({ checked: true, working: data.status === "ok" });
      console.log("API status:", data.status === "ok" ? "working" : "not working");
    } catch (error) {
      console.error("API health check failed:", error);
      setApiStatus({ checked: true, working: false });
    }
  };

  // Separate function to fetch posts by the current user
  const fetchUserPosts = async (userId) => {
    if (!userId) return;

    try {
      // Create a query to get only posts created by the current user
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      const postsData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((post) => (post.reports || 0) < 3);

      setPosts(postsData);

      // Fetch comments for these posts
      fetchComments(postsData.map(post => post.id));

    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  const fetchUserDetails = async (userId) => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserDetails({ [userId]: userData });
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchComments = async (postIds) => {
    if (!postIds || postIds.length === 0) return;

    try {
      const commentsData = {};

      // Loop through each post ID and fetch its comments
      for (const postId of postIds) {
        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", postId));
        const querySnapshot = await getDocs(q);

        const postComments = [];
        querySnapshot.forEach((doc) => {
          postComments.push({ id: doc.id, ...doc.data() });
        });

        if (postComments.length > 0) {
          commentsData[postId] = postComments;
        }
      }

      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  // Handle opening the edit dialog
  const handleEditClick = (post) => {
    setEditingPost(post);
    setEditFormData({
      content: post.content || "",
      pincode: post.pincode || ""
    });
    setImagePreview(post.mediaUrl || null);
    setShowEditDialog(true);
  };

  // Handle file input change for editing post
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to ImageKit using the production API
  const uploadToImageKit = async (file) => {
    if (!file) return null;

    try {
      console.log("Getting ImageKit auth tokens from:", `${API_URL}/api/auth`);
      const authResponse = await fetch(`${API_URL}/api/auth`);
      if (!authResponse.ok) {
        throw new Error(`Failed to get auth tokens: ${authResponse.status} ${authResponse.statusText}`);
      }
      
      const authData = await authResponse.json();
      console.log("Auth data received:", authData);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", `post_${Date.now()}_${file.name}`);
      formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/postMedia");
      
      console.log("Uploading to ImageKit...");
      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Upload result:", result);
      
      if (!result.url) {
        throw new Error("Upload failed: " + (result.error?.message || "No URL returned"));
      }

      return result.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw new Error("Image upload failed: " + error.message);
    }
  };

  // Handle post edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPost || !currentUser) return;

    setIsSubmitting(true);
    try {
      // Check if API is working before attempting upload
      if (!apiStatus.working) {
        await checkApiStatus();
        if (!apiStatus.working) {
          throw new Error("API is not available. Please try again later.");
        }
      }
      
      // Update post data object
      const updatedPost = {
        ...editFormData,
        updatedAt: new Date()
      };

      // Upload new image if selected
      if (editImage) {
        const imageUrl = await uploadToImageKit(editImage);
        if (imageUrl) {
          updatedPost.mediaUrl = imageUrl;
        } else {
          throw new Error("Image upload failed. Cannot update post.");
        }
      }

      // Update the post in Firestore
      const postRef = doc(db, "posts", editingPost.id);
      await updateDoc(postRef, updatedPost);

      // Update local state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === editingPost.id
            ? { ...post, ...updatedPost }
            : post
        )
      );

      // Close the edit dialog
      setShowEditDialog(false);
      setEditingPost(null);
      setEditImage(null);
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle post deletion
  const handleDeletePost = async (postId) => {
    if (!currentUser) return;
    
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      // Get the post data first
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data();
        
        // Create a new document in deletedPosts collection
        const deletedPostRef = doc(db, "deletedPosts", postId);
        await setDoc(deletedPostRef, {
          ...postData,
          deletedAt: new Date(),
          deletedBy: "user himself"
        });
        
        // Delete the post from posts collection
        await deleteDoc(postRef);
        
        // Update local state
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post: " + error.message);
    }
  };

  // Share post handler
  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    setShareUrl(url);
    setShowShareDialog(true);
  };

  // No posts message
  if (currentUser && posts.length === 0) {
    return (
      <div className="bg-gray-100 flex flex-col items-center min-h-screen p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-full max-w-2xl text-center">
          <h2 className="text-xl font-bold">You haven't created any posts yet</h2>
          <p className="text-gray-600 mt-2">Your posts will appear here once you create them.</p>
        </div>
      </div>
    );
  }

  // Not logged in message
  if (!currentUser) {
    return (
      <div className="bg-gray-100 flex flex-col items-center min-h-screen p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-full max-w-2xl text-center">
          <h2 className="text-xl font-bold">Please log in to view your posts</h2>
          <p className="text-gray-600 mt-2">You need to be logged in to see your posts.</p>
        </div>
      </div>
    );
  }

  // Points and badges display
  const userPoints = userDetails[currentUser?.uid]?.points || 0;
  const userBadges = userDetails[currentUser?.uid]?.badges || [];

  return (
    <div className="bg-gray-100 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-2xl px-4 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl font-bold">My Posts</h1>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold text-sm">Points: {userPoints}</span>
            {userBadges.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold text-sm">Badges: {userBadges.join(", ")}</span>
            )}
          </div>
        </div>
        {!apiStatus.working && apiStatus.checked && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300">
            API connection error. Image uploads may not work properly.
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="w-full max-w-2xl px-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            user={userDetails[post.userId] || {}}
            currentUser={currentUser}
            comments={comments[post.id] || []}
            onEditClick={handleEditClick}
            onDeletePost={handleDeletePost}
            onShare={handleShare}
            onNewComment={(postId, commentText) => {
              // This will be implemented in the PostCard component
            }}
          />
        ))}
      </div>

      {/* Share Modal */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-lg font-bold mb-4">Share Post</h2>
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="w-full p-2 border rounded"
            />
            <div className="flex justify-between mt-4">
              <a href={`https://api.whatsapp.com/send?text=${shareUrl}`} target="_blank" className="text-green-600">
                WhatsApp
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${shareUrl}`} target="_blank" className="text-blue-600">
                Twitter
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Copied!");
                }}
                className="text-gray-600"
              >
                Copy Link
              </button>
            </div>
            <button onClick={() => setShowShareDialog(false)} className="mt-4 text-red-600">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditDialog && editingPost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Post</h2>
              <button 
                onClick={() => setShowEditDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <UilTimes size="24" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              {/* Content */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={editFormData.content}
                  onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                ></textarea>
              </div>
              
              {/* Area */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <input
                  type="text"
                  value={editFormData.area || ''}
                  onChange={(e) => setEditFormData({...editFormData, area: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Image */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                {imagePreview && (
                  <div className="mb-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full max-h-48 object-contain rounded-lg"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfPosts;

// import React, { useEffect, useState } from "react";
// import { db, auth } from "./config/firebase";
// import { deleteDoc } from "firebase/firestore";
// import {
//     collection,
//     getDocs,
//     doc,
//     updateDoc,
//     increment,
//     setDoc,
//     getDoc,
//     query,
//     where
//   } from "firebase/firestore";
//   // import { onAuthStateChanged } from "firebase/auth";
// import { onAuthStateChanged } from "firebase/auth";
// import PostCard from "./PostCard";
// import {
//   UilThumbsUp,
//   UilThumbsDown,
//   UilSick,
//   UilShare,
//   UilEdit,
//   UilTrash,
//   UilTimes 
// } from "@iconscout/react-unicons";

// const SelfPosts = () => {
//   const [posts, setPosts] = useState([]);
//   const [userDetails, setUserDetails] = useState({});
//   const [shareUrl, setShareUrl] = useState("");
//   const [showShareDialog, setShowShareDialog] = useState(false);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [comments, setComments] = useState({});
//   const [newComment, setNewComment] = useState("");
//   const [showEditDialog, setShowEditDialog] = useState(false);
//   const [editingPost, setEditingPost] = useState(null);
//   const [editFormData, setEditFormData] = useState({
//     content: "",
//     pincode: ""
//   });
//   const [editImage, setEditImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     // Listen for authentication state changes - only track the auth user ID
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         setCurrentUser(user);
//         console.log("User ID:", user.uid);
//         // Fetch posts when user authentication state changes
//         fetchUserPosts(user.uid);
//         fetchUserDetails(user.uid);
//       } else {
//         setCurrentUser(null);
//         console.log("No user is currently logged in");
//         // Clear posts when user logs out
//         setPosts([]);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   // Separate function to fetch posts by the current user
//   const fetchUserPosts = async (userId) => {
//     if (!userId) return;

//     try {
//       // Create a query to get only posts created by the current user
//       const postsRef = collection(db, "posts");
//       const q = query(postsRef, where("userId", "==", userId));
//       const querySnapshot = await getDocs(q);

//       const postsData = querySnapshot.docs
//         .map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }))
//         .filter((post) => (post.reports || 0) < 3);

//       setPosts(postsData);

//       // Fetch comments for these posts
//       fetchComments(postsData.map(post => post.id));

//     } catch (error) {
//       console.error("Error fetching user posts:", error);
//     }
//   };

//   const fetchUserDetails = async (userId) => {
//     if (!userId) return;

//     try {
//       const userRef = doc(db, "users", userId);
//       const userSnap = await getDoc(userRef);

//       if (userSnap.exists()) {
//         const userData = userSnap.data();
//         setUserDetails({ [userId]: userData });
//       }
//     } catch (error) {
//       console.error("Error fetching user details:", error);
//     }
//   };

//   const fetchComments = async (postIds) => {
//     if (!postIds || postIds.length === 0) return;

//     try {
//       const commentsData = {};

//       // Loop through each post ID and fetch its comments
//       for (const postId of postIds) {
//         const commentsRef = collection(db, "comments");
//         const q = query(commentsRef, where("postId", "==", postId));
//         const querySnapshot = await getDocs(q);

//         const postComments = [];
//         querySnapshot.forEach((doc) => {
//           postComments.push({ id: doc.id, ...doc.data() });
//         });

//         if (postComments.length > 0) {
//           commentsData[postId] = postComments;
//         }
//       }

//       setComments(commentsData);
//     } catch (error) {
//       console.error("Error fetching comments:", error);
//     }
//   };

//   // Handle opening the edit dialog
//   const handleEditClick = (post) => {
//     setEditingPost(post);
//     setEditFormData({
//       content: post.content || "",
//       pincode: post.pincode || ""
//     });
//     setImagePreview(post.mediaUrl || null);
//     setShowEditDialog(true);
//   };

//   // Handle file input change for editing post
//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setEditImage(file);
//       const reader = new FileReader();
//       reader.onload = () => {
//         setImagePreview(reader.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   // Upload image to ImageKit
//   const uploadToImageKit = async (file) => {
//     if (!file) return null;

//     try {
//       const authResponse = await fetch("http://localhost:5000/auth");
//       const authData = await authResponse.json();

//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("fileName", file.name);
//       formData.append("publicKey", "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=");
//       formData.append("signature", authData.signature);
//       formData.append("expire", authData.expire);
//       formData.append("token", authData.token);
//       formData.append("folder", "/postMedia");

//       const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const result = await response.json();
//       if (!result.url) throw new Error("Upload failed: " + (result.error?.message || "Unknown error"));

//       return result.url;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       throw new Error("Image upload failed: " + error.message);
//     }
//   };

//   // Handle post edit submission
//   const handleEditSubmit = async (e) => {
//     e.preventDefault();
//     if (!editingPost || !currentUser) return;

//     setIsSubmitting(true);
//     try {
//       // Update post data object
//       const updatedPost = {
//         ...editFormData,
//         updatedAt: new Date()
//       };

//       // Upload new image if selected
//       if (editImage) {
//         const imageUrl = await uploadToImageKit(editImage);
//         if (imageUrl) {
//           updatedPost.mediaUrl = imageUrl;
//         }
//       }

//       // Update the post in Firestore
//       const postRef = doc(db, "posts", editingPost.id);
//       await updateDoc(postRef, updatedPost);

//       // Update local state
//       setPosts((prev) =>
//         prev.map((post) =>
//           post.id === editingPost.id
//             ? { ...post, ...updatedPost }
//             : post
//         )
//       );

//       // Close the edit dialog
//       setShowEditDialog(false);
//       setEditingPost(null);
//       setEditImage(null);
//     } catch (error) {
//       console.error("Error updating post:", error);
//       alert("Failed to update post: " + error.message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Handle post deletion
//   const handleDeletePost = async (postId) => {
//     if (!currentUser) return;
    
//     if (!confirm("Are you sure you want to delete this post?")) return;

//     try {
//       // Get the post data first
//       const postRef = doc(db, "posts", postId);
//       const postSnap = await getDoc(postRef);
      
//       if (postSnap.exists()) {
//         const postData = postSnap.data();
        
//         // Create a new document in deletedPosts collection
//         const deletedPostRef = doc(db, "deletedPosts", postId);
//         await setDoc(deletedPostRef, {
//           ...postData,
//           deletedAt: new Date(),
//           deletedBy: "user himself"
//         });
        
//         // Delete the post from posts collection
//         await deleteDoc(postRef);
        
//         // Update local state
//         setPosts((prev) => prev.filter((post) => post.id !== postId));
//       }
//     } catch (error) {
//       console.error("Error deleting post:", error);
//       alert("Failed to delete post: " + error.message);
//     }
//   };

//   // Share post handler
//   const handleShare = (postId) => {
//     const url = `${window.location.origin}/post/${postId}`;
//     setShareUrl(url);
//     setShowShareDialog(true);
//   };

//   // No posts message
//   if (currentUser && posts.length === 0) {
//     return (
//       <div className="bg-gray-100 flex flex-col items-center min-h-screen p-4">
//         <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-full max-w-2xl text-center">
//           <h2 className="text-xl font-bold">You haven't created any posts yet</h2>
//           <p className="text-gray-600 mt-2">Your posts will appear here once you create them.</p>
//         </div>
//       </div>
//     );
//   }

//   // Not logged in message
//   if (!currentUser) {
//     return (
//       <div className="bg-gray-100 flex flex-col items-center min-h-screen p-4">
//         <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-full max-w-2xl text-center">
//           <h2 className="text-xl font-bold">Please log in to view your posts</h2>
//           <p className="text-gray-600 mt-2">You need to be logged in to see your posts.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-gray-100 flex flex-col items-center min-h-screen">
//       <div className="w-full max-w-2xl px-4 mt-4">
//         <h1 className="text-2xl font-bold mb-4">My Posts</h1>
//       </div>

//       {/* Posts */}
//       <div className="w-full max-w-2xl px-4">
//         {posts.map((post) => (
//           <PostCard
//             key={post.id}
//             post={post}
//             user={userDetails[post.userId] || {}}
//             currentUser={currentUser}
//             comments={comments[post.id] || []}
//             onEditClick={handleEditClick}
//             onDeletePost={handleDeletePost}
//             onShare={handleShare}
//             onNewComment={(postId, commentText) => {
//               // This will be implemented in the PostCard component
//             }}
//           />
//         ))}
//       </div>

//       {/* Share Modal */}
//       {showShareDialog && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
//           <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
//             <h2 className="text-lg font-bold mb-4">Share Post</h2>
//             <input
//               type="text"
//               value={shareUrl}
//               readOnly
//               className="w-full p-2 border rounded"
//             />
//             <div className="flex justify-between mt-4">
//               <a href={`https://api.whatsapp.com/send?text=${shareUrl}`} target="_blank" className="text-green-600">
//                 WhatsApp
//               </a>
//               <a href={`https://twitter.com/intent/tweet?url=${shareUrl}`} target="_blank" className="text-blue-600">
//                 Twitter
//               </a>
//               <button
//                 onClick={() => {
//                   navigator.clipboard.writeText(shareUrl);
//                   alert("Copied!");
//                 }}
//                 className="text-gray-600"
//               >
//                 Copy Link
//               </button>
//             </div>
//             <button onClick={() => setShowShareDialog(false)} className="mt-4 text-red-600">
//               Close
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Edit Post Modal */}
//       {showEditDialog && editingPost && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-20">
//           <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold">Edit Post</h2>
//               <button 
//                 onClick={() => setShowEditDialog(false)}
//                 className="text-gray-500 hover:text-gray-700"
//               >
//                 <UilTimes size="24" />
//               </button>
//             </div>
            
//             <form onSubmit={handleEditSubmit}>
//               {/* Content */}
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
//                 <textarea
//                   value={editFormData.content}
//                   onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
//                   className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
//                   rows="4"
//                   required
//                 ></textarea>
//               </div>
              
//               {/* Pincode */}
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
//                 <input
//                   type="text"
//                   value={editFormData.pincode}
//                   onChange={(e) => setEditFormData({...editFormData, pincode: e.target.value})}
//                   className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               {/* Image */}
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
//                 {imagePreview && (
//                   <div className="mb-2">
//                     <img 
//                       src={imagePreview} 
//                       alt="Preview" 
//                       className="w-full max-h-48 object-contain rounded-lg"
//                     />
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleImageChange}
//                   className="w-full p-2 border rounded-lg"
//                 />
//               </div>
              
//               {/* Action Buttons */}
//               <div className="flex justify-end space-x-3 mt-6">
//                 <button
//                   type="button"
//                   onClick={() => setShowEditDialog(false)}
//                   className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={isSubmitting}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                       </svg>
//                       Saving...
//                     </>
//                   ) : "Save Changes"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SelfPosts;
