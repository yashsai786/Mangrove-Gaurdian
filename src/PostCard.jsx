import React, { useState } from "react";
import { db } from "./config/firebase";
import {
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import {
  UilThumbsUp,
  UilThumbsDown,
  UilSick,
  UilShare,
  UilEdit,
  UilTrash
} from "@iconscout/react-unicons";

const PostCard = ({
  post,
  user,
  currentUser,
  comments,
  onEditClick,
  onDeletePost,
  onShare
}) => {
  const [newComment, setNewComment] = useState("");

  //Vote Handling
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

        // Post update will be handled by parent component
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

        // Post update will be handled by parent component
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

        // Post update will be handled by parent component
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
        await setDoc(reportRef, { reported: true });
        await updateDoc(postRef, { reports: increment(1) });
        // Post removal will be handled by parent component
      }
    } catch (error) {
      console.error("Error reporting:", error);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || newComment.trim() === "") return;

    try {
      // Fetch the user document from Firestore
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      let username = "Anonymous"; // Default username
      if (userSnap.exists()) {
        username = userSnap.data().username || "Anonymous";
      }

      // Comment data including fetched username
      const commentData = {
        postId: post.id,
        userId: currentUser.uid,
        username, // Use the fetched username
        content: newComment,
        timestamp: new Date(),
      };

      // Store the comment in Firestore
      const commentRef = doc(collection(db, "comments"));
      await setDoc(commentRef, commentData);

      // Clear the input field
      setNewComment("");
      
      // Comment update will be handled by parent component
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img
            src={user.profilePic || "https://via.placeholder.com/50"}
            alt="Profile"
            className="rounded-full w-12 h-12 mr-3"
          />
          <div>
            <h2 className="text-lg font-bold">{user.username || "Unknown"}</h2>
            <p className="text-sm text-gray-600">
              Posted at {post.createdAt?.toDate?.() ? post.createdAt.toDate().toLocaleString() : 'Unknown time'}
            </p>
          </div>
        </div>
        
        {/* Post management buttons */}
        <div className="flex space-x-2">
          <button 
            onClick={() => onEditClick(post)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition"
            title="Edit post"
          >
            <UilEdit size="20" />
          </button>
          <button 
            onClick={() => onDeletePost(post.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-full transition"
            title="Delete post"
          >
            <UilTrash size="20" />
          </button>
        </div>
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
        <span className="text-gray-700">📍 Pincode: {post.pincode}</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-4">
        <button
          className="flex items-center text-gray-600"
          onClick={() => handleVote(post.id, "upvotes")}
        >
          <UilThumbsUp size="30" className="mr-1" />
          <span>{post.upvotes || 0}</span>
        </button>
        <button
          className="flex items-center text-gray-600"
          onClick={() => handleVote(post.id, "downvotes")}
        >
          <UilThumbsDown size="30" className="mr-1" />
          <span>{post.downvotes || 0}</span>
        </button>
        <button
          className="flex items-center text-gray-600"
          onClick={() => handleReport(post.id)}
        >
          <UilSick size="30" className="mr-1" />
          <span>{post.reports || 0}</span>
        </button>
        <button
          className="flex items-center text-gray-600"
          onClick={() => onShare(post.id)}
        >
          <UilShare size="30" className="mr-1" />
          <span>{post.shares || 0}</span>
        </button>
      </div>

      {/* Comments Section */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {/* Show existing comments */}
        <div className="max-h-40 overflow-y-auto border p-2 rounded-md">
          {comments?.map((comment) => (
            <div key={comment.id} className="border-b p-2">
              <p className="text-sm font-semibold">{comment.username}</p>
              <p className="text-sm">{comment.content}</p>
            </div>
          ))}
        </div>

        {/* Add a comment */}
        {currentUser && (
          <div className="mt-2 flex">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow p-2 border rounded-l-md"
            />
            <button
              onClick={handleAddComment}
              className="bg-blue-500 text-white px-4 rounded-r-md"
            >
              Comment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
